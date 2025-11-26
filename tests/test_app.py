import copy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def preserve_activities():
    """Preserve and restore the in-memory activities dict around each test."""
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_participant_visible(client):
    activity = "Chess Club"
    email = "tester@example.com"

    # ensure not present
    assert email not in activities[activity]["participants"]

    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json().get("message", "")

    # now fetch activities and confirm participant is present
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert email in data[activity]["participants"]


def test_duplicate_signup_returns_400(client):
    activity = "Chess Club"
    email = "dup@example.com"

    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 200

    # duplicate
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 400


def test_unregister_removes_participant(client):
    activity = "Chess Club"
    email = "remover@example.com"

    # sign up first
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 200

    # then unregister
    resp = client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json().get("message", "")

    # verify removed
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert email not in data[activity]["participants"]


def test_unregister_not_registered_returns_400(client):
    activity = "Chess Club"
    email = "notfound@example.com"

    # ensure not registered
    assert email not in activities[activity]["participants"]

    resp = client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")
    assert resp.status_code == 400
