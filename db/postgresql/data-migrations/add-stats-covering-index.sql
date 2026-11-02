-- Optional performance index. Run separately after backups and database migration
-- finish, outside a transaction. Long-running snapshots can delay validation, so
-- this must not block application startup through Prisma migrate deploy.
CREATE INDEX CONCURRENTLY "website_event_stats_cover_idx"
ON "website_event"("website_id", "created_at", "session_id", "visit_id", "event_type");
