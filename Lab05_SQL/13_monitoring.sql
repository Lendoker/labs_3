-- Індекси без звернень
SELECT relname AS table_name,
       indexrelname AS index_name,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY relname, indexrelname;

-- Найчастіше використані індекси
SELECT relname AS table_name,
       indexrelname AS index_name,
       idx_scan,
       idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC, relname
LIMIT 12;

-- Найповільніші оператори з pg_stat_statements
SELECT calls,
       ROUND(total_exec_time::numeric, 2) AS total_ms,
       ROUND(mean_exec_time::numeric, 2) AS mean_ms,
       ROUND(max_exec_time::numeric, 2) AS max_ms,
       LEFT(regexp_replace(query, '\s+', ' ', 'g'), 160) AS query
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
  AND query NOT ILIKE '%pg_stat_user_indexes%'
ORDER BY mean_exec_time DESC
LIMIT 8;

SELECT relname AS table_name,
       seq_scan,
       idx_scan,
       n_live_tup,
       n_tup_ins,
       n_tup_upd
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC, relname
LIMIT 12;
