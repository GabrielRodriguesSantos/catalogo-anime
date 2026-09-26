-- AlterTable
ALTER TABLE "Work" ADD COLUMN "language" TEXT;
ALTER TABLE "Work" ADD COLUMN "platform" TEXT;

-- CreateTable
CREATE TABLE "WorkExternalLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "country" TEXT,
    "flag" TEXT,
    "language" TEXT,
    "region" TEXT,
    "priceModel" TEXT,
    "dubbingStatus" TEXT,
    "subtitleAvailable" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkExternalLink_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "author" TEXT,
    "snippet" TEXT,
    "publishedAt" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkReview_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkExternalLink_workId_idx" ON "WorkExternalLink"("workId");

-- CreateIndex
CREATE INDEX "WorkReview_workId_idx" ON "WorkReview"("workId");

-- CreateIndex
CREATE INDEX "Work_language_idx" ON "Work"("language");

-- CreateIndex
CREATE INDEX "Work_platform_idx" ON "Work"("platform");
