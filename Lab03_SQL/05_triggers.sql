-- Аудит книг і версіонування кожного INSERT/UPDATE.

CREATE OR REPLACE FUNCTION log_books_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, new_data)
        VALUES ('books', 'INSERT', NEW.book_id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data)
        VALUES ('books', 'UPDATE', NEW.book_id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data)
        VALUES ('books', 'DELETE', OLD.book_id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS books_audit_trigger ON books;
CREATE TRIGGER books_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON books
FOR EACH ROW
EXECUTE FUNCTION log_books_changes();

CREATE OR REPLACE FUNCTION create_book_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_version_number INTEGER;
BEGIN
    UPDATE books_versions
    SET valid_to = CURRENT_TIMESTAMP
    WHERE book_id = NEW.book_id AND valid_to IS NULL;

    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM books_versions
    WHERE book_id = NEW.book_id;

    INSERT INTO books_versions (book_id, version_number, data)
    VALUES (NEW.book_id, v_version_number, to_jsonb(NEW));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS book_versioning_trigger ON books;
CREATE TRIGGER book_versioning_trigger
AFTER INSERT OR UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION create_book_version();

-- Початкові версії для вже наявних книг (тригер їх не бачив).
INSERT INTO books_versions (book_id, version_number, data)
SELECT b.book_id, 1, to_jsonb(b)
FROM books b
WHERE NOT EXISTS (
    SELECT 1 FROM books_versions v WHERE v.book_id = b.book_id
);

CREATE OR REPLACE FUNCTION get_book_version(p_book_id INTEGER, p_date TIMESTAMP)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT data
        FROM books_versions
        WHERE book_id = p_book_id
          AND valid_from <= p_date
          AND (valid_to IS NULL OR valid_to > p_date)
        ORDER BY version_number DESC
        LIMIT 1
    );
END;
$$;

-- Перевірка тригера аудиту й нової версії.
UPDATE books
SET pages = pages + 2
WHERE book_id = 3
RETURNING book_id, title, pages;

SELECT log_id, operation, record_id,
       old_data->>'pages' AS old_pages,
       new_data->>'pages' AS new_pages,
       changed_by
FROM audit_log
WHERE table_name = 'books' AND record_id = 3
ORDER BY log_id DESC
LIMIT 3;

SELECT book_id, version_number, valid_from IS NOT NULL AS has_from, valid_to IS NULL AS is_current,
       data->>'title' AS title, data->>'pages' AS pages
FROM books_versions
WHERE book_id = 3
ORDER BY version_number;
