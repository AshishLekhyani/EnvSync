import { prisma } from "../src/db/prisma";

async function main() {
  const result = await prisma.user.updateMany({
    where: { emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });

  console.log(`Backfill complete. Marked ${result.count} pre-existing account(s) as verified.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
