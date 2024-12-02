/*
  Warnings:

  - You are about to drop the column `status` on the `invoices` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "number" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "tax" DECIMAL,
    "discount" DECIMAL,
    CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("clientId", "createdAt", "discount", "dueDate", "id", "issueDate", "number", "tax", "updatedAt") SELECT "clientId", "createdAt", "discount", "dueDate", "id", "issueDate", "number", "tax", "updatedAt" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
