import { runExpiryScan } from "../src/modules/notifications/expiryScanner";

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

  res = await fetch(`${BASE}/auth/sessions`, {
    headers: { ...authHeaders(ownerAccessToken), Cookie: `refreshToken=${ownerRefreshCookie}` },
  });
  const sessionsAfterLogin = await res.json();
  if (res.status !== 200 || sessionsAfterLogin.length !== 1 || !sessionsAfterLogin[0].current) {
    fail("list sessions right after login (expect exactly 1, marked current)", sessionsAfterLogin);
  }
  ok("list sessions shows exactly 1 active session, marked current, right after login");

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

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "CI token" }),
  });
  const createdToken = await res.json();
  if (res.status !== 201 || !createdToken.token?.startsWith("envsync_")) {
    fail("create API token", createdToken);
  }
  ok("create API token (raw token starts with envsync_)");
  const rawApiToken: string = createdToken.token;
  const apiTokenId: string = createdToken.id;

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, {
    headers: authHeaders(ownerAccessToken),
  });
  const tokenList = await res.json();
  const listedToken = (tokenList as Array<{ id: string }>).find((t) => t.id === apiTokenId);
  if (res.status !== 200 || !listedToken || "token" in listedToken) {
    fail("list API tokens (raw token must never be listed)", tokenList);
  }
  ok("list API tokens (metadata only, raw token never re-exposed)");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(rawApiToken),
  });
  if (res.status !== 200) fail("API token authenticates like a normal bearer token", await res.text());
  ok("API token authenticates on an existing RBAC-gated route (200)");

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, {
    method: "POST",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ name: "should fail" }),
  });
  if (res.status !== 403) fail("viewer create API token should be 403", await res.text());
  ok("viewer cannot create an API token (403, ADMIN+ required)");

  res = await fetch(`${BASE}/secrets/${secret.id}/rotate`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({}),
  });
  const rotated = await res.json();
  if (
    res.status !== 200 ||
    !rotated.value ||
    rotated.value === "postgres://user:pass@localhost/db" ||
    rotated.currentVersion !== 5
  ) {
    fail("rotate secret", rotated);
  }
  ok("rotate secret (new random value, currentVersion becomes 5)");

  res = await fetch(`${BASE}/secrets/${secret.id}/reveal`, { headers: authHeaders(ownerAccessToken) });
  const revealedAfterRotate = await res.json();
  if (res.status !== 200 || revealedAfterRotate.value !== rotated.value) {
    fail("live value after rotate should match the rotate response", revealedAfterRotate);
  }
  ok("live secret value after rotate matches the rotate response (round-trip)");

  res = await fetch(`${BASE}/secrets/${secret.id}/versions`, {
    headers: authHeaders(ownerAccessToken),
  });
  versions = await res.json();
  if (res.status !== 200 || versions[0].changeType !== "ROTATE") {
    fail("versions list after rotate should have newest entry ROTATE", versions);
  }
  ok("versions list after rotate has newest entry ROTATE");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}/rotate`, {
    method: "POST",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({}),
  });
  if (res.status !== 403) fail("viewer rotate prod secret should be 403", await res.text());
  ok("viewer cannot rotate prod secret (403)");

  res = await fetch(`${BASE}/orgs/${orgId}/tokens/${apiTokenId}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  const revokedToken = await res.json();
  if (res.status !== 200 || !revokedToken.revokedAt) fail("revoke API token", revokedToken);
  ok("revoke API token (200, revokedAt set)");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(rawApiToken),
  });
  if (res.status !== 401) fail("revoked API token should be rejected", await res.text());
  ok("revoked API token is rejected (401)");

  res = await fetch(`${BASE}/orgs/${orgId}/tokens/${apiTokenId}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 409) fail("revoking an already-revoked token should be 409", await res.text());
  ok("revoking an already-revoked token is rejected (409)");

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
    "secret.rotate",
    "member.add",
    "apitoken.create",
    "apitoken.revoke",
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

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password }),
  });
  const secondDeviceLogin = await res.json();
  if (res.status !== 200) fail("owner second-device login", secondDeviceLogin);
  ok("owner second-device login");
  const secondRefreshCookie = extractCookie(res.headers.get("set-cookie"), "refreshToken");
  if (!secondRefreshCookie) fail("capture second-device refresh cookie");

  res = await fetch(`${BASE}/auth/sessions`, {
    headers: { ...authHeaders(ownerAccessToken), Cookie: `refreshToken=${ownerRefreshCookie}` },
  });
  const twoSessions = await res.json();
  if (
    res.status !== 200 ||
    twoSessions.length !== 2 ||
    twoSessions.filter((s: { current: boolean }) => s.current).length !== 1
  ) {
    fail("list sessions shows 2 active, exactly 1 current", twoSessions);
  }
  ok("list sessions shows 2 active sessions, exactly 1 marked current matching the request cookie");

  const nonCurrentSession = twoSessions.find((s: { current: boolean }) => !s.current);

  res = await fetch(`${BASE}/auth/sessions/${nonCurrentSession.id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("revoke non-current session", await res.text());
  ok("revoke non-current session (204)");

  res = await fetch(`${BASE}/auth/sessions`, {
    headers: { ...authHeaders(ownerAccessToken), Cookie: `refreshToken=${ownerRefreshCookie}` },
  });
  const afterRevoke = await res.json();
  if (res.status !== 200 || afterRevoke.length !== 1 || !afterRevoke[0].current) {
    fail("after revoke, only current session remains listed", afterRevoke);
  }
  ok("revoked session disappears from active list; current session unaffected");

  res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refreshToken=${secondRefreshCookie}` },
  });
  if (res.status !== 401) fail("refresh using a revoked session's cookie should be rejected", await res.text());
  ok("refresh token bound to a revoked session is rejected (401)");

  res = await fetch(`${BASE}/auth/sessions/${nonCurrentSession.id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 409) fail("revoking an already-revoked session should be 409", await res.text());
  ok("revoking an already-revoked session is rejected (409)");

  res = await fetch(`${BASE}/auth/sessions/nonexistent-id`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 404) fail("revoking a nonexistent session id should be 404", await res.text());
  ok("revoking a nonexistent session id is rejected (404)");

  res = await fetch(`${BASE}/auth/sessions/${nonCurrentSession.id}`, {
    method: "DELETE",
    headers: authHeaders(viewerAccessToken),
  });
  if (res.status !== 404) fail("a different user revoking someone else's session should be 404", await res.text());
  ok("a different user cannot revoke someone else's session (404, ownership enforced, no existence leak)");

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

  const pastExpiry = new Date(Date.now() - 86400000).toISOString();
  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ key: "EXPIRED_KEY", value: "v1", expiresAt: pastExpiry }),
  });
  const expiredSecret = await res.json();
  if (res.status !== 201 || expiredSecret.expiresAt !== pastExpiry) {
    fail("create secret with past expiresAt", expiredSecret);
  }
  ok("create secret with past expiresAt returns it correctly");

  const futureExpiry = new Date(Date.now() + 3 * 86400000).toISOString();
  res = await fetch(`${BASE}/secrets/${secret.id}/expiry`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ expiresAt: futureExpiry }),
  });
  let expirySet = await res.json();
  if (res.status !== 200 || expirySet.expiresAt !== futureExpiry) fail("set secret expiry", expirySet);
  ok("set secret expiry (3 days out)");

  res = await fetch(`${BASE}/secrets/${secret.id}/expiry`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ expiresAt: null }),
  });
  expirySet = await res.json();
  if (res.status !== 200 || expirySet.expiresAt !== null) fail("clear secret expiry", expirySet);
  ok("clear secret expiry (set to null)");

  res = await fetch(`${BASE}/secrets/${secret.id}/expiry`, {
    method: "PATCH",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ expiresAt: futureExpiry }),
  });
  if (res.status !== 403) fail("viewer set expiry on dev secret should be 403 (no write access on DEVELOPMENT)", await res.text());
  ok("viewer cannot set expiry on dev secret (403, write access required)");

  res = await fetch(`${BASE}/secrets/${secret.id}/expiry`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ expiresAt: futureExpiry }),
  });
  expirySet = await res.json();
  if (res.status !== 200) fail("re-set secret expiry before scanner test", expirySet);

  const scanResult1 = await runExpiryScan();
  if (scanResult1.notificationsCreated < 1) fail("expiry scan should create at least one notification", scanResult1);
  ok("expiry scan creates notifications for expiring/expired secrets");

  res = await fetch(`${BASE}/notifications`, { headers: authHeaders(ownerAccessToken) });
  const ownerNotifs = await res.json();
  if (res.status !== 200 || !ownerNotifs.some((n: { targetId: string }) => n.targetId === secret.id)) {
    fail("owner should see a notification for the expiring secret", ownerNotifs);
  }
  ok("owner (ADMIN+) receives notification for expiring secret");

  res = await fetch(`${BASE}/notifications`, { headers: authHeaders(viewerAccessToken) });
  const viewerNotifs = await res.json();
  if (res.status !== 200 || viewerNotifs.some((n: { targetId: string }) => n.targetId === secret.id)) {
    fail("viewer should NOT receive a notification (not ADMIN+)", viewerNotifs);
  }
  ok("viewer does not receive expiry notification (recipient scoping to ADMIN+ confirmed)");

  const scanResult2 = await runExpiryScan();
  res = await fetch(`${BASE}/notifications`, { headers: authHeaders(ownerAccessToken) });
  const ownerNotifsAfterRescan = await res.json();
  const matchingCount = ownerNotifsAfterRescan.filter((n: { targetId: string }) => n.targetId === secret.id).length;
  if (matchingCount !== 1) fail("scanning twice should not duplicate the notification", { matchingCount, scanResult2 });
  ok("running the scanner twice does not create a duplicate notification (dedup confirmed)");

  const targetNotif = ownerNotifsAfterRescan.find((n: { targetId: string }) => n.targetId === secret.id);
  res = await fetch(`${BASE}/notifications/${targetNotif.id}/read`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
  });
  const markedRead = await res.json();
  if (res.status !== 200 || markedRead.read !== true) fail("mark notification read", markedRead);
  ok("mark notification read flips the read flag");

  const hammerEmail = `hammer-${rand}@example.com`;
  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hammer", email: hammerEmail, password }),
  });
  if (res.status !== 201) fail("signup hammer test account", await res.text());

  let loginRateLimited = false;
  for (let i = 0; i < 20; i++) {
    res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: hammerEmail, password: "wrong-password" }),
    });
    if (res.status === 429) {
      const body = await res.json();
      if (body?.error?.code !== "TOO_MANY_REQUESTS") fail("429 body shape", body);
      loginRateLimited = true;
      break;
    }
    if (res.status !== 401) fail(`unexpected status during login hammer (attempt ${i})`, await res.text());
  }
  if (!loginRateLimited) fail("expected login rate limiter to trigger 429 within 20 failed attempts");
  ok("repeated failed logins against one account trigger 429 (brute-force protection)");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ownerEmail, password }),
  });
  if (res.status !== 200) {
    fail("a different account on the same IP should not be blocked by another account's exhausted limit", await res.text());
  }
  ok("a different account sharing the same IP is unaffected (email+IP keying confirmed, no NAT lockout)");

  let signupRateLimited = false;
  for (let i = 0; i < 20; i++) {
    res = await fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hammer Signup",
        email: `hammer-signup-${rand}-${i}@example.com`,
        password,
      }),
    });
    if (res.status === 429) {
      const body = await res.json();
      if (body?.error?.code !== "TOO_MANY_REQUESTS") fail("429 body shape (signup)", body);
      signupRateLimited = true;
      break;
    }
    if (res.status !== 201) fail(`unexpected status during signup hammer (attempt ${i})`, await res.text());
  }
  if (!signupRateLimited) fail("expected signup rate limiter to trigger 429 within 20 signups from one IP");
  ok("repeated signups from one IP trigger 429 (signup abuse protection)");

  console.log(`\nAll smoke tests passed. orgId=${orgId} projectId=${projectId}`);
}

main().catch((err) => {
  console.error("\nSmoke test run failed.", failures ? `${failures} failure(s).` : "");
  console.error(err);
  process.exit(1);
});
