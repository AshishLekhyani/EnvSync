const BASE = "http://localhost:4000/api";

function extractCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

let failures = 0;

function ok(label: string) {
  console.log(`PASS  ${label}`);
}

function fail(label: string, detail?: unknown): never {
  failures += 1;
  console.error(`FAIL  ${label}`, detail ?? "");
  throw new Error(`smoke test failed: ${label}`);
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const ownerEmail = `owner-${rand}@example.com`;
  const viewerEmail = `viewer-${rand}@example.com`;
  const password = "supersecret123";

  let res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Owner User", email: ownerEmail, password }),
  });
  if (res.status !== 201) fail("signup owner", await res.text());
  ok("signup owner");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password }),
  });
  const loginBody = await res.json();
  if (res.status !== 200) fail("login owner", loginBody);
  ok("login owner");
  const ownerAccessToken: string = loginBody.accessToken;
  const ownerRefreshCookie = extractCookie(res.headers.get("set-cookie"), "refreshToken");
  if (!ownerRefreshCookie) fail("capture refresh cookie");

  res = await fetch(`${BASE}/auth/me`, { headers: authHeaders(ownerAccessToken) });
  const me = await res.json();
  if (res.status !== 200 || me.email !== ownerEmail) fail("get me", me);
  ok("get me");

  const orgSlug = `acme-${rand}`;
  res = await fetch(`${BASE}/orgs`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Acme Inc", slug: orgSlug }),
  });
  const org = await res.json();
  if (res.status !== 201) fail("create org", org);
  ok("create org");
  const orgId = org.id;

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Core API", slug: "core-api" }),
  });
  const project = await res.json();
  if (res.status !== 201) fail("create project", project);
  ok("create project");
  const projectId = project.id;

  res = await fetch(`${BASE}/projects/${projectId}/environments`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ type: "DEVELOPMENT" }),
  });
  const devEnv = await res.json();
  if (res.status !== 201) fail("create dev environment", devEnv);
  ok("create dev environment");

  res = await fetch(`${BASE}/projects/${projectId}/environments`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ type: "PRODUCTION" }),
  });
  const prodEnv = await res.json();
  if (res.status !== 201) fail("create prod environment", prodEnv);
  ok("create prod environment");

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ key: "DATABASE_URL", value: "postgres://user:pass@localhost/db" }),
  });
  const secret = await res.json();
  if (res.status !== 201) fail("create secret", secret);
  if ("value" in secret || "ciphertext" in secret) fail("create secret leaked raw data", secret);
  ok("create secret (metadata only response)");

  res = await fetch(`${BASE}/secrets/${secret.id}/reveal`, { headers: authHeaders(ownerAccessToken) });
  const revealed = await res.json();
  if (res.status !== 200 || revealed.value !== "postgres://user:pass@localhost/db") {
    fail("reveal secret round-trip", revealed);
  }
  ok("reveal secret round-trip");

  res = await fetch(`${BASE}/secrets/${secret.id}`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ value: "postgres://user:pass@localhost/db-v2" }),
  });
  let updatedSecret = await res.json();
  if (res.status !== 200 || updatedSecret.currentVersion !== 2) {
    fail("update secret to version 2", updatedSecret);
  }
  ok("update secret to version 2");

  res = await fetch(`${BASE}/secrets/${secret.id}`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ value: "postgres://user:pass@localhost/db-v3" }),
  });
  updatedSecret = await res.json();
  if (res.status !== 200 || updatedSecret.currentVersion !== 3) {
    fail("update secret to version 3", updatedSecret);
  }
  ok("update secret to version 3");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions`, {
    headers: authHeaders(ownerAccessToken),
  });
  let versions = await res.json();
  if (
    res.status !== 200 ||
    versions.length !== 3 ||
    versions[0].version !== 3 ||
    versions[1].version !== 2 ||
    versions[2].version !== 1 ||
    versions[2].changeType !== "CREATE" ||
    versions[1].changeType !== "UPDATE"
  ) {
    fail("list secret versions (newest first)", versions);
  }
  ok("list secret versions (newest first, CREATE/UPDATE change types correct)");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions/1/reveal`, {
    headers: authHeaders(ownerAccessToken),
  });
  const revealedV1 = await res.json();
  if (res.status !== 200 || revealedV1.value !== "postgres://user:pass@localhost/db") {
    fail("reveal historical version 1 (should be original value, not current)", revealedV1);
  }
  ok("reveal historical version 1 returns original value, not current");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions/1/restore`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
  });
  const restored = await res.json();
  if (res.status !== 200 || restored.currentVersion !== 4) {
    fail("restore version 1", restored);
  }
  ok("restore version 1 (currentVersion becomes 4)");

  res = await fetch(`${BASE}/secrets/${secret.id}/reveal`, { headers: authHeaders(ownerAccessToken) });
  const revealedAfterRestore = await res.json();
  if (res.status !== 200 || revealedAfterRestore.value !== "postgres://user:pass@localhost/db") {
    fail("live value after restore should match original", revealedAfterRestore);
  }
  ok("live secret value after restore matches original (restore actually took effect)");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions`, {
    headers: authHeaders(ownerAccessToken),
  });
  versions = await res.json();
  if (res.status !== 200 || versions.length !== 4 || versions[0].changeType !== "RESTORE") {
    fail("versions list after restore should have 4 entries, top one RESTORE", versions);
  }
  ok("versions list after restore has 4 entries, newest is RESTORE");

  res = await fetch(`${BASE}/environments/${prodEnv.id}/secrets`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ key: "STRIPE_SECRET", value: "sk_live_abc123" }),
  });
  const prodSecret = await res.json();
  if (res.status !== 201) fail("create prod secret", prodSecret);
  ok("create prod secret");

  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Viewer User", email: viewerEmail, password }),
  });
  if (res.status !== 201) fail("signup viewer", await res.text());
  ok("signup viewer");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: viewerEmail, password }),
  });
  const viewerLogin = await res.json();
  if (res.status !== 200) fail("login viewer", viewerLogin);
  ok("login viewer");
  const viewerAccessToken: string = viewerLogin.accessToken;

  res = await fetch(`${BASE}/orgs/${orgId}/members`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: viewerEmail, role: "VIEWER" }),
  });
  const membership = await res.json();
  if (res.status !== 201) fail("add viewer member", membership);
  ok("add viewer member");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}`, {
    method: "PATCH",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ value: "hacked" }),
  });
  if (res.status !== 403) fail("viewer write prod secret should be 403", await res.text());
  ok("viewer cannot write prod secret (403)");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}/reveal`, {
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 403) fail("viewer reveal prod secret should be 403", await res.text());
  ok("viewer cannot reveal prod secret (403)");

  res = await fetch(`${BASE}/secrets/${secret.id}/reveal`, {
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 200) fail("viewer reveal dev secret should be 200", await res.text());
  ok("viewer can reveal dev secret (200)");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions`, {
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 200) fail("viewer list dev secret versions should be 200", await res.text());
  ok("viewer can list dev secret versions (200)");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}/versions`, {
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 403) fail("viewer list prod secret versions should be 403", await res.text());
  ok("viewer cannot list prod secret versions (403)");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions/1/restore`, {
    method: "POST",
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 403) fail("viewer restore should be 403", await res.text());
  ok("viewer cannot restore a version (403, write access required)");

  res = await fetch(`${BASE}/orgs/${orgId}/audit-logs?limit=50`, {
    headers: authHeaders(ownerAccessToken),
  });
  const auditLogs = await res.json();
  if (res.status !== 200) fail("owner list audit logs", auditLogs);
  const actions = new Set((auditLogs as Array<{ action: string }>).map((l) => l.action));
  const expectedActions = [
    "secret.create",
    "secret.update",
    "secret.version_reveal",
    "secret.restore",
    "member.add",
  ];
  const missing = expectedActions.filter((a) => !actions.has(a));
  if (missing.length > 0) fail("audit logs missing expected actions", { missing, actions: [...actions] });
  ok("audit logs contain all expected action types");

  res = await fetch(`${BASE}/orgs/${orgId}/audit-logs`, {
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 403) fail("viewer list audit logs should be 403", await res.text());
  ok("viewer cannot read audit logs (403, DEVELOPER+ required)");

  res = await fetch(`${BASE}/orgs/${orgId}/audit-logs?projectId=${projectId}`, {
    headers: authHeaders(ownerAccessToken),
  });
  const filteredLogs = await res.json();
  if (
    res.status !== 200 ||
    !Array.isArray(filteredLogs) ||
    filteredLogs.some((l: { projectId: string | null }) => l.projectId !== projectId)
  ) {
    fail("audit logs filtered by projectId", filteredLogs);
  }
  ok("audit logs projectId filter returns only matching rows");

  res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refreshToken=${ownerRefreshCookie}` },
  });
  const refreshed = await res.json();
  if (res.status !== 200) fail("refresh token", refreshed);
  ok("refresh token");
  const rotatedRefreshCookie = extractCookie(res.headers.get("set-cookie"), "refreshToken");
  if (!rotatedRefreshCookie) fail("capture rotated refresh cookie");

  res = await fetch(`${BASE}/auth/logout`, {
    method: "POST",
    headers: { Cookie: `refreshToken=${rotatedRefreshCookie}` },
  });
  if (res.status !== 204) fail("logout", await res.text());
  ok("logout");

  res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refreshToken=${rotatedRefreshCookie}` },
  });
  if (res.status !== 401) fail("refresh after logout should be 401", await res.text());
  ok("refresh after logout rejected (401)");

  console.log(`\nAll smoke tests passed. orgId=${orgId} projectId=${projectId}`);
}

main().catch((err) => {
  console.error("\nSmoke test run failed.", failures ? `${failures} failure(s).` : "");
  console.error(err);
  process.exit(1);
});
