-- Перегляд історії і відкат описових полів книги до обраної версії.
-- Тираж не відкочується наосліп: його тримають відкриті видачі.

CREATE OR REPLACE VIEW v_books_change_history AS
SELECT
    a.log_id,
    a.operation,
    a.record_id AS book_id,
    COALESCE(a.new_data->>'title', a.old_data->>'title') AS title,
    CASE
        WHEN a.operation = 'INSERT' THEN 'Додано нову книгу'
        WHEN a.operation = 'DELETE' THEN 'Видалено книгу'
        WHEN a.old_data->>'available_copies' IS DISTINCT FROM a.new_data->>'available_copies'
            THEN 'Доступні примірники: ' || COALESCE(a.old_data->>'available_copies', '?')
                 || ' → ' || COALESCE(a.new_data->>'available_copies', '?')
        WHEN a.old_data->>'title' IS DISTINCT FROM a.new_data->>'title'
            THEN 'Назва: ' || COALESCE(a.old_data->>'title', '') || ' → ' || COALESCE(a.new_data->>'title', '')
        WHEN a.old_data->>'pages' IS DISTINCT FROM a.new_data->>'pages'
            THEN 'Сторінки: ' || COALESCE(a.old_data->>'pages', '') || ' → ' || COALESCE(a.new_data->>'pages', '')
        ELSE 'Оновлено інші поля'
    END AS change_description,
    a.changed_at,
    a.changed_by
FROM audit_log a
WHERE a.table_name = 'books';

CREATE OR REPLACE VIEW v_book_versions AS
SELECT
    v.book_id,
    b.title AS current_title,
    v.version_number,
    v.data->>'title' AS version_title,
    v.data->>'pages' AS version_pages,
    v.valid_from,
    v.valid_to,
    v.created_by,
    (v.valid_to IS NULL) AS is_current
FROM books_versions v
JOIN books b ON b.book_id = v.book_id;

CREATE OR REPLACE FUNCTION get_changes_report(
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE (
    change_date DATE,
    total_changes BIGINT,
    inserts BIGINT,
    updates BIGINT,
    deletes BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(changed_at) AS change_date,
        COUNT(*) AS total_changes,
        COUNT(*) FILTER (WHERE operation = 'INSERT') AS inserts,
        COUNT(*) FILTER (WHERE operation = 'UPDATE') AS updates,
        COUNT(*) FILTER (WHERE operation = 'DELETE') AS deletes
    FROM audit_log
    WHERE changed_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(changed_at)
    ORDER BY change_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION revert_book_to_version(p_book_id INTEGER, p_version INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_data JSONB;
    v_title TEXT;
BEGIN
    SELECT data INTO v_data
    FROM books_versions
    WHERE book_id = p_book_id AND version_number = p_version;

    IF v_data IS NULL THEN
        RAISE EXCEPTION 'Версію % книги % не знайдено', p_version, p_book_id;
    END IF;

    UPDATE books
    SET title = v_data->>'title',
        pages = (v_data->>'pages')::INTEGER,
        publication_year = (v_data->>'publication_year')::INTEGER,
        genre_id = NULLIF(v_data->>'genre_id', '')::INTEGER,
        publisher_id = NULLIF(v_data->>'publisher_id', '')::INTEGER,
        updated_at = CURRENT_TIMESTAMP
    WHERE book_id = p_book_id
    RETURNING title INTO v_title;

    RETURN 'Відновлено описові поля до версії ' || p_version || ': ' || v_title;
END;
$$;

UPDATE books
SET title = 'ТЕСТ ВІДКАТУ'
WHERE book_id = 12
RETURNING book_id, title;

SELECT book_id, version_number, version_title, is_current
FROM v_book_versions
WHERE book_id = 12
ORDER BY version_number;

SELECT revert_book_to_version(12, 1);

SELECT book_id, title FROM books WHERE book_id = 12;

SELECT change_description, changed_by
FROM v_books_change_history
WHERE book_id = 12
ORDER BY log_id;

SELECT * FROM get_changes_report(CURRENT_DATE - INTERVAL '2 days');
