-- Optional performance index for page, referrer, and visitor breakdowns.
-- Run separately after restoring the database, outside a transaction.
CREATE INDEX CONCURRENTLY "website_event_pageview_cover_idx"
ON "website_event"("website_id", "created_at")
INCLUDE ("session_id", "url_path", "url_query", "referrer_domain", "hostname")
WHERE "event_type" NOT IN (2, 5);
