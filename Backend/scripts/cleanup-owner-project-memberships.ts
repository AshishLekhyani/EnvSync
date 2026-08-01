import { prisma } from "../src/db/prisma";

async function main() {
  const owners = await prisma.orgMembership.findMany({
    where: { role: "OWNER" },
    select: { userId: true, orgId: true },
  });

  let deleted = 0;
  for (const owner of owners) {
    const result = await prisma.projectMembership.deleteMany({
      where: { userId: owner.userId, project: { orgId: owner.orgId } },
    });
    deleted += result.count;
  }

  console.log(`Cleanup complete. Removed ${deleted} stale owner ProjectMembership row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
