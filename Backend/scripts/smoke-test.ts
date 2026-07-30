import { runExpiryScan } from "../src/modules/notifications/expiryScanner";
import { findOrCreateGithubUser } from "../src/modules/auth/github.service";
import { findOrCreateGoogleUser } from "../src/modules/auth/google.service";
import { changePassword as changePasswordDirect } from "../src/modules/auth/auth.service";
import { BadRequestError, ConflictError } from "../src/common/errors/AppError";
import { prisma } from "../src/db/prisma";

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

  const fakeGithubProfile = { githubId: `gh-${rand}`, email: `github-${rand}@example.com`, name: "GH User" };
  const ghUser1 = await findOrCreateGithubUser(fakeGithubProfile);
  if (ghUser1.authProvider !== "GITHUB" || ghUser1.email !== fakeGithubProfile.email) {
    fail("create GITHUB user", ghUser1);
  }
  ok("findOrCreateGithubUser creates a new GITHUB user on first call");

  const ghUser2 = await findOrCreateGithubUser(fakeGithubProfile);
  if (ghUser2.id !== ghUser1.id) fail("find-not-recreate on repeat login", ghUser2);
  ok("findOrCreateGithubUser is idempotent for the same GitHub identity");

  let collided = false;
  try {
    await findOrCreateGithubUser({ githubId: `gh-collide-${rand}`, email: ownerEmail, name: "Collider" });
  } catch (err) {
    collided = err instanceof ConflictError;
  }
  if (!collided) fail("email collision with an existing PASSWORD account should throw ConflictError");
  ok("findOrCreateGithubUser rejects email collision with an existing PASSWORD account (no raw P2002 leak)");

  const fakeGoogleProfile = { googleId: `gg-${rand}`, email: `google-${rand}@example.com`, name: "Google User" };
  const gUser1 = await findOrCreateGoogleUser(fakeGoogleProfile);
  if (gUser1.authProvider !== "GOOGLE" || gUser1.email !== fakeGoogleProfile.email) {
    fail("create GOOGLE user", gUser1);
  }
  ok("findOrCreateGoogleUser creates a new GOOGLE user on first call");

  const gUser2 = await findOrCreateGoogleUser(fakeGoogleProfile);
  if (gUser2.id !== gUser1.id) fail("find-not-recreate on repeat Google login", gUser2);
  ok("findOrCreateGoogleUser is idempotent for the same Google identity");

  let googleCollided = false;
  try {
    await findOrCreateGoogleUser({ googleId: `gg-collide-${rand}`, email: ownerEmail, name: "Collider" });
  } catch (err) {
    googleCollided = err instanceof ConflictError;
  }
  if (!googleCollided) fail("Google email collision with an existing PASSWORD account should throw ConflictError");
  ok("findOrCreateGoogleUser rejects email collision with an existing PASSWORD account (no raw P2002 leak)");

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

  res = await fetch(`${BASE}/orgs/${orgId}/members/${membership.id}/projects/${projectId}`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("grant viewer project access", await res.text());
  ok("grant viewer project access (204) -- project-level access is separate from org role/env-tier");

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

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets/bulk`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({
      secrets: [
        { key: "BULK_NEW_KEY", value: "bulk-new-value" },
        { key: secret.key, value: "bulk-updated-value" },
      ],
    }),
  });
  const bulkResult = await res.json();
  if (
    res.status !== 200 ||
    !bulkResult.some((r: { key: string; action: string }) => r.key === "BULK_NEW_KEY" && r.action === "created") ||
    !bulkResult.some((r: { key: string; action: string }) => r.key === secret.key && r.action === "updated")
  ) {
    fail("bulk upsert secrets (one create, one update)", bulkResult);
  }
  ok("bulk upsert secrets: new key created, existing key updated");

  res = await fetch(`${BASE}/secrets/${secret.id}/reveal`, { headers: authHeaders(ownerAccessToken) });
  const bulkUpdatedSecret = await res.json();
  if (res.status !== 200 || bulkUpdatedSecret.value !== "bulk-updated-value") {
    fail("bulk-updated secret value should round-trip on reveal", bulkUpdatedSecret);
  }
  ok("bulk-updated secret value round-trips on reveal");

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets/bulk`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ secrets: Array.from({ length: 101 }, (_, i) => ({ key: `TOO_MANY_${i}`, value: "x" })) }),
  });
  if (res.status !== 400) fail("bulk upsert should reject payloads over 100 entries", await res.text());
  ok("bulk upsert rejects payloads over 100 entries (400)");

  res = await fetch(`${BASE}/environments/${prodEnv.id}/secrets/bulk`, {
    method: "POST",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ secrets: [{ key: "VIEWER_BULK", value: "nope" }] }),
  });
  if (res.status !== 403) fail("viewer bulk upsert on prod should be 403", await res.text());
  ok("viewer cannot bulk upsert secrets on prod environment (403)");

  res = await fetch(`${BASE}/orgs/${orgId}/permissions`, { headers: authHeaders(ownerAccessToken) });
  let matrix = await res.json();
  if (res.status !== 200 || matrix.VIEWER.PRODUCTION.access !== "NONE" || matrix.VIEWER.PRODUCTION.isOverride) {
    fail("fresh org permission matrix should default VIEWER/PRODUCTION to NONE, no override", matrix);
  }
  ok("permission matrix defaults VIEWER/PRODUCTION to NONE with no override");

  res = await fetch(`${BASE}/orgs/${orgId}/permissions`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ role: "VIEWER", environmentType: "PRODUCTION", access: "READ" }),
  });
  matrix = await res.json();
  if (res.status !== 200 || matrix.VIEWER.PRODUCTION.access !== "READ" || !matrix.VIEWER.PRODUCTION.isOverride) {
    fail("set VIEWER/PRODUCTION override to READ", matrix);
  }
  ok("permission override set: VIEWER/PRODUCTION -> READ");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}/reveal`, { headers: authHeaders(viewerAccessToken) });
  if (res.status !== 200) fail("viewer reveal prod secret should now be 200 after READ override", await res.text());
  ok("viewer can now reveal prod secret after READ override (effective access respected end-to-end)");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}`, {
    method: "PATCH",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ value: "still-hacked" }),
  });
  if (res.status !== 403) fail("viewer write prod secret should still be 403 (override is read-only)", await res.text());
  ok("viewer still cannot write prod secret (override grants read, not write)");

  res = await fetch(`${BASE}/orgs/${orgId}/permissions`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ role: "VIEWER", environmentType: "PRODUCTION", access: null }),
  });
  matrix = await res.json();
  if (res.status !== 200 || matrix.VIEWER.PRODUCTION.access !== "NONE" || matrix.VIEWER.PRODUCTION.isOverride) {
    fail("reset VIEWER/PRODUCTION override to default", matrix);
  }
  ok("permission override reset back to default (NONE)");

  res = await fetch(`${BASE}/secrets/${prodSecret.id}/reveal`, { headers: authHeaders(viewerAccessToken) });
  if (res.status !== 403) fail("viewer reveal prod secret should be 403 again after reset", await res.text());
  ok("viewer reveal prod secret rejected again after reset (403)");

  res = await fetch(`${BASE}/orgs/${orgId}/permissions`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ role: "OWNER", environmentType: "PRODUCTION", access: "NONE" }),
  });
  if (res.status !== 403) fail("overriding OWNER access should be rejected", await res.text());
  ok("overriding OWNER's access is rejected (403, guardrail)");

  res = await fetch(`${BASE}/orgs/${orgId}/permissions`, {
    method: "PATCH",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ role: "VIEWER", environmentType: "PRODUCTION", access: "READ" }),
  });
  if (res.status !== 403) fail("viewer should not be able to change the permission matrix", await res.text());
  ok("viewer cannot change the permission matrix (403, ADMIN+ required)");

  const inviteeEmail = `invitee-${rand}@example.com`;
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: inviteeEmail, role: "DEVELOPER" }),
  });
  const createdInvite = await res.json();
  if (res.status !== 201 || !createdInvite.token?.startsWith("invite_")) {
    fail("create invite", createdInvite);
  }
  ok("create invite (token prefixed, 201)");

  res = await fetch(`${BASE}/invites/${createdInvite.token}`);
  const publicInvite = await res.json();
  if (
    res.status !== 200 ||
    publicInvite.email !== inviteeEmail ||
    publicInvite.role !== "DEVELOPER" ||
    publicInvite.accepted !== false
  ) {
    fail("get invite by token (unauthenticated)", publicInvite);
  }
  ok("get invite by token returns correct email/role, unaccepted");

  const mismatchEmail = `mismatch-${rand}@example.com`;
  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Mismatch User", email: mismatchEmail, password }),
  });
  if (res.status !== 201) fail("signup mismatch user", await res.text());

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: mismatchEmail, password }),
  });
  const mismatchLogin = await res.json();
  if (res.status !== 200) fail("login mismatch user", mismatchLogin);
  const mismatchAccessToken: string = mismatchLogin.accessToken;

  res = await fetch(`${BASE}/invites/${createdInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(mismatchAccessToken),
  });
  if (res.status !== 403) fail("accepting an invite with a mismatched email should be 403", await res.text());
  ok("accepting an invite as a different email is rejected (403)");

  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Invitee User", email: inviteeEmail, password }),
  });
  if (res.status !== 201) fail("signup invitee", await res.text());

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: inviteeEmail, password }),
  });
  const inviteeLogin = await res.json();
  if (res.status !== 200) fail("login invitee", inviteeLogin);
  const inviteeAccessToken: string = inviteeLogin.accessToken;

  res = await fetch(`${BASE}/invites/${createdInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(inviteeAccessToken),
  });
  const acceptedMembership = await res.json();
  if (res.status !== 200 || acceptedMembership.role !== "DEVELOPER") {
    fail("accept invite with matching email", acceptedMembership);
  }
  ok("accept invite with matching email succeeds, role matches invite");

  res = await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(ownerAccessToken) });
  const membersAfterAccept = await res.json();
  if (!membersAfterAccept.some((m: { user: { email: string } }) => m.user.email === inviteeEmail)) {
    fail("invitee should appear in org members after accepting", membersAfterAccept);
  }
  ok("invitee appears in org members list after accepting");

  res = await fetch(`${BASE}/invites/${createdInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(inviteeAccessToken),
  });
  if (res.status !== 409) fail("re-accepting the same invite should be 409", await res.text());
  ok("re-accepting an already-accepted invite is rejected (409)");

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: `expiring-${rand}@example.com`, role: "VIEWER" }),
  });
  const expiringInvite = await res.json();
  if (res.status !== 201) fail("create second invite for expiry test", expiringInvite);

  await prisma.orgInvite.update({
    where: { id: expiringInvite.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Expiring User", email: `expiring-${rand}@example.com`, password }),
  });
  if (res.status !== 201) fail("signup expiring-invite user", await res.text());

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `expiring-${rand}@example.com`, password }),
  });
  const expiringLogin = await res.json();
  if (res.status !== 200) fail("login expiring-invite user", expiringLogin);

  res = await fetch(`${BASE}/invites/${expiringInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(expiringLogin.accessToken),
  });
  if (res.status !== 409) fail("accepting an expired invite should be 409", await res.text());
  ok("accepting an expired invite is rejected (409)");

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
    "permission.override_set",
    "permission.override_reset",
    "invite.create",
    "invite.accept",
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

  res = await fetch(`${BASE}/orgs/${orgId}`, { headers: authHeaders(ownerAccessToken) });
  const gotOrg = await res.json();
  if (res.status !== 200 || gotOrg.id !== orgId) fail("get org", gotOrg);
  ok("get org (200)");

  res = await fetch(`${BASE}/orgs/${orgId}`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Acme Inc Renamed" }),
  });
  const renamedOrg = await res.json();
  if (res.status !== 200 || renamedOrg.name !== "Acme Inc Renamed") fail("update org", renamedOrg);
  ok("update org (200, name changed)");

  res = await fetch(`${BASE}/orgs/${orgId}`, {
    method: "PATCH",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ name: "Hijacked" }),
  });
  if (res.status !== 403) fail("viewer update org should be 403 (member, insufficient role)", await res.text());
  ok("viewer cannot update org (403, member but insufficient role)");

  const thirdEmail = `third-${rand}@example.com`;
  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Third User", email: thirdEmail, password }),
  });
  if (res.status !== 201) fail("signup third user", await res.text());
  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: thirdEmail, password }),
  });
  const thirdLogin = await res.json();
  if (res.status !== 200) fail("login third user", thirdLogin);
  const thirdAccessToken: string = thirdLogin.accessToken;

  res = await fetch(`${BASE}/orgs/${orgId}/members`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: thirdEmail, role: "VIEWER" }),
  });
  const thirdMembership = await res.json();
  if (res.status !== 201) fail("add third member", thirdMembership);

  res = await fetch(`${BASE}/orgs/${orgId}/members/${thirdMembership.id}`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ role: "DEVELOPER" }),
  });
  const promotedMember = await res.json();
  if (res.status !== 200 || promotedMember.role !== "DEVELOPER") fail("update member role", promotedMember);
  ok("update member role (200)");

  res = await fetch(`${BASE}/orgs/${orgId}/members/${thirdMembership.id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("remove member", await res.text());
  ok("remove member (204)");

  res = await fetch(`${BASE}/projects/${projectId}`, { headers: authHeaders(ownerAccessToken) });
  const gotProject = await res.json();
  if (res.status !== 200 || gotProject.id !== projectId) fail("get project", gotProject);
  ok("get project (200)");

  res = await fetch(`${BASE}/projects/${projectId}`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Core API Renamed" }),
  });
  const renamedProject = await res.json();
  if (res.status !== 200 || renamedProject.name !== "Core API Renamed") fail("update project", renamedProject);
  ok("update project (200, name changed)");

  res = await fetch(`${BASE}/environments/${devEnv.id}`, { headers: authHeaders(ownerAccessToken) });
  const gotEnv = await res.json();
  if (res.status !== 200 || gotEnv.id !== devEnv.id) fail("get environment", gotEnv);
  ok("get environment (200)");

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, { headers: authHeaders(ownerAccessToken) });
  const invitesList = await res.json();
  if (res.status !== 200 || !invitesList.some((i: { id: string }) => i.id === createdInvite.id)) {
    fail("list invites", invitesList);
  }
  ok("list invites (200, includes previously created invite)");

  // --- Project-level access control ---

  const restrictedEmail = `restricted-${rand}@example.com`;
  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Restricted Dev", email: restrictedEmail, password }),
  });
  if (res.status !== 201) fail("signup restricted developer", await res.text());

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: restrictedEmail, password }),
  });
  const restrictedLogin = await res.json();
  if (res.status !== 200) fail("login restricted developer", restrictedLogin);
  const restrictedAccessToken: string = restrictedLogin.accessToken;
  ok("signup + login restricted developer account");

  res = await fetch(`${BASE}/orgs/${orgId}/members`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: restrictedEmail, role: "DEVELOPER" }),
  });
  const restrictedMembership = await res.json();
  if (res.status !== 201) {
    fail("add restricted developer as org member (no project)", restrictedMembership);
  }
  ok("add restricted developer as org-only member (no project access granted)");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(restrictedAccessToken),
  });
  const restrictedProjectsBeforeGrant = await res.json();
  if (res.status !== 200 || restrictedProjectsBeforeGrant.length !== 0) {
    fail("org-only developer should see zero projects before any grant", restrictedProjectsBeforeGrant);
  }
  ok("org-only developer sees zero projects (project-level access defaults to none)");

  res = await fetch(`${BASE}/projects/${projectId}`, {
    headers: authHeaders(restrictedAccessToken),
  });
  if (res.status !== 404) {
    fail("org-only developer accessing an ungranted project should be 404", await res.text());
  }
  ok("org-only developer cannot open an ungranted project directly (404, no existence leak)");

  res = await fetch(
    `${BASE}/orgs/${orgId}/members/${restrictedMembership.id}/projects/${projectId}`,
    { method: "POST", headers: authHeaders(ownerAccessToken) }
  );
  if (res.status !== 204) fail("grant restricted developer access to project", await res.text());
  ok("owner grants restricted developer access to one project");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(restrictedAccessToken),
  });
  const restrictedProjectsAfterGrant = await res.json();
  if (
    res.status !== 200 ||
    restrictedProjectsAfterGrant.length !== 1 ||
    restrictedProjectsAfterGrant[0].id !== projectId
  ) {
    fail("developer should see exactly the granted project after grant", restrictedProjectsAfterGrant);
  }
  ok("after grant, developer sees exactly the one project they were granted");

  res = await fetch(`${BASE}/projects/${projectId}`, {
    headers: authHeaders(restrictedAccessToken),
  });
  if (res.status !== 200) fail("granted developer should now be able to open the project", await res.text());
  ok("granted developer can now open the project directly (200)");

  res = await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(ownerAccessToken) });
  const fullMembersList = await res.json();
  if (res.status !== 200) fail("owner list members", fullMembersList);

  res = await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(restrictedAccessToken) });
  const restrictedMembersList = await res.json();
  if (
    res.status !== 200 ||
    restrictedMembersList.length >= fullMembersList.length ||
    !restrictedMembersList.some((m: { role: string }) => m.role === "OWNER")
  ) {
    fail("project-scoped developer's member list should be a strict subset that still includes the owner", {
      full: fullMembersList.length,
      restricted: restrictedMembersList.length,
    });
  }
  ok("project-scoped developer sees a filtered member list (fewer than the owner, but always including Owner)");

  res = await fetch(`${BASE}/orgs/${orgId}/audit-logs`, { headers: authHeaders(restrictedAccessToken) });
  const restrictedAuditLogs = await res.json();
  if (
    res.status !== 200 ||
    restrictedAuditLogs.some((l: { projectId: string | null }) => l.projectId !== projectId)
  ) {
    fail("project-scoped developer's audit logs should only contain entries for their accessible project", restrictedAuditLogs);
  }
  ok("project-scoped developer's audit logs are filtered to their accessible project only (no org-level entries)");

  res = await fetch(
    `${BASE}/orgs/${orgId}/members/${restrictedMembership.id}/projects/${projectId}`,
    { method: "DELETE", headers: authHeaders(ownerAccessToken) }
  );
  if (res.status !== 204) fail("revoke restricted developer's project access", await res.text());
  ok("owner revokes restricted developer's project access");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(restrictedAccessToken),
  });
  const restrictedProjectsAfterRevoke = await res.json();
  if (res.status !== 200 || restrictedProjectsAfterRevoke.length !== 0) {
    fail("developer should see zero projects again after revoke", restrictedProjectsAfterRevoke);
  }
  ok("after revoke, developer sees zero projects again");

  res = await fetch(`${BASE}/orgs/${orgId}/members/${restrictedMembership.id}/view-all`, {
    method: "PATCH",
    headers: authHeaders(restrictedAccessToken),
    body: JSON.stringify({ canViewAllProjects: true }),
  });
  if (res.status !== 403) fail("non-owner setting canViewAllProjects should be 403", await res.text());
  ok("only the owner can grant the view-all-projects override (403 for a non-owner, even targeting self)");

  res = await fetch(`${BASE}/orgs/${orgId}/members/${restrictedMembership.id}/view-all`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ canViewAllProjects: true }),
  });
  if (res.status !== 200) fail("owner setting canViewAllProjects should succeed", await res.text());
  ok("owner grants the view-all-projects override");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(restrictedAccessToken),
  });
  const restrictedProjectsWithViewAll = await res.json();
  if (res.status !== 200 || restrictedProjectsWithViewAll.length < 1) {
    fail("developer with the view-all override should see every project", restrictedProjectsWithViewAll);
  }
  ok("developer with the view-all override sees every project regardless of explicit grants");

  res = await fetch(`${BASE}/orgs/${orgId}/members/${restrictedMembership.id}/view-all`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ canViewAllProjects: false }),
  });
  if (res.status !== 200) fail("owner clearing canViewAllProjects should succeed", await res.text());
  ok("owner clears the view-all-projects override");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(restrictedAccessToken),
  });
  const restrictedProjectsAfterClear = await res.json();
  if (res.status !== 200 || restrictedProjectsAfterClear.length !== 0) {
    fail("developer should see zero projects again after the view-all override is cleared", restrictedProjectsAfterClear);
  }
  ok("after clearing view-all, the developer is restricted again");

  res = await fetch(`${BASE}/orgs/${orgId}/members/${restrictedMembership.id}`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ role: "ADMIN" }),
  });
  if (res.status !== 200) fail("promote restricted user to ADMIN for the grant-permission test", await res.text());
  ok("promote restricted user to ADMIN (still has zero project grants and no view-all override)");

  res = await fetch(
    `${BASE}/orgs/${orgId}/members/${restrictedMembership.id}/projects/${projectId}`,
    { method: "POST", headers: authHeaders(restrictedAccessToken) }
  );
  if (res.status !== 403) {
    fail("an admin without access to a project themselves should not be able to grant it to anyone (403)", await res.text());
  }
  ok("an admin without access to a project themselves cannot grant that project's access, even to themselves (403)");

  const projectInviteEmail = `project-invitee-${rand}@example.com`;
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: projectInviteEmail, role: "VIEWER", projectId }),
  });
  const projectInvite = await res.json();
  if (res.status !== 201 || projectInvite.projectId !== projectId) {
    fail("create project-scoped invite", projectInvite);
  }
  ok("create a project-scoped invite (grants org membership + one project's access together)");

  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Project Invitee", email: projectInviteEmail, password }),
  });
  if (res.status !== 201) fail("signup project invitee", await res.text());

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: projectInviteEmail, password }),
  });
  const projectInviteeLogin = await res.json();
  if (res.status !== 200) fail("login project invitee", projectInviteeLogin);
  const projectInviteeAccessToken: string = projectInviteeLogin.accessToken;

  res = await fetch(`${BASE}/invites/${projectInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(projectInviteeAccessToken),
  });
  if (res.status !== 200) fail("accept project-scoped invite", await res.text());
  ok("project invitee signs up and accepts the project-scoped invite");

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    headers: authHeaders(projectInviteeAccessToken),
  });
  const projectInviteeProjects = await res.json();
  if (
    res.status !== 200 ||
    projectInviteeProjects.length !== 1 ||
    projectInviteeProjects[0].id !== projectId
  ) {
    fail("project invitee should see exactly the one project their invite granted", projectInviteeProjects);
  }
  ok("accepting a project-scoped invite grants org membership AND access to exactly that one project");

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ key: "THROWAWAY_DELETE_ME", value: "temp" }),
  });
  const throwawaySecret = await res.json();
  if (res.status !== 201) fail("create throwaway secret", throwawaySecret);

  res = await fetch(`${BASE}/secrets/${throwawaySecret.id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("delete secret", await res.text());
  res = await fetch(`${BASE}/secrets/${throwawaySecret.id}`, { headers: authHeaders(ownerAccessToken) });
  if (res.status !== 404) fail("deleted secret should 404 afterward", await res.text());
  ok("delete secret (204) and it's gone (404 afterward)");

  res = await fetch(`${BASE}/projects/${projectId}/environments`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ type: "STAGING" }),
  });
  const throwawayEnv = await res.json();
  if (res.status !== 201) fail("create throwaway staging environment", throwawayEnv);

  res = await fetch(`${BASE}/environments/${throwawayEnv.id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("delete environment", await res.text());
  ok("delete environment (204)");

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Cross-Org Test Token" }),
  });
  const crossOrgToken = await res.json();
  if (res.status !== 201) fail("create cross-org test token", crossOrgToken);

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, { headers: authHeaders(crossOrgToken.token) });
  if (res.status !== 200) fail("API token should work for its own org", await res.text());
  ok("API token works normally within its own org");

  const org2Slug = `second-org-${rand}`;
  res = await fetch(`${BASE}/orgs`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Second Org", slug: org2Slug }),
  });
  const org2 = await res.json();
  if (res.status !== 201) fail("create second org", org2);
  const org2Id = org2.id;

  res = await fetch(`${BASE}/orgs/${org2Id}/projects`, { headers: authHeaders(crossOrgToken.token) });
  if (res.status !== 403) fail("API token scoped to org 1 should be 403 against org 2", await res.text());
  ok("API token minted for org 1 is rejected against org 2 (403, cross-org scoping enforced)");

  res = await fetch(`${BASE}/orgs/${org2Id}`, { headers: authHeaders(viewerAccessToken) });
  if (res.status !== 404) fail("org viewer has zero membership in should 404, not 403", await res.text());
  ok("accessing an org you have zero membership in returns 404, not 403 (no existence leak)");

  res = await fetch(`${BASE}/projects/${projectId}`, {
    method: "PATCH",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ name: "should fail" }),
  });
  if (res.status !== 403) fail("viewer updating a project in their own org should still be 403", await res.text());
  ok("insufficient role within your own org still returns 403, not 404");

  res = await fetch(`${BASE}/projects/${org2Id}/environments`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ type: "DEVELOPMENT" }),
  });
  if (res.status !== 404) fail("creating an environment under a bogus projectId should 404", await res.text());
  ok("creating an environment under a nonexistent projectId returns 404");

  res = await fetch(`${BASE}/orgs/${org2Id}/projects`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ name: "Org2 Project", slug: `org2-project-${rand}` }),
  });
  const org2Project = await res.json();
  if (res.status !== 201) fail("create org2 project", org2Project);

  res = await fetch(`${BASE}/projects/${org2Project.id}/environments`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ type: "DEVELOPMENT" }),
  });
  const org2Env = await res.json();
  if (res.status !== 201) fail("create org2 environment", org2Env);

  res = await fetch(`${BASE}/environments/${org2Env.id}`, { headers: authHeaders(viewerAccessToken) });
  if (res.status !== 404) fail("environment in an org you have zero membership in should 404", await res.text());
  ok("accessing an environment in an org you have zero membership in returns 404, not 403");

  res = await fetch(`${BASE}/orgs/${org2Id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("delete org", await res.text());

  res = await fetch(`${BASE}/orgs/${org2Id}`, { headers: authHeaders(ownerAccessToken) });
  if (res.status !== 404) fail("deleted org should 404 afterward", await res.text());

  const orgDeleteAuditRow = await prisma.auditLog.findFirst({
    where: { action: "org.delete", targetId: org2Id },
  });
  if (
    !orgDeleteAuditRow ||
    orgDeleteAuditRow.orgId !== null ||
    (orgDeleteAuditRow.metadata as { slug?: string } | null)?.slug !== org2Slug
  ) {
    fail("org.delete audit entry should survive with orgId nulled and metadata snapshot intact", orgDeleteAuditRow);
  }
  ok("deleting an org writes an audit entry that survives the cascade (orgId nulled, metadata snapshot intact)");

  res = await fetch(`${BASE}/auth/github`, { redirect: "manual" });
  const githubLocation = res.headers.get("location") ?? "";
  if (res.status < 300 || res.status >= 400 || !githubLocation.includes("error=oauth_not_configured")) {
    fail("GET /auth/github with no client credentials configured should redirect to oauth_not_configured", {
      status: res.status,
      location: githubLocation,
    });
  }
  ok("GET /auth/github redirects to oauth_not_configured when unconfigured (route-level coverage)");

  res = await fetch(`${BASE}/auth/google`, { redirect: "manual" });
  const googleLocation = res.headers.get("location") ?? "";
  if (res.status < 300 || res.status >= 400 || !googleLocation.includes("error=oauth_not_configured")) {
    fail("GET /auth/google with no client credentials configured should redirect to oauth_not_configured", {
      status: res.status,
      location: googleLocation,
    });
  }
  ok("GET /auth/google redirects to oauth_not_configured when unconfigured (route-level coverage)");

  res = await fetch(`${BASE}/notifications/read-all`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 204) fail("mark all notifications read", await res.text());
  res = await fetch(`${BASE}/notifications`, { headers: authHeaders(ownerAccessToken) });
  const allNotifs = await res.json();
  if (allNotifs.some((n: { read: boolean }) => !n.read)) fail("all notifications should be read after mark-all-read", allNotifs);
  ok("mark all notifications read (204, all subsequently read:true)");

  let oauthPasswordChangeRejected = false;
  try {
    await changePasswordDirect(ghUser1.id, {
      currentPassword: "whatever",
      newPassword: "newsupersecret123",
    });
  } catch (err) {
    oauthPasswordChangeRejected = err instanceof BadRequestError;
  }
  if (!oauthPasswordChangeRejected) {
    fail("changePassword on an OAuth-only account should reject with BadRequestError");
  }
  ok("changePassword rejects OAuth-only accounts (no password to change) (400)");

  const profileTestEmail = `profile-${rand}@example.com`;
  const profileTestPassword = "supersecret123";

  res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Profile Tester",
      email: profileTestEmail,
      password: profileTestPassword,
    }),
  });
  if (res.status !== 201) fail("signup profile-test account", await res.text());

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail, password: profileTestPassword }),
  });
  const profileLogin = await res.json();
  if (res.status !== 200) fail("login profile-test account", profileLogin);
  ok("signup + login dedicated profile-test account");
  const profileAccessToken: string = profileLogin.accessToken;
  const profileRefreshCookie = extractCookie(res.headers.get("set-cookie"), "refreshToken");
  if (!profileRefreshCookie) fail("capture profile-test refresh cookie");

  res = await fetch(`${BASE}/auth/me`, {
    method: "PATCH",
    headers: authHeaders(profileAccessToken),
    body: JSON.stringify({ name: "Renamed Tester" }),
  });
  const renamed = await res.json();
  if (res.status !== 200 || renamed.name !== "Renamed Tester") fail("update profile name", renamed);
  ok("PATCH /auth/me updates the user's display name");

  res = await fetch(`${BASE}/auth/change-password`, {
    method: "POST",
    headers: authHeaders(profileAccessToken),
    body: JSON.stringify({ currentPassword: "totally-wrong", newPassword: "newsupersecret456" }),
  });
  if (res.status !== 401) fail("change password with wrong current password should be 401", await res.text());
  ok("change-password rejects an incorrect current password (401)");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail, password: profileTestPassword }),
  });
  const profileSecondLogin = await res.json();
  if (res.status !== 200) fail("profile-test second-device login", profileSecondLogin);
  ok("profile-test second-device login (for password-change session-revocation check)");

  res = await fetch(`${BASE}/auth/sessions`, {
    headers: { ...authHeaders(profileAccessToken), Cookie: `refreshToken=${profileRefreshCookie}` },
  });
  const beforePasswordChange = await res.json();
  if (res.status !== 200 || beforePasswordChange.length !== 2) {
    fail("expected 2 active sessions before password change", beforePasswordChange);
  }
  ok("2 active sessions exist before password change");

  res = await fetch(`${BASE}/auth/change-password`, {
    method: "POST",
    headers: { ...authHeaders(profileAccessToken), Cookie: `refreshToken=${profileRefreshCookie}` },
    body: JSON.stringify({ currentPassword: profileTestPassword, newPassword: "newsupersecret456" }),
  });
  if (res.status !== 204) fail("change password with correct current password should be 204", await res.text());
  ok("change-password succeeds with the correct current password (204)");

  res = await fetch(`${BASE}/auth/sessions`, {
    headers: { ...authHeaders(profileAccessToken), Cookie: `refreshToken=${profileRefreshCookie}` },
  });
  const afterPasswordChange = await res.json();
  if (res.status !== 200 || afterPasswordChange.length !== 1 || !afterPasswordChange[0].current) {
    fail("after password change, only the requesting session should remain active", afterPasswordChange);
  }
  ok("changing password revokes every other active session but keeps the current one");

  res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `nonexistent-${rand}@example.com` }),
  });
  const nonexistentForgot = await res.json();
  if (res.status !== 200 || nonexistentForgot.resetToken !== null) {
    fail("forgot-password for a nonexistent email should still be 200 with resetToken:null", nonexistentForgot);
  }
  ok("forgot-password for a nonexistent email returns 200 with no token (no enumeration leak)");

  res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: fakeGithubProfile.email }),
  });
  const oauthForgot = await res.json();
  if (res.status !== 200 || oauthForgot.resetToken !== null) {
    fail("forgot-password for an OAuth-only account should return resetToken:null", oauthForgot);
  }
  ok("forgot-password for an OAuth-only account returns no token (nothing to reset)");

  res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail }),
  });
  const realForgot = await res.json();
  if (res.status !== 200 || typeof realForgot.resetToken !== "string") {
    fail("forgot-password for a real password account should return a resetToken", realForgot);
  }
  ok("forgot-password for a real password account returns a resetToken");

  res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "reset_garbage-token-value", newPassword: "irrelevant123" }),
  });
  if (res.status !== 401) fail("reset-password with a garbage token should be 401", await res.text());
  ok("reset-password rejects an invalid token (401)");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail, password: "newsupersecret456" }),
  });
  const preResetLogin = await res.json();
  if (res.status !== 200) fail("login before reset should still succeed with the current password", preResetLogin);
  const preResetRefreshCookie = extractCookie(res.headers.get("set-cookie"), "refreshToken");

  const newResetPassword = "resetflowpassword789";
  res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: realForgot.resetToken, newPassword: newResetPassword }),
  });
  if (res.status !== 204) fail("reset-password with a valid token should be 204", await res.text());
  ok("reset-password succeeds with a valid token (204)");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail, password: "newsupersecret456" }),
  });
  if (res.status !== 401) fail("login with the pre-reset password should now be rejected", await res.text());
  ok("old password is rejected after reset");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail, password: newResetPassword }),
  });
  if (res.status !== 200) fail("login with the new post-reset password should succeed", await res.text());
  ok("new password works after reset");

  res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refreshToken=${preResetRefreshCookie}` },
  });
  if (res.status !== 401) fail("a session that existed before the reset should be revoked", await res.text());
  ok("resetting a password revokes every session that existed beforehand");

  res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: realForgot.resetToken, newPassword: "anothernewpassword123" }),
  });
  if (res.status !== 401) fail("reusing an already-used reset token should be 401", await res.text());
  ok("an already-used reset token is rejected (401)");

  res = await fetch(`${BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: profileTestEmail }),
  });
  const secondForgot = await res.json();
  await prisma.passwordResetToken.updateMany({
    where: { userId: (await prisma.user.findUnique({ where: { email: profileTestEmail } }))!.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  res = await fetch(`${BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: secondForgot.resetToken, newPassword: "yetanotherpassword123" }),
  });
  if (res.status !== 401) fail("an expired reset token should be 401", await res.text());
  ok("an expired reset token is rejected (401)");

  // --- Phase 12: role-assignment hierarchy, invite approval workflow, auto-approve, account deletion ---

  async function signupLogin(name: string, email: string): Promise<string> {
    let r = await fetch(`${BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (r.status !== 201) fail(`signup ${name}`, await r.text());
    r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await r.json();
    if (r.status !== 200) fail(`login ${name}`, body);
    return body.accessToken;
  }

  const hierAdminEmail = `hier-admin-${rand}@example.com`;
  const hierAdminToken = await signupLogin("Hierarchy Admin", hierAdminEmail);
  res = await fetch(`${BASE}/orgs/${orgId}/members`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: hierAdminEmail, role: "ADMIN" }),
  });
  const hierAdminMembership = await res.json();
  if (res.status !== 201) fail("add hierarchy-test admin", hierAdminMembership);

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierAdminToken),
    body: JSON.stringify({ email: `admin-target-${rand}@example.com`, role: "ADMIN" }),
  });
  if (res.status !== 403) fail("an Admin should not be able to invite another Admin (strictly-below rule)", await res.text());
  ok("Admin inviting another Admin is rejected (403, strictly-below-own-role hierarchy)");

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierAdminToken),
    body: JSON.stringify({ email: `dev-target-${rand}@example.com`, role: "DEVELOPER" }),
  });
  if (res.status !== 201) fail("an Admin should be able to invite a Developer", await res.text());
  ok("Admin inviting a Developer succeeds (below own role)");

  const hierDevEmail = `hier-dev-${rand}@example.com`;
  const hierDevToken = await signupLogin("Hierarchy Dev", hierDevEmail);
  res = await fetch(`${BASE}/orgs/${orgId}/members`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: hierDevEmail, role: "DEVELOPER" }),
  });
  const hierDevMembership = await res.json();
  if (res.status !== 201) fail("add hierarchy-test developer", hierDevMembership);

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierDevToken),
    body: JSON.stringify({ email: `dev-peer-${rand}@example.com`, role: "DEVELOPER" }),
  });
  if (res.status !== 403) fail("a Developer should not be able to invite a fellow Developer", await res.text());
  ok("Developer inviting a Developer is rejected (403, only Viewer is below Developer)");

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(viewerAccessToken),
    body: JSON.stringify({ email: `nobody-${rand}@example.com`, role: "VIEWER" }),
  });
  if (res.status !== 403) fail("a Viewer should not be able to invite anyone", await res.text());
  ok("Viewer cannot invite anyone (403, nothing is below Viewer)");

  const pendingInviteEmail = `pending-viewer-${rand}@example.com`;
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierDevToken),
    body: JSON.stringify({ email: pendingInviteEmail, role: "VIEWER" }),
  });
  const pendingInvite = await res.json();
  if (res.status !== 201 || pendingInvite.approvalStatus !== "PENDING") {
    fail("a Developer-created invite should land PENDING with no auto-approve rule active", pendingInvite);
  }
  ok("Developer-created invite lands PENDING approval (no auto-approve rule yet)");

  res = await fetch(`${BASE}/invites/${pendingInvite.token}`);
  const pendingPublicInvite = await res.json();
  if (res.status !== 200 || pendingPublicInvite.pendingApproval !== true) {
    fail("public invite view should report pendingApproval:true", pendingPublicInvite);
  }
  ok("public invite view reports pendingApproval:true while awaiting approval");

  const pendingInviteeToken = await signupLogin("Pending Invitee", pendingInviteEmail);
  res = await fetch(`${BASE}/invites/${pendingInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(pendingInviteeToken),
  });
  if (res.status !== 409) fail("accepting a still-pending invite should be 409", await res.text());
  ok("accepting a PENDING (unapproved) invite is rejected (409)");

  const ownerNotifsRes = await fetch(`${BASE}/notifications`, { headers: authHeaders(ownerAccessToken) });
  const ownerApprovalNotifs = await ownerNotifsRes.json();
  const approvalNotif = (ownerApprovalNotifs as { type: string; metadata: { inviteId?: string } }[]).find(
    (n) => n.type === "invite.approval_requested" && n.metadata?.inviteId === pendingInvite.id
  );
  if (!approvalNotif) fail("owner should have received an invite.approval_requested notification", ownerApprovalNotifs);
  ok("owner receives an invite.approval_requested notification for the Developer's pending invite");

  res = await fetch(`${BASE}/orgs/${orgId}/invites/${pendingInvite.id}/reject`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
  });
  const rejectedInvite = await res.json();
  if (res.status !== 200 || rejectedInvite.approvalStatus !== "REJECTED") {
    fail("reject invite", rejectedInvite);
  }
  ok("owner rejects the pending invite (approvalStatus -> REJECTED)");

  res = await fetch(`${BASE}/invites/${pendingInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(pendingInviteeToken),
  });
  if (res.status !== 409) fail("accepting a rejected invite should be 409", await res.text());
  ok("accepting a REJECTED invite is permanently blocked (409)");

  res = await fetch(`${BASE}/orgs/${orgId}/invites/auto-approve/${hierDevMembership.userId}`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 200) fail("enable per-developer auto-approve rule", await res.text());
  ok("owner enables a per-developer auto-approve rule for the Developer");

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierDevToken),
    body: JSON.stringify({ email: `auto-approved-${rand}@example.com`, role: "VIEWER" }),
  });
  const autoApprovedInvite = await res.json();
  if (res.status !== 201 || autoApprovedInvite.approvalStatus !== "NONE") {
    fail("with a per-developer auto-approve rule active, the invite should skip PENDING", autoApprovedInvite);
  }
  ok("Developer's invite is auto-approved (approvalStatus: NONE) once a per-developer rule is enabled");

  res = await fetch(`${BASE}/orgs/${orgId}/invites/auto-approve/${hierDevMembership.userId ?? hierDevMembership.id}`, {
    method: "DELETE",
    headers: authHeaders(ownerAccessToken),
  });
  if (res.status !== 200) fail("disable per-developer auto-approve rule", await res.text());
  ok("owner disables the per-developer auto-approve rule");

  res = await fetch(`${BASE}/orgs/${orgId}/invites/auto-approve/blanket`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ enabled: true }),
  });
  if (res.status !== 200) fail("enable blanket auto-approve", await res.text());

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierDevToken),
    body: JSON.stringify({ email: `blanket-approved-${rand}@example.com`, role: "VIEWER" }),
  });
  const blanketApprovedInvite = await res.json();
  if (res.status !== 201 || blanketApprovedInvite.approvalStatus !== "NONE") {
    fail("with the blanket auto-approve rule on, every Developer's invite should skip PENDING", blanketApprovedInvite);
  }
  ok("blanket org-wide auto-approve rule skips PENDING for any Developer's invite");

  res = await fetch(`${BASE}/orgs/${orgId}/invites/auto-approve/blanket`, {
    method: "PATCH",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ enabled: false }),
  });
  if (res.status !== 200) fail("disable blanket auto-approve", await res.text());
  ok("owner disables the blanket auto-approve rule");

  const approveFlowEmail = `approve-flow-${rand}@example.com`;
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(hierDevToken),
    body: JSON.stringify({ email: approveFlowEmail, role: "VIEWER" }),
  });
  const approveFlowInvite = await res.json();
  if (res.status !== 201 || approveFlowInvite.approvalStatus !== "PENDING") {
    fail("expected a fresh Developer invite to be PENDING again after disabling auto-approve", approveFlowInvite);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/invites/${approveFlowInvite.id}/approve`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
  });
  const approvedInvite = await res.json();
  if (res.status !== 200 || approvedInvite.approvalStatus !== "APPROVED") {
    fail("approve invite", approvedInvite);
  }
  ok("owner approves a pending invite (approvalStatus -> APPROVED)");

  const approveFlowToken = await signupLogin("Approve Flow Invitee", approveFlowEmail);
  res = await fetch(`${BASE}/invites/${approveFlowInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(approveFlowToken),
  });
  if (res.status !== 200) fail("accepting an approved invite should succeed", await res.text());
  ok("an approved invite can be accepted normally");

  // Audit metadata precision: org.update should now record before/after names.
  res = await fetch(`${BASE}/orgs/${orgId}/audit-logs?action=org.update&limit=5`, {
    headers: authHeaders(ownerAccessToken),
  });
  const orgUpdateLogs = await res.json();
  const orgUpdateLog = (orgUpdateLogs as { metadata: { previousName?: string; newName?: string } }[])[0];
  if (!orgUpdateLog || !orgUpdateLog.metadata?.previousName || !orgUpdateLog.metadata?.newName) {
    fail("org.update audit entries should carry previousName/newName metadata", orgUpdateLog);
  }
  ok("org.update audit entries now record previousName/newName (Part 4 precision)");

  // --- Account deletion ---

  const soloDeleteEmail = `solo-delete-${rand}@example.com`;
  const soloDeleteToken = await signupLogin("Solo Delete User", soloDeleteEmail);
  res = await fetch(`${BASE}/orgs`, {
    method: "POST",
    headers: authHeaders(soloDeleteToken),
    body: JSON.stringify({ name: `Solo Org ${rand}`, slug: `solo-org-${rand}` }),
  });
  const soloOrg = await res.json();
  if (res.status !== 201) fail("create solo-owned org for account-deletion test", soloOrg);

  res = await fetch(`${BASE}/auth/me`, {
    method: "DELETE",
    headers: authHeaders(soloDeleteToken),
    body: JSON.stringify({ confirmEmail: "wrong@example.com" }),
  });
  if (res.status !== 400) fail("deleteAccount with a mismatched confirmEmail should be 400", await res.text());
  ok("account deletion rejects a mismatched confirmEmail (400)");

  res = await fetch(`${BASE}/auth/me`, {
    method: "DELETE",
    headers: authHeaders(soloDeleteToken),
    body: JSON.stringify({ confirmEmail: soloDeleteEmail }),
  });
  if (res.status !== 204) fail("account deletion for a solo-owned-org user should succeed (204)", await res.text());
  ok("account deletion succeeds for a user who only solo-owns orgs (204)");

  res = await fetch(`${BASE}/orgs/${soloOrg.id}`, { headers: authHeaders(ownerAccessToken) });
  if (res.status !== 404) fail("the solo-owned org should be gone after its sole owner's account is deleted", await res.text());
  ok("the solo-owned org is cascade-deleted along with the account");

  res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: soloDeleteEmail, password }),
  });
  if (res.status !== 401) fail("logging in as a deleted account should fail (401)", await res.text());
  ok("logging in as a deleted account fails (401) -- the account is truly gone");

  const blockedOwnerEmail = `blocked-owner-${rand}@example.com`;
  const blockedOwnerToken = await signupLogin("Blocked Owner", blockedOwnerEmail);
  res = await fetch(`${BASE}/orgs`, {
    method: "POST",
    headers: authHeaders(blockedOwnerToken),
    body: JSON.stringify({ name: `Blocked Org ${rand}`, slug: `blocked-org-${rand}` }),
  });
  const blockedOrg = await res.json();
  if (res.status !== 201) fail("create org for blocked-deletion test", blockedOrg);

  const blockedPeerEmail = `blocked-peer-${rand}@example.com`;
  const blockedPeerToken = await signupLogin("Blocked Org Peer", blockedPeerEmail);
  res = await fetch(`${BASE}/orgs/${blockedOrg.id}/members`, {
    method: "POST",
    headers: authHeaders(blockedOwnerToken),
    body: JSON.stringify({ email: blockedPeerEmail, role: "VIEWER" }),
  });
  if (res.status !== 201) fail("add peer member to blocked-deletion org", await res.text());

  res = await fetch(`${BASE}/auth/me`, {
    method: "DELETE",
    headers: authHeaders(blockedOwnerToken),
    body: JSON.stringify({ confirmEmail: blockedOwnerEmail }),
  });
  const blockedBody = await res.json();
  if (res.status !== 409 || !blockedBody?.error?.message?.includes("Blocked Org")) {
    fail("deleting an account that's the sole owner of an org with other members should be blocked (409)", blockedBody);
  }
  ok("account deletion is blocked while the user is the sole owner of an org with other members (409, names the org)");

  void blockedPeerToken;

  const nonOwnerDeleteEmail = `non-owner-delete-${rand}@example.com`;
  const nonOwnerDeleteToken = await signupLogin("Non-Owner Delete User", nonOwnerDeleteEmail);
  res = await fetch(`${BASE}/orgs/${orgId}/members`, {
    method: "POST",
    headers: authHeaders(ownerAccessToken),
    body: JSON.stringify({ email: nonOwnerDeleteEmail, role: "VIEWER" }),
  });
  const nonOwnerMembership = await res.json();
  if (res.status !== 201) fail("add non-owner member for account-deletion test", nonOwnerMembership);

  res = await fetch(`${BASE}/auth/me`, {
    method: "DELETE",
    headers: authHeaders(nonOwnerDeleteToken),
    body: JSON.stringify({ confirmEmail: nonOwnerDeleteEmail }),
  });
  if (res.status !== 204) fail("account deletion for a non-owner member should succeed (204)", await res.text());
  ok("account deletion succeeds for a non-owner org member (204)");

  res = await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(ownerAccessToken) });
  const membersAfterDeletion = await res.json();
  if (
    (membersAfterDeletion as { user: { email: string } }[]).some(
      (m) => m.user.email === nonOwnerDeleteEmail
    )
  ) {
    fail("the deleted non-owner member should no longer appear in the org's member list", membersAfterDeletion);
  }
  res = await fetch(`${BASE}/orgs/${orgId}`, { headers: authHeaders(ownerAccessToken) });
  if (res.status !== 200) fail("the org itself should still exist after a non-owner member deletes their account", await res.text());
  ok("the org survives and the departed member's row is gone (non-owner account deletion doesn't touch the org)");

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
