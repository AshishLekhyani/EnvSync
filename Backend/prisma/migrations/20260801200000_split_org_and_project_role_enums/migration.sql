-- Splits the previously-shared OrgRole enum into two:
--   OrgRole      (OrgMembership.role only)      -> narrowed to OWNER, VIEWER
--   ProjectRole  (everything project-scoped)    -> OWNER, ADMIN, DEVELOPER, VIEWER
--
-- Written by hand instead of via `prisma migrate dev`: the naive auto-diff drops and
-- recreates the role column on ProjectMembership / OrgEnvironmentPermission / OrgInvite
-- (destroying every existing project grant, permission override, and invite role), and
-- fails outright on OrgMembership because pre-existing rows still hold ADMIN/DEVELOPER
-- values from before org-level roles were collapsed to OWNER/VIEWER-only. This migration
-- performs in-place type casts (zero data loss on the four project-scoped columns) and a
-- one-time data correction (stale org-level ADMIN/DEVELOPER rows -> VIEWER, the meaningless
-- placeholder they should already have been) before narrowing OrgMembership.role.

BEGIN;

-- New enum for every project-scoped role field. Same members as the old OrgRole, so every
-- existing value in these columns casts across unchanged.
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER');

ALTER TABLE "ProjectMembership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "ProjectMembership" ALTER COLUMN "role" TYPE "ProjectRole" USING ("role"::text::"ProjectRole");
ALTER TABLE "ProjectMembership" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

ALTER TABLE "OrgEnvironmentPermission" ALTER COLUMN "role" TYPE "ProjectRole" USING ("role"::text::"ProjectRole");

ALTER TABLE "OrgInvite" ALTER COLUMN "role" TYPE "ProjectRole" USING ("role"::text::"ProjectRole");

ALTER TABLE "ProjectAccessRequest" ALTER COLUMN "requestedRole" TYPE "ProjectRole" USING ("requestedRole"::text::"ProjectRole");

-- Data correction: pre-existing OrgMembership rows from before org-level roles were
-- collapsed to OWNER/VIEWER-only. These are stale ADMIN/DEVELOPER values with no meaning
-- under the current model (org role only ever grants Owner-level power or nothing) -
-- normalize them to the VIEWER placeholder before narrowing the column's type.
UPDATE "OrgMembership" SET "role" = 'VIEWER' WHERE "role" NOT IN ('OWNER');

ALTER TABLE "OrgMembership" ALTER COLUMN "role" DROP DEFAULT;
CREATE TYPE "OrgRole_new" AS ENUM ('OWNER', 'VIEWER');
ALTER TABLE "OrgMembership" ALTER COLUMN "role" TYPE "OrgRole_new" USING ("role"::text::"OrgRole_new");
ALTER TYPE "OrgRole" RENAME TO "OrgRole_old";
ALTER TYPE "OrgRole_new" RENAME TO "OrgRole";
DROP TYPE "OrgRole_old";
ALTER TABLE "OrgMembership" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

COMMIT;
