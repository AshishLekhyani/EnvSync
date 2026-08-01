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
    body: JSON.stringify({ email: `dev-${rand}@example.com` }),
  });
  const viewerInvite = await res.json();
  if (res.status === 201 && viewerInvite.role === null) {
    ok("org-only invite (no project) succeeds and carries no role");
  } else {
    fail("org-only invite should succeed with a null role", viewerInvite);
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
    body: JSON.stringify({ email: `stale-${rand}@example.com` }),
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

  res = await fetch(`${BASE}/projects/${projectId}/members`, { headers: authHeaders(ownerToken) });
  const projectMembersNow = await res.json();
  const ownerEntries = projectMembersNow.filter(
    (m: { role: string; user: { email: string } }) => m.user.email === `owner-${rand}@example.com`
  );
  if (ownerEntries.length === 1 && ownerEntries[0].role === "OWNER") {
    ok("owner appears exactly once in project members list (no duplicate ADMIN grant)");
  } else {
    fail("owner should appear exactly once in project members", ownerEntries);
  }

  const upgradeToken = await signup(`upgrade-${rand}@example.com`, "Upgrade");
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `upgrade-${rand}@example.com`, role: "VIEWER", projectId }),
  });
  const upgradeInvite = await res.json();
  await fetch(`${BASE}/invites/${upgradeInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(upgradeToken),
  });
  res = await fetch(`${BASE}/orgs/${orgId}/projects/${projectId}/access-requests`, {
    method: "POST",
    headers: authHeaders(upgradeToken),
    body: JSON.stringify({ requestedRole: "DEVELOPER" }),
  });
  const upgradeRequest = await res.json();
  if (res.status === 201) {
    ok("existing VIEWER can request an upgrade to DEVELOPER on the same project");
  } else {
    fail("existing member should be able to request a role upgrade", upgradeRequest);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/project-access-requests`, {
    headers: authHeaders(ownerToken),
  });
  const pendingUpgrade = (await res.json()).find((r: { id: string }) => r.id === upgradeRequest.id);
  res = await fetch(
    `${BASE}/orgs/${orgId}/project-access-requests/${pendingUpgrade.id}/approve`,
    { method: "POST", headers: authHeaders(ownerToken) }
  );
  if (res.status === 204) {
    ok("owner approves the role-upgrade request");
  } else {
    fail("upgrade approval should succeed", await res.text());
  }

  res = await fetch(`${BASE}/projects/${projectId}`, { headers: authHeaders(upgradeToken) });
  const upgradedProject = await res.json();
  if (upgradedProject.myRole === "DEVELOPER") {
    ok("approving the upgrade request actually changed the project role from VIEWER to DEVELOPER");
  } else {
    fail("project role should now be DEVELOPER", upgradedProject);
  }

  const devOnlyToken = await signup(`devonly-${rand}@example.com`, "DevOnly");
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `devonly-${rand}@example.com`, role: "DEVELOPER", projectId }),
  });
  const devOnlyInvite = await res.json();
  await fetch(`${BASE}/invites/${devOnlyInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(devOnlyToken),
  });
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(devOnlyToken),
    body: JSON.stringify({ email: `nobody-${rand}@example.com`, role: "VIEWER", projectId }),
  });
  if (res.status === 403) {
    ok("a project Developer (not Admin) cannot invite anyone to that project");
  } else {
    fail("Developer-issued invite should be forbidden", res.status, await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/audit-logs`, { headers: authHeaders(devOnlyToken) });
  if (res.status === 200) {
    ok("a non-owner member can view audit logs (scoped to their accessible projects)");
  } else {
    fail("non-owner should be able to view audit logs, not just Owner", res.status, await res.text());
  }

  const leaverToken = await signup(`leaver-${rand}@example.com`, "Leaver");
  res = await fetch(`${BASE}/orgs/${orgId}/invites`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ email: `leaver-${rand}@example.com` }),
  });
  const leaverInvite = await res.json();
  await fetch(`${BASE}/invites/${leaverInvite.token}/accept`, {
    method: "POST",
    headers: authHeaders(leaverToken),
  });
  const leaverMembers = await (
    await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(leaverToken) })
  ).json();
  const leaverMembership = leaverMembers.find(
    (m: { user: { email: string } }) => m.user.email === `leaver-${rand}@example.com`
  );

  res = await fetch(`${BASE}/orgs/${orgId}/members/${leaverMembership.membershipId}`, {
    method: "DELETE",
    headers: authHeaders(devOnlyToken),
  });
  if (res.status === 403) {
    ok("a non-owner member cannot remove someone ELSE from the org (only self, or Owner)");
  } else {
    fail("non-owner removing another member should be forbidden", res.status, await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/members/${leaverMembership.membershipId}`, {
    method: "DELETE",
    headers: authHeaders(leaverToken),
  });
  if (res.status === 204) {
    ok("a non-owner member can remove (leave) themselves from the org via the members endpoint");
  } else {
    fail("self-leave via removeMember should succeed for a non-owner", res.status, await res.text());
  }

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, {
    method: "POST",
    headers: authHeaders(devOnlyToken),
    body: JSON.stringify({ name: "dev's own CLI token" }),
  });
  const devToken2 = await res.json();
  if (res.status === 201) {
    ok("a non-owner (project Developer) can create their own API token");
  } else {
    fail("non-owner should be able to create their own token", res.status, devToken2);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, { headers: authHeaders(devOnlyToken) });
  const devTokenList = await res.json();
  const onlyOwnTokens = devTokenList.every(
    (t: { createdBy: { email: string } }) => t.createdBy.email === `devonly-${rand}@example.com`
  );
  if (res.status === 200 && onlyOwnTokens && devTokenList.length >= 1) {
    ok("a non-owner only sees their own tokens, not everyone else's");
  } else {
    fail("non-owner token list should be scoped to their own tokens", devTokenList);
  }

  res = await fetch(`${BASE}/orgs/${orgId}/tokens`, { headers: authHeaders(ownerToken) });
  const ownerTokenList = await res.json();
  if (
    res.status === 200 &&
    ownerTokenList.some((t: { createdBy: { email: string } }) => t.createdBy.email === `devonly-${rand}@example.com`)
  ) {
    ok("the Owner sees every token in the org, including ones created by other members");
  } else {
    fail("owner should see all tokens org-wide", ownerTokenList);
  }

  const membersForTransfer = await (
    await fetch(`${BASE}/orgs/${orgId}/members`, { headers: authHeaders(ownerToken) })
  ).json();
  const adminMembership = membersForTransfer.find(
    (m: { user: { email: string } }) => m.user.email === `admin-${rand}@example.com`
  );
  res = await fetch(`${BASE}/orgs/${orgId}/transfer-ownership`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ membershipId: adminMembership.membershipId }),
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

  res = await fetch(`${BASE}/orgs/${orgId}/permissions`, {
    method: "PATCH",
    headers: authHeaders(ownerToken),
    body: JSON.stringify({ role: "VIEWER", environmentType: "PRODUCTION", access: "READ" }),
  });
  if (res.status === 403) {
    ok("the demoted former-owner's ORG role is a plain member, not ADMIN (rejected on an ADMIN-gated org route)");
  } else {
    fail("former owner's org role should be demoted to the plain-member placeholder, not ADMIN", res.status, await res.text());
  }

  console.log(failures === 0 ? "\nAll verification checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
