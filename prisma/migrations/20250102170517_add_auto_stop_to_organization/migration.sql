-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "line1" TEXT,
    "line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "autoStop" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_organizations" ("city", "createdAt", "email", "id", "line1", "line2", "name", "phone", "state", "updatedAt", "zip") SELECT "city", "createdAt", "email", "id", "line1", "line2", "name", "phone", "state", "updatedAt", "zip" FROM "organizations";
DROP TABLE "organizations";
ALTER TABLE "new_organizations" RENAME TO "organizations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
