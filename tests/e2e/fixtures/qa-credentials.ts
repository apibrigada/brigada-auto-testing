/**
 * qa-credentials.ts
 * Helpers for QA permission tests seeded by seed_qa_permissions.py.
 * All 18 test users share the same password (QABrigada2026! by default).
 */

import type { APIRequestContext } from "@playwright/test";

export const QA_PASSWORD = process.env.QA_USER_PASSWORD ?? "QABrigada2026!";
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

const DOMAIN = "@qa.brigada.com";
const pw = QA_PASSWORD;

export const QA_CREDS = {
  // ── CMS custom-role scenarios ──────────────────────────────────────────────
  SCEN01: { email: `qa.full.admin${DOMAIN}`,       password: pw },
  SCEN02: { email: `qa.survey.creator${DOMAIN}`,   password: pw },
  SCEN03: { email: `qa.survey.publisher${DOMAIN}`, password: pw },
  SCEN04: { email: `qa.auditor${DOMAIN}`,           password: pw },
  SCEN05: { email: `qa.brig.mgr${DOMAIN}`,          password: pw },
  SCEN06: { email: `qa.scoped.enc${DOMAIN}`,        password: pw },
  SCEN07: { email: `qa.user.creator${DOMAIN}`,      password: pw },
  SCEN08: { email: `qa.user.editor${DOMAIN}`,       password: pw },
  SCEN09: { email: `qa.no.cms${DOMAIN}`,            password: pw }, // missing access_cms
  SCEN10: { email: `qa.resp.only${DOMAIN}`,         password: pw },
  SCEN11: { email: `qa.zero.perms${DOMAIN}`,        password: pw }, // permissions=[]
  SCEN12: { email: `qa.wildcard.mgr${DOMAIN}`,      password: pw },
  SCEN13: { email: `qa.inactive.role${DOMAIN}`,     password: pw }, // role is_active=false
  SCEN14: { email: `qa.inactive.user${DOMAIN}`,     password: pw }, // user is_active=false
  // ── System-role scenarios ──────────────────────────────────────────────────
  BRIG_ALPHA: { email: `qa.brigadista.alpha${DOMAIN}`, password: pw },
  BRIG_BETA:  { email: `qa.brigadista.beta${DOMAIN}`,  password: pw },
  ENC_ALPHA:  { email: `qa.encargado.alpha${DOMAIN}`,  password: pw },
  ENC_BETA:   { email: `qa.encargado.beta${DOMAIN}`,   password: pw },
} as const;

// ── QA assignment group IDs (created by seeder) ────────────────────────────
export const QA_GROUP_IDS = {
  ALPHA: 16,           // Grupo Alpha (enc.alpha + brig.alpha)
  BETA: 17,            // Grupo Beta  (enc.beta  + brig.beta)
  AISLAMIENTO: 18,     // Aislamiento Compartido (brig.alpha + brig.beta, same survey)
  SCOPED_ENC: 19,      // Encargado Scoped (scoped.enc)
  GESTION: 20,         // Gestión (brig.alpha)
} as const;

// ── API helpers ────────────────────────────────────────────────────────────

export type Cred = { email: string; password: string };

/**
 * Performs a backend login and returns the Bearer token.
 * Returns null when login is rejected (inactive user/role, missing access_cms, etc.)
 */
export async function getApiToken(
  request: APIRequestContext,
  cred: Cred | string,
  passwordOverride?: string,
): Promise<string | null> {
  const email    = typeof cred === "string" ? cred : cred.email;
  const password = passwordOverride ?? (typeof cred === "string" ? QA_PASSWORD : cred.password);

  const resp = await request.post(`${API_BASE_URL}/auth/login`, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  });
  if (!resp.ok()) return null;
  const json = await resp.json() as { access_token?: string };
  return json.access_token ?? null;
}

/** GET to backend API. Returns status code. */
export async function apiGet(
  request: APIRequestContext,
  path: string,
  token: string,
  params?: Record<string, string | number>,
): Promise<{ status: number; json: unknown }> {
  const url    = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }
  const resp = await request.get(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  let json: unknown = null;
  try { json = await resp.json(); } catch { /* non-json body */ }
  return { status: resp.status(), json };
}

/** POST to backend API. Returns status code. */
export async function apiPost(
  request: APIRequestContext,
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const resp = await request.post(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(body),
  });
  let json: unknown = null;
  try { json = await resp.json(); } catch { /* non-json body */ }
  return { status: resp.status(), json };
}

/** PATCH to backend API. Returns status code. */
export async function apiPatch(
  request: APIRequestContext,
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const resp = await request.patch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(body),
  });
  let json: unknown = null;
  try { json = await resp.json(); } catch { /* non-json body */ }
  return { status: resp.status(), json };
}

/** DELETE to backend API. Returns status code. */
export async function apiDelete(
  request: APIRequestContext,
  path: string,
  token: string,
): Promise<number> {
  const resp = await request.delete(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.status();
}
