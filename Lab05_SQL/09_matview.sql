CREATE TABLE IF NOT EXISTS maintenance_log (
    log_id SERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    details TEXT,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP MATERIALIZED VIEW IF EXISTS mv_genre_summary;
CREATE MATERIALIZED VIEW mv_genre_summary AS
SELECT
    g.genre_id,
    g.name AS genre,
    COUNT(b.book_id) AS books_count,
    COALESCE(SUM(b.total_copies), 0) AS total_copies,
    COALESCE(SUM(b.available_copies), 0) AS available_copies
FROM genres g
LEFT JOIN books b ON b.genre_id = g.genre_id
GROUP BY g.genre_id, g.name;

CREATE UNIQUE INDEX idx_mv_genre_summary ON mv_genre_summary (genre_id);

CREATE OR REPLACE FUNCTION refresh_genre_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_genre_summary;
    INSERT INTO maintenance_log (operation, details)
    VALUES ('refresh mv_genre_summary', TG_OP || ' ON ' || TG_TABLE_NAME);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_genre_summary ON books;
CREATE TRIGGER trg_refresh_genre_summary
AFTER INSERT OR UPDATE OR DELETE ON books
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_genre_summary();

SELECT genre, books_count, available_copies
FROM mv_genre_summary
WHERE genre = 'Роман';

UPDATE books
SET total_copies = total_copies + 1,
    available_copies = available_copies + 1
WHERE title = 'Собор';

SELECT genre, books_count, available_copies
FROM mv_genre_summary
WHERE genre = 'Роман';

UPDATE books
SET total_copies = total_copies - 1,
    available_copies = available_copies - 1
WHERE title = 'Собор';

SELECT operation, details, executed_at
FROM maintenance_log
ORDER BY log_id DESC
LIMIT 4;
