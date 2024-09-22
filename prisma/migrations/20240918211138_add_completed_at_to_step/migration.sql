/*
  Warnings:

  - You are about to drop the column `completed` on the `Goal` table. All the data in the column will be lost.
  - You are about to drop the column `completed` on the `Step` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("createdAt", "description", "dueDate", "id", "title", "updatedAt", "userId") SELECT "createdAt", "description", "dueDate", "id", "title", "updatedAt", "userId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
CREATE TABLE "new_Step" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "snoozeTill" DATETIME,
    "completedAt" DATETIME,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "goalId" TEXT NOT NULL,
    CONSTRAINT "Step_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Step" ("createdAt", "description", "duration", "goalId", "id", "snoozeTill", "title", "updatedAt") SELECT "createdAt", "description", "duration", "goalId", "id", "snoozeTill", "title", "updatedAt" FROM "Step";
DROP TABLE "Step";
ALTER TABLE "new_Step" RENAME TO "Step";
CREATE INDEX "Step_goalId_idx" ON "Step"("goalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
