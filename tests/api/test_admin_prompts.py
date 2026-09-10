"""
API-testit admin-promptien endpointeille.
"""
import pytest

TOKEN = "test-token-123"
HEADERS = {"X-Admin-Token": TOKEN}


def test_list_prompts_without_token_returns_401(client, monkeypatch):
    """GET /api/admin/prompts ilman tokenia -> 401."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.get("/api/admin/prompts")
    assert response.status_code == 401


def test_list_prompts_with_wrong_token_returns_401(client, monkeypatch):
    """GET /api/admin/prompts vaaralla tokenilla -> 401."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.get("/api/admin/prompts", headers={"X-Admin-Token": "wrong-token"})
    assert response.status_code == 401


def test_list_prompts_with_correct_token_returns_200(client, monkeypatch):
    """GET /api/admin/prompts oikealla tokenilla -> 200."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.get("/api/admin/prompts", headers=HEADERS)
    assert response.status_code == 200


def test_list_prompts_returns_four_prompts(client, monkeypatch):
    """GET /api/admin/prompts -> lista 4 promptia."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.get("/api/admin/prompts", headers=HEADERS)
    data = response.json()
    from src.prompts import PROMPT_NAMES
    assert {p["name"] for p in data} == set(PROMPT_NAMES)


def test_list_prompts_all_default_is_overlay_false(client, monkeypatch):
    """GET /api/admin/prompts oletustilassa -> kaikilla is_overlay=false."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.get("/api/admin/prompts", headers=HEADERS)
    data = response.json()
    assert all(not p["is_overlay"] for p in data)


def test_list_prompts_without_admin_token_env_returns_503(client, monkeypatch):
    """GET /api/admin/prompts ilman ADMIN_TOKEN ymparistömuuttujaa -> 503."""
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    response = client.get("/api/admin/prompts", headers=HEADERS)
    assert response.status_code == 503


def test_update_prompt_with_correct_token_returns_200(client, monkeypatch):
    """PUT /api/admin/prompts/{name} oikealla tokenilla -> 200."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.put(
        "/api/admin/prompts/kartoittaja_system",
        headers=HEADERS,
        json={"content": "Muokattu sisalto"},
    )
    assert response.status_code == 200


def test_update_prompt_sets_is_overlay_true(client, monkeypatch):
    """PUT /api/admin/prompts/{name} -> is_overlay=true."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.put(
        "/api/admin/prompts/kartoittaja_system",
        headers=HEADERS,
        json={"content": "Muokattu sisalto"},
    )
    data = response.json()
    assert data["is_overlay"] is True


def test_update_prompt_content_is_returned(client, monkeypatch):
    """PUT /api/admin/prompts/{name} -> palautettu content vastaa tallennettua."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    new_content = "Uusi promptisisalto testaukseen"
    response = client.put(
        "/api/admin/prompts/kirjoittaja_cv_system",
        headers=HEADERS,
        json={"content": new_content},
    )
    data = response.json()
    assert data["content"] == new_content


def test_update_prompt_get_returns_updated_content(client, monkeypatch):
    """PUT + GET -> GET palauttaa muokatun version."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    new_content = "Päivitetty prompti"
    client.put(
        "/api/admin/prompts/kartoittaja_system",
        headers=HEADERS,
        json={"content": new_content},
    )
    response = client.get("/api/admin/prompts", headers=HEADERS)
    prompts = response.json()
    found = next(p for p in prompts if p["name"] == "kartoittaja_system")
    assert found["content"] == new_content
    assert found["is_overlay"] is True


def test_reset_prompt_returns_200(client, monkeypatch):
    """DELETE /api/admin/prompts/{name} -> 200."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    # Tallenna ensin overlay
    client.put(
        "/api/admin/prompts/kartoittaja_system",
        headers=HEADERS,
        json={"content": "Valiaikaisesti muokattu"},
    )
    response = client.delete("/api/admin/prompts/kartoittaja_system", headers=HEADERS)
    assert response.status_code == 200


def test_reset_prompt_sets_is_overlay_false(client, monkeypatch):
    """DELETE /api/admin/prompts/{name} -> is_overlay=false."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    client.put(
        "/api/admin/prompts/kartoittaja_system",
        headers=HEADERS,
        json={"content": "Jotain"},
    )
    response = client.delete("/api/admin/prompts/kartoittaja_system", headers=HEADERS)
    data = response.json()
    assert data["is_overlay"] is False


def test_reset_prompt_content_reverts_to_default(client, monkeypatch):
    """DELETE /api/admin/prompts/{name} -> content palautuu oletukseen."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    # Hae oletusprompti
    list_resp = client.get("/api/admin/prompts", headers=HEADERS)
    default_content = next(
        p["content"] for p in list_resp.json() if p["name"] == "kartoittaja_system"
    )
    # Muokkaa
    client.put(
        "/api/admin/prompts/kartoittaja_system",
        headers=HEADERS,
        json={"content": "Ylikirjoitettu"},
    )
    # Palauta
    response = client.delete("/api/admin/prompts/kartoittaja_system", headers=HEADERS)
    data = response.json()
    assert data["content"] == default_content


def test_update_unknown_prompt_returns_404(client, monkeypatch):
    """PUT /api/admin/prompts/tuntematon -> 404."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.put(
        "/api/admin/prompts/ei_olemassa",
        headers=HEADERS,
        json={"content": "Jotain"},
    )
    assert response.status_code == 404


def test_delete_unknown_prompt_returns_404(client, monkeypatch):
    """DELETE /api/admin/prompts/tuntematon -> 404."""
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    response = client.delete("/api/admin/prompts/ei_olemassa", headers=HEADERS)
    assert response.status_code == 404
