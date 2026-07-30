import { prisma } from "../src/db/prisma";

async function main() {
  const orgs = await prisma.organization.findMany({
    include: { memberships: true, projects: true },
  });

  let created = 0;
  let skippedNoOwner = 0;

  for (const org of orgs) {
    const owner = org.memberships.find((m) => m.role === "OWNER");
    if (!owner) {
      skippedNoOwner++;
      continue;
    }

    for (const membership of org.memberships) {
      for (const project of org.projects) {
        const existing = await prisma.projectMembership.findUnique({
          where: { userId_projectId: { userId: membership.userId, projectId: project.id } },
        });
        if (existing) continue;

        await prisma.projectMembership.create({
          data: {
            userId: membership.userId,
            projectId: project.id,
            grantedById: owner.userId,
          },
        });
        created++;
      }
    }
  }

  console.log(
    `Backfill complete. Created ${created} ProjectMembership row(s) across ${orgs.length} org(s).` +
      (skippedNoOwner ? ` Skipped ${skippedNoOwner} org(s) with no OWNER membership.` : "")
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
