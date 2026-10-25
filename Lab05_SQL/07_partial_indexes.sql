CREATE INDEX IF NOT EXISTS idx_circ_overdue_reader
    ON circulation_facts (reader_id, event_date)
    WHERE event_type = 'overdue';

CREATE INDEX IF NOT EXISTS idx_loans_open_due
    ON loans (due_date)
    WHERE return_date IS NULL;

ANALYZE circulation_facts;
ANALYZE loans;

SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef ILIKE '%WHERE%'
ORDER BY indexname;
