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
