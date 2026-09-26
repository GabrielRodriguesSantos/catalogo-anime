-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "bio" TEXT,
    "birthday" DATETIME,
    "location" TEXT,
    "website" TEXT,
    "theme" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "extras" TEXT,
    "adultVerified" BOOLEAN NOT NULL DEFAULT false,
    "adultVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("avatarUrl", "bannerUrl", "bio", "birthday", "createdAt", "displayName", "extras", "id", "locale", "location", "theme", "updatedAt", "userId", "website") SELECT "avatarUrl", "bannerUrl", "bio", "birthday", "createdAt", "displayName", "extras", "id", "locale", "location", "theme", "updatedAt", "userId", "website" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE TABLE "new_Work" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titles" TEXT,
    "synopsis" TEXT,
    "coverUrl" TEXT,
    "bannerUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "year" INTEGER,
    "studio" TEXT,
    "author" TEXT,
    "totalChapters" INTEGER,
    "totalEpisodes" INTEGER,
    "rating" REAL,
    "ageRating" TEXT NOT NULL DEFAULT 'LIVRE',
    "availability" TEXT,
    "language" TEXT,
    "platform" TEXT,
    "externalIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Work" ("author", "availability", "bannerUrl", "coverUrl", "createdAt", "externalIds", "id", "language", "platform", "rating", "status", "studio", "synopsis", "title", "titles", "totalChapters", "totalEpisodes", "type", "updatedAt", "year") SELECT "author", "availability", "bannerUrl", "coverUrl", "createdAt", "externalIds", "id", "language", "platform", "rating", "status", "studio", "synopsis", "title", "titles", "totalChapters", "totalEpisodes", "type", "updatedAt", "year" FROM "Work";
DROP TABLE "Work";
ALTER TABLE "new_Work" RENAME TO "Work";
CREATE INDEX "Work_type_idx" ON "Work"("type");
CREATE INDEX "Work_status_idx" ON "Work"("status");
CREATE INDEX "Work_title_idx" ON "Work"("title");
CREATE INDEX "Work_language_idx" ON "Work"("language");
CREATE INDEX "Work_platform_idx" ON "Work"("platform");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
