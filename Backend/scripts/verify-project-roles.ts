const BASE = "http://localhost:4000/api";

let failures = 0;
function ok(label: string) {
  console.log(`PASS  ${label}`);
}
function fail(label: string, detail?: unknown) {
  failures++;
  console.log(`FAIL  ${label}`, detail ?? "");
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function signup(email: string, name: string) {
  const mod = await import("../src/modules/auth/google.service");
  const user = await mod.findOrCreateGoogleUser({
    googleId: `g-${email}`,
    email,
    name,
    emailVerified: true,
  });
  const authMod = await import("../src/modules/auth/auth.service");
  const session = await authMod.issueSession(user.id, user.email, {});
  return session.accessToken as string;
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const ownerToken = await signup(`owner-${rand}@example.com`, "Owner");
  const adminToken = await signup(`admin-${rand}@example.com`, "Admin");
  const devToken = await signup(`dev-${rand}@example.com`, "Dev");

  let res = await fetch(`${BASE}/orgs`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ name: `Verify Org ${rand}`, slug: `verify-org-${rand}` }),
  });
  const org = await res.json();
  const orgId = org.id;
  ok("owner creates org");

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `admin-${rand}@example.com`, role: "ADMIN" }),
  });
  if (res.status === 400) {
    ok("inviting an Admin without a projectId is rejected");
  } else {
    fail("inviting an Admin without a projectId should be rejected", await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ name: "Alpha", slug: `alpha-${rand}` }),
  });
  const createResult = await res.json();
  if (res.status === 201 && createResult.status === "created") {
    ok("owner creates project immediately (no approval needed)");
  } else {
    fail("owner project creation should be immediate", createResult);
  }
  const projectId = createResult.project.id;

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `admin-${rand}@example.com`, role: "ADMIN", projectId }),
  });
  const adminInvite = await res.json();
  if (res.status === 201) {
    ok("inviting an Admin WITH a projectId succeeds");
  } else {
    fail("inviting an Admin with a projectId should succeed", adminInvite);
  }

  res = await fetch(`${BASE}/invites/${adminInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(adminToken),
  });
  if (res.status === 200) {
    ok("admin accepts the project-scoped invite");
  } else {
    fail("admin invite accept failed", await res.text());
  }

  res = await fetch(`${BASE}/projects/${projectId}/environments`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ type: "DEVELOPMENT" }),
  });
  const devEnv = await res.json();
  if (res.status === 201) {
    ok("admin (project-scoped ADMIN) can create an environment in their project");
  } else {
    fail("admin should be able to create environment in own project", devEnv);
  }

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ key: "FOO", value: "bar" }),
  });
  const secret = await res.json();
  if (res.status === 201) {
    ok("admin can write a secret in their project's dev environment");
  } else {
    fail("admin secret write should succeed", secret);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `dev-${rand}@example.com`, role: "VIEWER" }),
  });
  const viewerInvite = await res.json();
  if (res.status === 201) {
    ok("inviting a Viewer WITHOUT a projectId succeeds (org-only allowed for Viewer)");
  } else {
    fail("viewer org-only invite should succeed", viewerInvite);
  }
  res = await fetch(`${BASE}/invites/${viewerInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(devToken),
  });
  if (res.status !== 200) fail("viewer accept failed", await res.text());

  res = await fetch(`${BASE}/projects/${projectId}`, { headers: authHeaders(devToken) });
  if (res.status === 404) {
    ok("org-only viewer has NO access to the admin's project (not silently granted)");
  } else {
    fail("org-only viewer should not have project access", res.status, await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, { headers: authHeaders(devToken) });
  const viewerProjects = await res.json();
  const seenLocked = viewerProjects.find((p: { id: string; hasAccess: boolean }) => p.id === projectId);
  if (seenLocked && seenLocked.hasAccess === false) {
    ok("viewer can now BROWSE the full project list (locked, needs request)");
  } else {
    fail("viewer should browse-see the project as locked", viewerProjects);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(devToken) });
  const orgMembers = await res.json();
  if (res.status === 200 && orgMembers.length >= 3) {
    ok("org member list shows EVERYONE regardless of project access");
  } else {
    fail("org member list should be unfiltered", orgMembers);
  }

  res = await fetch(`${BASE}/projects/${projectId}/members`, { headers: authHeaders(adminToken) });
  const projectMembers = await res.json();
  const hasViewerHere = projectMembers.some((m: { user: { email: string } }) => m.user.email === `dev-${rand}@example.com`);
  if (res.status === 200 && !hasViewerHere) {
    ok("project member list only shows people actually granted access to THIS project");
  } else {
    fail("project member list should exclude the org-only viewer", projectMembers);
  }

  res = await fetch(`${BASE}/secrets/${secret.id}`, {
    method: "DELETE",
    headers: authHeaders(adminToken),
  });
  if (res.status === 204) {
    ok("soft-delete secret succeeds");
  } else {
    fail("soft-delete should succeed", await res.text());
  }

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets`, { headers: authHeaders(adminToken) });
  const liveSecrets = await res.json();
  if (!liveSecrets.some((s: { id: string }) => s.id === secret.id)) {
    ok("deleted secret no longer appears in the live list");
  } else {
    fail("deleted secret should be excluded from live list", liveSecrets);
  }

  res = await fetch(`${BASE}/environments/${devEnv.id}/secrets/deleted`, {
    headers: authHeaders(adminToken),
  });
  const deletedList = await res.json();
  if (deletedList.some((s: { id: string }) => s.id === secret.id)) {
    ok("deleted secret appears in the recently-deleted list");
  } else {
    fail("deleted secret should appear in deleted list", deletedList);
  }

  res = await fetch(`${BASE}/secrets/${secret.id}/restore`, {
    method: "POST",
    headers: authHeaders(adminToken),
  });
  if (res.status === 200) {
    ok("restoring a deleted secret succeeds");
  } else {
    fail("restore should succeed", await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/projects`, {
    method: "POST",
    headers: authHeaders(adminToken),
    body: JSON.stringify({ name: "Beta", slug: `beta-${rand}` }),
  });
  const adminCreate = await res.json();
  if (res.status === 202 && adminCreate.status === "pending") {
    ok("Admin-created project without auto-approve goes PENDING (needs Owner approval)");
  } else {
    fail("Admin project creation should be pending by default", adminCreate);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/project-creation-requests`, {
    headers: authHeaders(ownerToken),
  });
  const pendingRequests = await res.json();
  const req = pendingRequests.find((r: { name: string }) => r.name === "Beta");
  if (req) {
    ok("owner sees the pending project creation request");
  } else {
    fail("owner should see the pending request", pendingRequests);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/project-creation-requests/${req.id}/approve`, {
    method: "POST",
    headers: authHeaders(ownerToken),
  });
  const approvedProject = await res.json();
  if (res.status === 200 && approvedProject.name === "Beta") {
    ok("owner approving the request actually creates the project");
  } else {
    fail("approval should create the project", approvedProject);
  }

  res = await fetch(`${BASE}/projects/${approvedProject.id}`, { headers: authHeaders(adminToken) });
  const betaProject = await res.json();
  if (res.status === 200 && betaProject.myRole === "ADMIN") {
    ok("the requesting admin is auto-added as ADMIN of the newly-approved project");
  } else {
    fail("requesting admin should be ADMIN of their approved project", betaProject);
  }

  const staleToken = await signup(`stale-${rand}@example.com`, "Stale");
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `stale-${rand}@example.com`, role: "DEVELOPER", projectId }),
  });
  const staleInvite = await res.json();
  await fetch(`${BASE}/invites/${staleInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(staleToken),
  });
  res = await fetch(`${BASE}/projects/${projectId}`, { headers: authHeaders(staleToken) });
  if (res.status === 200) {
    ok("freshly-invited developer has access to their project");
  } else {
    fail("freshly-invited developer should have access", await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(ownerToken) });
  const membersList = await res.json();
  const staleMembership = membersList.find((m: { user: { email: string } }) => m.user.email === `stale-${rand}@example.com`);
  res = await fetch(`${BASE}/orgs/${orgId}/members/${staleMembership.membershipId}`, {
    method: "DELETE",
    headers: authHeaders(ownerToken),
  });
  if (res.status === 204) {
    ok("owner removes the developer from the org");
  } else {
    fail("member removal should succeed", await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `stale-${rand}@example.com`, role: "VIEWER" }),
  });
  const rejoinInvite = await res.json();
  await fetch(`${BASE}/invites/${rejoinInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(staleToken),
  });
  res = await fetch(`${BASE}/projects/${projectId}`, { headers: authHeaders(staleToken) });
  if (res.status === 404) {
    ok("rejoining org-only as Viewer does NOT silently restore the old Developer project grant");
  } else {
    fail("stale project grant should have been cleared on removal", res.status, await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/transfer-ownership`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ membershipId: (await (await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(ownerToken) })).json()).find((m: { role: string }) => m.role === "ADMIN").membershipId }),
  });
  if (res.status === 200 || res.status === 204) {
    ok("ownership transfer succeeds");
  } else {
    fail("ownership transfer should succeed", await res.text());
  }

  res = await fetch(`${BASE}/projects/${projectId}`, { headers: authHeaders(ownerToken) });
  const demotedOwnerProject = await res.json();
  if (res.status === 200 && demotedOwnerProject.myRole === "ADMIN") {
    ok("the demoted former-owner keeps ADMIN access to projects they used to manage");
  } else {
    fail("former owner should retain project access after being demoted", res.status, demotedOwnerProject);
  }

  console.log(failures === 0 ? "\nAll verification checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
