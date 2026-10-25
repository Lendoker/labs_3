CREATE INDEX IF NOT EXISTS idx_circ_book_date
    ON circulation_facts (book_id, event_date);

CREATE INDEX IF NOT EXISTS idx_circ_type_fee_date
    ON circulation_facts (event_type, fee, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_circ_event_date
    ON circulation_facts (event_date);

ANALYZE circulation_facts;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'circulation_facts'
ORDER BY indexname;
