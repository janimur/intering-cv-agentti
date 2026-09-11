"""
API-testit muille endpointeille: /api/gdpr ja /api/metrics.
"""
import pytest


def test_gdpr_returns_200(client):
    """GET /api/gdpr → 200."""
    response = client.get("/api/gdpr")
    assert response.status_code == 200


def test_gdpr_response_has_content_field(client):
    """GET /api/gdpr → sisältää 'content'-kentän."""
    response = client.get("/api/gdpr")
    data = response.json()
    assert "content" in data


def test_gdpr_content_is_non_empty_string(client):
    """GET /api/gdpr → content on ei-tyhjä merkkijono."""
    response = client.get("/api/gdpr")
    content = response.json()["content"]
    assert isinstance(content, str)
    assert len(content) > 0


def test_metrics_returns_200(client):
    """GET /api/metrics → 200."""
    response = client.get("/api/metrics")
    assert response.status_code == 200


def test_metrics_has_required_fields(client):
    """GET /api/metrics → kenttinä total_runs, runs_by_type, avg_duration_ms, error_count."""
    response = client.get("/api/metrics")
    data = response.json()
    assert "total_runs" in data
    assert "runs_by_type" in data
    assert "avg_duration_ms" in data
    assert "error_count" in data


def test_metrics_initial_values(client):
    """GET /api/metrics tuoreella instanssilla → total_runs == 0."""
    response = client.get("/api/metrics")
    data = response.json()
    assert data["total_runs"] == 0
    assert data["error_count"] == 0


def test_health_after_startup(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
