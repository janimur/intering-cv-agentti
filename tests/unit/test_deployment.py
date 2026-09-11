"""Exercise the deployment protocol and rollback with isolated OS/Docker adapters."""
import json
import os
from pathlib import Path
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[2]
BACKEND = "ghcr.io/janimur/intering-cv-agentti-backend@sha256:" + "a" * 64
WEB = "ghcr.io/janimur/intering-cv-agentti-web@sha256:" + "b" * 64
OLD_BACKEND = BACKEND.replace("a" * 64, "c" * 64)
OLD_WEB = WEB.replace("b" * 64, "d" * 64)


@pytest.fixture
def deployment(tmp_path):
    app = tmp_path / "app"
    app.mkdir()
    (app / "compose.production.yml").write_text("name: intering\n")
    (app / ".env").write_text("ANTHROPIC_API_KEY=not-a-real-key\nADMIN_TOKEN=not-real\n")
    (app / ".env").chmod(0o600)
    commands = tmp_path / "bin"
    commands.mkdir()
    log = tmp_path / "calls.jsonl"

    def executable(name, text):
        path = commands / name
        path.write_text(text)
        path.chmod(0o755)
        return path

    # Root installation/ownership and flock are OS concerns. No tests touch /opt or Docker.
    executable("stat", '#!/usr/bin/env python3\nimport os,sys\np=sys.argv[-1]\nprint(0 if sys.argv[2]=="%u" else format(os.stat(p).st_mode & 0o777,"o"))\n')
    executable("install", '#!/bin/sh\nfor arg do last="$arg"; done\nmkdir -p "$last"\nchmod 700 "$last"\n')
    executable("flock", '#!/bin/sh\nexit 0\n')
    executable("curl", f'#!/bin/sh\ntest ! -f "{tmp_path}/fail-health"\n')
    docker = executable("docker", f'''#!/usr/bin/env python3
import json,pathlib,sys
args=sys.argv[1:]
release=args[args.index("--file")-1]
with open({str(log)!r},"a") as out:
    out.write(json.dumps({{"args":args,"release":pathlib.Path(release).read_text()}})+"\\n")
if pathlib.Path({str(tmp_path / "fail-pull")!r}).exists() and args[-1]=="pull":
    sys.exit(1)
if pathlib.Path({str(tmp_path / "fail-up")!r}).exists() and "up" in args and "candidate." in release:
    sys.exit(1)
''')
    script = (ROOT / "deploy/intering-deploy").read_text()
    script = script.replace('$EUID == 0', '1 == 1')
    script = script.replace('export PATH=/usr/sbin:/usr/bin:/sbin:/bin', f'export PATH="{commands}:{os.environ["PATH"]}"')
    script = script.replace('readonly app_dir=/opt/intering', f'readonly app_dir="{app}"')
    script = script.replace('/usr/bin/docker --host', f'"{docker}" --host')
    target = tmp_path / "deploy"
    target.write_text(script)

    def run(text=BACKEND + "\n" + WEB + "\n"):
        result = subprocess.run(["bash", str(target)], input=text, text=True, capture_output=True, timeout=10)
        calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
        return result, calls

    return tmp_path, app, run


@pytest.mark.parametrize("payload", [
    BACKEND + "\n", BACKEND + "\n" + WEB + "\nextra\n",
    BACKEND.replace("@sha256:" + "a" * 64, ":latest") + "\n" + WEB + "\n",
    BACKEND.replace("janimur", "attacker") + "\n" + WEB + "\n",
    WEB + "\n" + BACKEND + "\n",
    BACKEND + "\n" + WEB + "\n$(touch /tmp/never-created)\n",
])
def test_rejects_invalid_protocol_before_docker(deployment, payload):
    _, _, run = deployment
    result, calls = run(payload)
    assert result.returncode != 0
    assert calls == []


def test_promotes_healthy_image_pair_and_keeps_previous(deployment):
    _, app, run = deployment
    releases = app / "releases"
    releases.mkdir()
    old = f"BACKEND_IMAGE={OLD_BACKEND}\nWEB_IMAGE={OLD_WEB}\n"
    (releases / "current.env").write_text(old)
    result, calls = run()
    assert result.returncode == 0, result.stderr
    assert len(calls) == 2
    assert "--force-recreate" in calls[1]["args"]
    assert (releases / "previous.env").read_text() == old
    assert (releases / "current.env").read_text() == f"BACKEND_IMAGE={BACKEND}\nWEB_IMAGE={WEB}\n"
    assert not list(releases.glob("candidate.*"))


def test_failed_pull_does_not_change_running_release(deployment):
    tmp, app, run = deployment
    (tmp / "fail-pull").touch()
    result, calls = run()
    assert result.returncode != 0
    assert len(calls) == 1 and calls[0]["args"][-1] == "pull"
    assert not (app / "releases/current.env").exists()


def test_failed_upgrade_restores_current_pair(deployment):
    tmp, app, run = deployment
    releases = app / "releases"
    releases.mkdir()
    old = f"BACKEND_IMAGE={OLD_BACKEND}\nWEB_IMAGE={OLD_WEB}\n"
    (releases / "current.env").write_text(old)
    (tmp / "fail-up").touch()
    result, calls = run()
    assert result.returncode != 0
    assert calls[-1]["release"] == old and "up" in calls[-1]["args"]
    assert all("--force-recreate" in call["args"] for call in calls if "up" in call["args"])
    assert (releases / "current.env").read_text() == old
    assert "Rollback completed" in result.stderr


def test_first_deploy_failure_removes_containers_without_volumes(deployment):
    tmp, app, run = deployment
    (tmp / "fail-up").touch()
    result, calls = run()
    assert result.returncode != 0
    assert "down" in calls[-1]["args"]
    assert "--volumes" not in calls[-1]["args"] and "-v" not in calls[-1]["args"]
    assert not (app / "releases/current.env").exists()


def test_failed_health_rolls_back_and_reports_failed_rollback(deployment):
    tmp, app, run = deployment
    releases = app / "releases"
    releases.mkdir()
    (releases / "current.env").write_text(f"BACKEND_IMAGE={OLD_BACKEND}\nWEB_IMAGE={OLD_WEB}\n")
    (tmp / "fail-health").touch()
    result, calls = run()
    assert result.returncode != 0
    assert "up" in calls[-1]["args"]
    assert "ROLLBACK FAILED" in result.stderr
