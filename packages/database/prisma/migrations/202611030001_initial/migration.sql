-- MediaMatrix initial PostgreSQL schema.
-- Authored from prisma/schema.prisma. Execute with Prisma Migrate only after operator approval and backup.
CREATE TYPE "RoleName" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "MediaType" AS ENUM ('movie', 'tv');
CREATE TYPE "OfferType" AS ENUM ('subscription', 'free', 'rent', 'buy');
CREATE TYPE "PlaylistSourceType" AS ENUM ('URL', 'UPLOAD', 'GITHUB');
CREATE TYPE "PlaylistStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'ERROR');
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "name" "RoleName" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT,
  "image" TEXT,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "country" CHAR(2) NOT NULL DEFAULT 'BD',
  "language" TEXT NOT NULL DEFAULT 'en',
  "autoplay" BOOLEAN NOT NULL DEFAULT false,
  "dataSaver" BOOLEAN NOT NULL DEFAULT false,
  "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Genre" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "type" "MediaType" NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Genre_pkey" PRIMARY KEY ("id", "type")
);
CREATE TABLE "Movie" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "originalTitle" TEXT,
  "overview" TEXT NOT NULL,
  "posterPath" TEXT,
  "backdropPath" TEXT,
  "releaseDate" TIMESTAMP(3),
  "runtime" INTEGER,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "voteCount" INTEGER NOT NULL DEFAULT 0,
  "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT,
  "tagline" TEXT,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TvSeries" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT,
  "overview" TEXT NOT NULL,
  "posterPath" TEXT,
  "backdropPath" TEXT,
  "firstAirDate" TIMESTAMP(3),
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "voteCount" INTEGER NOT NULL DEFAULT 0,
  "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT,
  "numberOfSeasons" INTEGER NOT NULL DEFAULT 0,
  "numberOfEpisodes" INTEGER NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TvSeries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MovieGenre" (
  "movieId" TEXT NOT NULL,
  "genreId" INTEGER NOT NULL,
  "genreType" "MediaType" NOT NULL DEFAULT 'movie'::"MediaType",
  CONSTRAINT "MovieGenre_pkey" PRIMARY KEY ("movieId", "genreId", "genreType")
);
CREATE TABLE "TvGenre" (
  "tvSeriesId" TEXT NOT NULL,
  "genreId" INTEGER NOT NULL,
  "genreType" "MediaType" NOT NULL DEFAULT 'tv'::"MediaType",
  CONSTRAINT "TvGenre_pkey" PRIMARY KEY ("tvSeriesId", "genreId", "genreType")
);
CREATE TABLE "Season" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "tvSeriesId" TEXT NOT NULL,
  "seasonNumber" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "overview" TEXT NOT NULL,
  "airDate" TIMESTAMP(3),
  "posterPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Episode" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "seasonId" TEXT NOT NULL,
  "episodeNumber" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "overview" TEXT NOT NULL,
  "airDate" TIMESTAMP(3),
  "runtime" INTEGER,
  "stillPath" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Person" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "biography" TEXT NOT NULL,
  "profilePath" TEXT,
  "birthday" TIMESTAMP(3),
  "deathday" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MediaCredit" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "movieId" TEXT,
  "tvSeriesId" TEXT,
  "character" TEXT,
  "job" TEXT,
  "creditOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "MediaCredit_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StreamingProvider" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logoUrl" TEXT,
  "homepageUrl" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StreamingProvider_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StreamingAvailability" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "movieId" TEXT,
  "tvSeriesId" TEXT,
  "country" CHAR(2) NOT NULL,
  "offerType" "OfferType" NOT NULL,
  "officialUrl" TEXT,
  "quality" TEXT,
  "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StreamingAvailability_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Watchlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mediaKey" TEXT NOT NULL,
  "mediaType" "MediaType" NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "posterPath" TEXT,
  "movieId" TEXT,
  "tvSeriesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mediaKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "mediaType" "MediaType",
  "tmdbId" INTEGER,
  "posterPath" TEXT,
  "movieId" TEXT,
  "tvSeriesId" TEXT,
  "playlistItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WatchHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mediaKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "movieId" TEXT,
  "tvSeriesId" TEXT,
  "episodeId" TEXT,
  "playlistItemId" TEXT,
  "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WatchHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlaybackProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mediaKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "posterPath" TEXT,
  "seconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "movieId" TEXT,
  "episodeId" TEXT,
  "playlistItemId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaybackProgress_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Playlist" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceType" "PlaylistSourceType" NOT NULL,
  "sourceUrlCiphertext" TEXT,
  "sourceUrlHash" TEXT,
  "contentHash" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "allowPrivateNetwork" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "PlaylistStatus" NOT NULL DEFAULT 'ACTIVE'::"PlaylistStatus",
  "refreshMinutes" INTEGER NOT NULL DEFAULT 360,
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "githubRepository" TEXT,
  "githubBranch" TEXT,
  "githubFilePath" TEXT,
  "githubLastContentSha" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlaylistItem" (
  "id" TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "channelKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "streamUrlCiphertext" TEXT NOT NULL,
  "streamUrlHash" TEXT NOT NULL,
  "logoUrl" TEXT,
  "groupName" TEXT NOT NULL,
  "tvgId" TEXT,
  "metadata" JSONB NOT NULL,
  "position" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlaylistSyncLog" (
  "id" TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "status" "SyncStatus" NOT NULL,
  "message" TEXT NOT NULL,
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "PlaylistSyncLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MediaSource" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sourceUrlCiphertext" TEXT NOT NULL,
  "sourceUrlHash" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "movieId" TEXT,
  "tvSeriesId" TEXT,
  "episodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "MediaSource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TranscodingJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workerJobId" TEXT,
  "inputUrlCiphertext" TEXT NOT NULL,
  "outputPrefix" TEXT,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED'::"JobStatus",
  "progress" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TranscodingJob_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "APIConfiguration" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "valueCiphertext" TEXT,
  "nonSecretValue" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "APIConfiguration_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "ipHash" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED'::"JobStatus",
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE INDEX "Genre_type_idx" ON "Genre"("type");
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
CREATE INDEX "Movie_releaseDate_idx" ON "Movie"("releaseDate");
CREATE INDEX "Movie_popularity_idx" ON "Movie"("popularity");
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");
CREATE UNIQUE INDEX "TvSeries_tmdbId_key" ON "TvSeries"("tmdbId");
CREATE INDEX "TvSeries_firstAirDate_idx" ON "TvSeries"("firstAirDate");
CREATE INDEX "TvSeries_popularity_idx" ON "TvSeries"("popularity");
CREATE INDEX "TvSeries_rating_idx" ON "TvSeries"("rating");
CREATE INDEX "MovieGenre_genreId_genreType_idx" ON "MovieGenre"("genreId", "genreType");
CREATE INDEX "TvGenre_genreId_genreType_idx" ON "TvGenre"("genreId", "genreType");
CREATE UNIQUE INDEX "Season_tmdbId_key" ON "Season"("tmdbId");
CREATE UNIQUE INDEX "Season_tvSeriesId_seasonNumber_key" ON "Season"("tvSeriesId", "seasonNumber");
CREATE INDEX "Season_tvSeriesId_idx" ON "Season"("tvSeriesId");
CREATE UNIQUE INDEX "Episode_tmdbId_key" ON "Episode"("tmdbId");
CREATE UNIQUE INDEX "Episode_seasonId_episodeNumber_key" ON "Episode"("seasonId", "episodeNumber");
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");
CREATE UNIQUE INDEX "Person_tmdbId_key" ON "Person"("tmdbId");
CREATE UNIQUE INDEX "MediaCredit_personId_movieId_character_key" ON "MediaCredit"("personId", "movieId", "character");
CREATE UNIQUE INDEX "MediaCredit_personId_tvSeriesId_character_key" ON "MediaCredit"("personId", "tvSeriesId", "character");
CREATE INDEX "MediaCredit_movieId_creditOrder_idx" ON "MediaCredit"("movieId", "creditOrder");
CREATE INDEX "MediaCredit_tvSeriesId_creditOrder_idx" ON "MediaCredit"("tvSeriesId", "creditOrder");
CREATE UNIQUE INDEX "StreamingProvider_externalId_key" ON "StreamingProvider"("externalId");
CREATE UNIQUE INDEX "StreamingAvailability_providerId_movieId_country_offerType_key" ON "StreamingAvailability"("providerId", "movieId", "country", "offerType");
CREATE UNIQUE INDEX "StreamingAvailability_providerId_tvSeriesId_country_offerType_key" ON "StreamingAvailability"("providerId", "tvSeriesId", "country", "offerType");
CREATE INDEX "StreamingAvailability_movieId_country_idx" ON "StreamingAvailability"("movieId", "country");
CREATE INDEX "StreamingAvailability_tvSeriesId_country_idx" ON "StreamingAvailability"("tvSeriesId", "country");
CREATE INDEX "StreamingAvailability_lastVerifiedAt_idx" ON "StreamingAvailability"("lastVerifiedAt");
CREATE UNIQUE INDEX "Watchlist_userId_mediaKey_key" ON "Watchlist"("userId", "mediaKey");
CREATE INDEX "Watchlist_userId_createdAt_idx" ON "Watchlist"("userId", "createdAt");
CREATE INDEX "Watchlist_movieId_idx" ON "Watchlist"("movieId");
CREATE INDEX "Watchlist_tvSeriesId_idx" ON "Watchlist"("tvSeriesId");
CREATE UNIQUE INDEX "Favorite_userId_mediaKey_key" ON "Favorite"("userId", "mediaKey");
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");
CREATE INDEX "WatchHistory_userId_watchedAt_idx" ON "WatchHistory"("userId", "watchedAt");
CREATE INDEX "WatchHistory_mediaKey_idx" ON "WatchHistory"("mediaKey");
CREATE UNIQUE INDEX "PlaybackProgress_userId_mediaKey_key" ON "PlaybackProgress"("userId", "mediaKey");
CREATE INDEX "PlaybackProgress_userId_updatedAt_idx" ON "PlaybackProgress"("userId", "updatedAt");
CREATE UNIQUE INDEX "Playlist_ownerId_sourceUrlHash_key" ON "Playlist"("ownerId", "sourceUrlHash");
CREATE INDEX "Playlist_ownerId_enabled_idx" ON "Playlist"("ownerId", "enabled");
CREATE INDEX "Playlist_enabled_lastSyncAt_idx" ON "Playlist"("enabled", "lastSyncAt");
CREATE INDEX "Playlist_isPublic_idx" ON "Playlist"("isPublic");
CREATE UNIQUE INDEX "PlaylistItem_playlistId_channelKey_key" ON "PlaylistItem"("playlistId", "channelKey");
CREATE INDEX "PlaylistItem_playlistId_groupName_idx" ON "PlaylistItem"("playlistId", "groupName");
CREATE INDEX "PlaylistItem_playlistId_name_idx" ON "PlaylistItem"("playlistId", "name");
CREATE INDEX "PlaylistSyncLog_playlistId_startedAt_idx" ON "PlaylistSyncLog"("playlistId", "startedAt");
CREATE UNIQUE INDEX "MediaSource_sourceUrlHash_key" ON "MediaSource"("sourceUrlHash");
CREATE INDEX "MediaSource_movieId_isActive_idx" ON "MediaSource"("movieId", "isActive");
CREATE INDEX "MediaSource_tvSeriesId_isActive_idx" ON "MediaSource"("tvSeriesId", "isActive");
CREATE INDEX "MediaSource_episodeId_isActive_idx" ON "MediaSource"("episodeId", "isActive");
CREATE UNIQUE INDEX "TranscodingJob_workerJobId_key" ON "TranscodingJob"("workerJobId");
CREATE INDEX "TranscodingJob_userId_createdAt_idx" ON "TranscodingJob"("userId", "createdAt");
CREATE INDEX "TranscodingJob_status_updatedAt_idx" ON "TranscodingJob"("status", "updatedAt");
CREATE UNIQUE INDEX "APIConfiguration_key_key" ON "APIConfiguration"("key");
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "BackgroundJob_status_runAfter_idx" ON "BackgroundJob"("status", "runAfter");
CREATE INDEX "BackgroundJob_type_createdAt_idx" ON "BackgroundJob"("type", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_genreId_genreType_fkey" FOREIGN KEY ("genreId", "genreType") REFERENCES "Genre"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TvGenre" ADD CONSTRAINT "TvGenre_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TvGenre" ADD CONSTRAINT "TvGenre_genreId_genreType_fkey" FOREIGN KEY ("genreId", "genreType") REFERENCES "Genre"("id", "type") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Season" ADD CONSTRAINT "Season_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCredit" ADD CONSTRAINT "MediaCredit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCredit" ADD CONSTRAINT "MediaCredit_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCredit" ADD CONSTRAINT "MediaCredit_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StreamingAvailability" ADD CONSTRAINT "StreamingAvailability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "StreamingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StreamingAvailability" ADD CONSTRAINT "StreamingAvailability_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StreamingAvailability" ADD CONSTRAINT "StreamingAvailability_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_playlistItemId_fkey" FOREIGN KEY ("playlistItemId") REFERENCES "PlaylistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_playlistItemId_fkey" FOREIGN KEY ("playlistItemId") REFERENCES "PlaylistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackProgress" ADD CONSTRAINT "PlaybackProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackProgress" ADD CONSTRAINT "PlaybackProgress_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackProgress" ADD CONSTRAINT "PlaybackProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackProgress" ADD CONSTRAINT "PlaybackProgress_playlistItemId_fkey" FOREIGN KEY ("playlistItemId") REFERENCES "PlaylistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistItem" ADD CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistSyncLog" ADD CONSTRAINT "PlaylistSyncLog_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaSource" ADD CONSTRAINT "MediaSource_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaSource" ADD CONSTRAINT "MediaSource_tvSeriesId_fkey" FOREIGN KEY ("tvSeriesId") REFERENCES "TvSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaSource" ADD CONSTRAINT "MediaSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscodingJob" ADD CONSTRAINT "TranscodingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
