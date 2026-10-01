-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "textKey" TEXT NOT NULL,
    "translation" TEXT,
    "enrichment" TEXT NOT NULL DEFAULT 'PENDING',
    "enrichmentError" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "level" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TEXT,
    "archivedAt" DATETIME,
    "archiveReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sentence" TEXT NOT NULL,
    CONSTRAINT "Example_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordId" TEXT NOT NULL,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER,
    "nextDue" TEXT,
    CONSTRAINT "ReviewLog_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Word_textKey_key" ON "Word"("textKey");

-- CreateIndex
CREATE INDEX "Word_status_enrichment_dueDate_idx" ON "Word"("status", "enrichment", "dueDate");

-- CreateIndex
CREATE INDEX "Word_status_archivedAt_idx" ON "Word"("status", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Example_wordId_position_key" ON "Example"("wordId", "position");

-- CreateIndex
CREATE INDEX "ReviewLog_wordId_reviewedAt_idx" ON "ReviewLog"("wordId", "reviewedAt");
