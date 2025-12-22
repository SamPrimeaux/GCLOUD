-- List All R2 Buckets with Statistics
-- Run with: npx wrangler d1 execute MEAUXOS_DB --local --file=scripts/list-all-buckets.sql

SELECT
  bucket_name,
  binding_name,
  description,
  object_count,
  ROUND(total_size_bytes / 1024.0 / 1024.0, 2) as size_mb,
  created_at,
  is_public
FROM r2_buckets
ORDER BY bucket_name;

-- Summary
SELECT
  COUNT(*) as total_buckets,
  SUM(object_count) as total_objects,
  ROUND(SUM(total_size_bytes) / 1024.0 / 1024.0 / 1024.0, 2) as total_size_gb
FROM r2_buckets;
