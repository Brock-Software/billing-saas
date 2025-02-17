/*
  Warnings:

  - A unique constraint covering the columns `[number,clientId]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "invoices_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_clientId_key" ON "invoices"("number", "clientId");
