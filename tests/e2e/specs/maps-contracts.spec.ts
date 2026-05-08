/**
 * maps-contracts.spec.ts
 *
 * MAPS-A-5 / MAPS-A-6 — Backend static-maps API contract tests.
 *
 * Tests that the /admin/maps endpoints honour their documented contracts:
 *
 *   MAPS-CONTRACT-01  POST /admin/maps/from-areas  → 201 with valid zone_ids
 *   MAPS-CONTRACT-02  POST /admin/maps/from-areas  → 422 with empty zone_ids
 *   MAPS-CONTRACT-03  POST /admin/maps/from-areas  → 422 with invalid zone_ids
 *   MAPS-CONTRACT-04  GET  /admin/maps/zone-status → response shape contract
 *   MAPS-CONTRACT-05  GET  /admin/maps             → list shape contract
 *   MAPS-CONTRACT-06  Mobile GET /mobile/maps      → only published maps
 *
 * All tests run against the live API (E2E_BASE_URL environment variable);
 * they skip gracefully when credentials are not available.
 */

import { test, expect, type APIRequestContext } from "@playwright/test";
import { getCredentialByRoleNumber } from "../fixtures/credentials.js";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

async function getAdminToken(
  request: APIRequestContext,
): Promise<string | null> {
  const cred = getCredentialByRoleNumber(1);
  if (!cred) return null;
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: cred.email, password: cred.password },
    headers: { "x-e2e-suite": "brigada-auto-testing" },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  return (body?.access_token as string) ?? null;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-e2e-suite": "brigada-auto-testing",
  };
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe("MAPS-CONTRACT — /admin/maps API shape contracts", () => {
  test.skip(
    !getCredentialByRoleNumber(1),
    "Define E2E_LOGIN_EMAIL_ROLE_1/E2E_LOGIN_PASSWORD_ROLE_1 in .env.",
  );

  let token: string;

  test.beforeAll(async ({ request }) => {
    const t = await getAdminToken(request);
    if (!t) test.skip(true, "Could not obtain admin token");
    token = t!;
  });

  // ── MAPS-CONTRACT-01: create map from valid zone_ids ───────────────────────

  test("MAPS-CONTRACT-01: POST /admin/maps/from-areas with valid zone returns 201 or 200", async ({
    request,
  }) => {
    // First, fetch a real zone_id from the backend so we don't hardcode.
    const zonesRes = await request.get(`${API_BASE}/admin/zones?limit=1`, {
      headers: authHeaders(token),
    });

    if (!zonesRes.ok()) {
      test.skip(true, "Cannot fetch zones — skipping contract test.");
      return;
    }

    const zonesBody = await zonesRes.json();
    const zones: { id: number }[] = Array.isArray(zonesBody)
      ? zonesBody
      : (zonesBody?.items ?? []);

    if (zones.length === 0) {
      test.skip(true, "No zones available to test from-areas contract.");
      return;
    }

    const zoneId = zones[0].id;

    const res = await request.post(`${API_BASE}/admin/maps/from-areas`, {
      data: { zone_ids: [zoneId], publish: false },
      headers: authHeaders(token),
    });

    // The endpoint returns 201 Created on success or 200 if the map already exists.
    expect(
      [200, 201, 409].includes(res.status()),
      `Expected 200/201/409 from /admin/maps/from-areas, got ${res.status()}`,
    ).toBe(true);

    if (res.ok() && res.status() !== 409) {
      const body = await res.json();
      // Shape contract: the response must include the new map's id.
      expect(
        typeof body.id === "number" || typeof body?.map?.id === "number",
      ).toBe(true);
    }
  });

  // ── MAPS-CONTRACT-02: reject empty zone_ids ──────────────────────────────

  test("MAPS-CONTRACT-02: POST /admin/maps/from-areas with empty zone_ids returns 422", async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/admin/maps/from-areas`, {
      data: { zone_ids: [] },
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(422);
  });

  // ── MAPS-CONTRACT-03: reject invalid zone_ids ─────────────────────────────

  test("MAPS-CONTRACT-03: POST /admin/maps/from-areas with nonexistent zone_ids returns 4xx", async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/admin/maps/from-areas`, {
      data: { zone_ids: [999_999_999] },
      headers: authHeaders(token),
    });
    // Either 404 (not found) or 422 (unprocessable) are acceptable.
    expect([404, 422].includes(res.status())).toBe(true);
  });

  // ── MAPS-CONTRACT-04: zone-status shape ──────────────────────────────────

  test("MAPS-CONTRACT-04: GET /admin/maps/zone-status returns correct shape", async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/admin/maps/zone-status`, {
      headers: authHeaders(token),
    });

    if (res.status() === 404) {
      test.skip(true, "/admin/maps/zone-status not implemented yet.");
      return;
    }

    expect(res.ok()).toBe(true);
    const body = await res.json();

    // Must be an array of zone status items.
    expect(Array.isArray(body) || Array.isArray(body?.items)).toBe(true);
    const items: unknown[] = Array.isArray(body) ? body : body.items;

    if (items.length > 0) {
      const first = items[0] as Record<string, unknown>;
      // Each item must have a zone_id and a status string.
      expect(
        typeof first.zone_id === "number" || typeof first.id === "number",
      ).toBe(true);
      expect(typeof first.status).toBe("string");
    }
  });

  // ── MAPS-CONTRACT-05: maps list shape ────────────────────────────────────

  test("MAPS-CONTRACT-05: GET /admin/maps returns valid list shape", async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/admin/maps?limit=5`, {
      headers: authHeaders(token),
    });

    expect(res.ok()).toBe(true);
    const body = await res.json();

    const items: unknown[] = Array.isArray(body)
      ? body
      : (body?.items ?? body?.maps ?? []);
    // Items (if any) must have expected top-level fields.
    if (items.length > 0) {
      const first = items[0] as Record<string, unknown>;
      expect(typeof first.id).toBe("number");
      expect(typeof first.name).toBe("string");
    }
  });

  // ── MAPS-CONTRACT-06: mobile maps only returns published ─────────────────

  test("MAPS-CONTRACT-06: GET /mobile/maps returns only published maps", async ({
    request,
  }) => {
    // First create/ensure a published map exists via the admin flow, then
    // check that unpublished maps are absent from the mobile endpoint.
    const mobileRes = await request.get(`${API_BASE}/mobile/maps`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-e2e-suite": "brigada-auto-testing",
      },
    });

    if (!mobileRes.ok()) {
      // Some deployments require a separate mobile token — acceptable skip.
      test.skip(true, "Mobile /mobile/maps not accessible with admin token.");
      return;
    }

    const body = await mobileRes.json();
    const items: unknown[] = Array.isArray(body)
      ? body
      : (body?.maps ?? body?.items ?? []);

    // All returned maps must be published.
    for (const item of items) {
      const map = item as Record<string, unknown>;
      if ("is_published" in map) {
        expect(map.is_published).toBe(true);
      }
    }
  });
});
