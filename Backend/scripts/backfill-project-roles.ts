import { prisma } from "../src/db/prisma";

async function main() {
  const grants = await prisma.projectMembership.findMany({
    include: { project: { select: { orgId: true } } },
  });

  let updated = 0;
  let skippedOwner = 0;
  let skippedNoMembership = 0;

  for (const grant of grants) {
    const membership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId: grant.userId, orgId: grant.project.orgId } },
    });

    if (!membership) {
      skippedNoMembership++;
      continue;
    }

    if (membership.role === "OWNER") {
      skippedOwner++;
      continue;
    }

    if (grant.role === membership.role) continue;

    await prisma.projectMembership.update({
      where: { id: grant.id },
      data: { role: membership.role },
    });
    updated++;
  }

  console.log(
    `Backfill complete. Updated ${updated} ProjectMembership role(s) to match the member's prior org role.` +
      (skippedOwner ? ` Skipped ${skippedOwner} owner grant(s) (owners bypass project roles).` : "") +
      (skippedNoMembership ? ` Skipped ${skippedNoMembership} grant(s) with no matching org membership.` : "")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
