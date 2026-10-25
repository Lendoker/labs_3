CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE TABLE IF NOT EXISTS circulation_facts (
    fact_id BIGSERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(book_id),
    reader_id INTEGER NOT NULL REFERENCES readers(reader_id),
    event_date DATE NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('loan', 'return', 'overdue', 'fine')),
    fee NUMERIC(10,2) NOT NULL CHECK (fee >= 0)
);

DO $$
DECLARE
    bids INTEGER[] := ARRAY(SELECT book_id FROM books ORDER BY book_id);
    rids INTEGER[] := ARRAY(SELECT reader_id FROM readers ORDER BY reader_id);
    nb INTEGER := array_length(bids, 1);
    nr INTEGER := array_length(rids, 1);
BEGIN
    IF (SELECT COUNT(*) FROM circulation_facts) > 0 THEN
        RAISE NOTICE 'circulation_facts already loaded';
        RETURN;
    END IF;
    INSERT INTO circulation_facts (book_id, reader_id, event_date, event_type, fee)
    SELECT
        bids[1 + (g % nb)],
        rids[1 + ((g / 3) % nr)],
        DATE '2022-01-01' + (g % 1400),
        (ARRAY['loan', 'return', 'overdue', 'fine'])[1 + (g % 4)],
        (5 + (g % 90))::NUMERIC(10,2)
    FROM generate_series(1, 100000) AS g;
END $$;

ANALYZE circulation_facts;

SELECT COUNT(*) AS circulation_rows,
       COUNT(*) FILTER (WHERE event_type = 'overdue') AS overdue_rows,
       MIN(event_date) AS min_date,
       MAX(event_date) AS max_date
FROM circulation_facts;
