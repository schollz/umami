-- Keep all columns in the Prisma schema so migrations retain the covering index.
-- Build concurrently to allow event collection to continue during deployment.
CREATE INDEX CONCURRENTLY "website_event_stats_cover_idx"
ON "website_event"("website_id", "created_at", "session_id", "visit_id", "event_type");
