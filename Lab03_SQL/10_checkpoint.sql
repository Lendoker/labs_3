-- Контрольна точка (JSON-знімок) і відновлення таблиць бібліотеки.

CREATE OR REPLACE FUNCTION create_backup_point(p_name VARCHAR, p_description TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_backup_id INTEGER;
    v_snapshot JSONB;
BEGIN
    SELECT jsonb_build_object(
        'genres', COALESCE((SELECT jsonb_agg(to_jsonb(g)) FROM genres g), '[]'::jsonb),
        'publishers', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM publishers p), '[]'::jsonb),
        'authors', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM authors a), '[]'::jsonb),
        'books', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM books b), '[]'::jsonb),
        'readers', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM readers r), '[]'::jsonb),
        'loans', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM loans l), '[]'::jsonb),
        'reservations', COALESCE((SELECT jsonb_agg(to_jsonb(rv)) FROM reservations rv), '[]'::jsonb)
    ) INTO v_snapshot;

    INSERT INTO backup_points (backup_name, description, data_snapshot)
    VALUES (p_name, p_description, v_snapshot)
    RETURNING backup_id INTO v_backup_id;
    RETURN v_backup_id;
END;
$$;

CREATE OR REPLACE FUNCTION restore_from_backup(p_backup_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_snapshot JSONB;
    r RECORD;
BEGIN
    SELECT data_snapshot INTO v_snapshot
    FROM backup_points
    WHERE backup_id = p_backup_id;

    IF v_snapshot IS NULL THEN
        RAISE EXCEPTION 'Контрольну точку % не знайдено', p_backup_id;
    END IF;

    FOR r IN
        SELECT c.relname AS table_name, t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND NOT t.tgisinternal
          AND c.relname IN ('books', 'loans', 'readers', 'reservations', 'authors')
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', r.table_name, r.tgname);
    END LOOP;

    TRUNCATE TABLE loans, reservations, books, readers, authors, publishers, genres RESTART IDENTITY CASCADE;

    INSERT INTO genres SELECT * FROM jsonb_populate_recordset(NULL::genres, v_snapshot->'genres');
    INSERT INTO publishers SELECT * FROM jsonb_populate_recordset(NULL::publishers, v_snapshot->'publishers');
    INSERT INTO authors SELECT * FROM jsonb_populate_recordset(NULL::authors, v_snapshot->'authors');
    INSERT INTO readers SELECT * FROM jsonb_populate_recordset(NULL::readers, v_snapshot->'readers');
    INSERT INTO books SELECT * FROM jsonb_populate_recordset(NULL::books, v_snapshot->'books');
    INSERT INTO loans SELECT * FROM jsonb_populate_recordset(NULL::loans, v_snapshot->'loans');
    INSERT INTO reservations SELECT * FROM jsonb_populate_recordset(NULL::reservations, v_snapshot->'reservations');

    PERFORM setval(pg_get_serial_sequence('genres', 'genre_id'), GREATEST((SELECT COALESCE(MAX(genre_id), 1) FROM genres), 1));
    PERFORM setval(pg_get_serial_sequence('publishers', 'publisher_id'), GREATEST((SELECT COALESCE(MAX(publisher_id), 1) FROM publishers), 1));
    PERFORM setval(pg_get_serial_sequence('authors', 'author_id'), GREATEST((SELECT COALESCE(MAX(author_id), 1) FROM authors), 1));
    PERFORM setval(pg_get_serial_sequence('readers', 'reader_id'), GREATEST((SELECT COALESCE(MAX(reader_id), 1) FROM readers), 1));
    PERFORM setval(pg_get_serial_sequence('books', 'book_id'), GREATEST((SELECT COALESCE(MAX(book_id), 1) FROM books), 1));
    PERFORM setval(pg_get_serial_sequence('loans', 'loan_id'), GREATEST((SELECT COALESCE(MAX(loan_id), 1) FROM loans), 1));
    PERFORM setval(pg_get_serial_sequence('reservations', 'reservation_id'), GREATEST((SELECT COALESCE(MAX(reservation_id), 1) FROM reservations), 1));

    FOR r IN
        SELECT c.relname AS table_name, t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND NOT t.tgisinternal
          AND c.relname IN ('books', 'loans', 'readers', 'reservations', 'authors')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I', r.table_name, r.tgname);
    END LOOP;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION create_backup_point(character varying, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION restore_from_backup(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_backup_point(character varying, text) TO role_library_admin;
GRANT EXECUTE ON FUNCTION restore_from_backup(integer) TO role_library_admin;

SELECT create_backup_point('before_damage', 'Знімок перед навмисною зміною назви') AS backup_id \gset

UPDATE books SET title = 'ПОШКОДЖЕНА НАЗВА' WHERE book_id = 1
RETURNING book_id, title;

SELECT restore_from_backup(:backup_id) AS restored;

SELECT book_id, title FROM books WHERE book_id = 1;

SELECT
    (SELECT COUNT(*) FROM authors) AS authors,
    (SELECT COUNT(*) FROM books) AS books,
    (SELECT COUNT(*) FROM readers) AS readers,
    (SELECT COUNT(*) FROM loans) AS loans,
    (SELECT COUNT(*) FROM reservations) AS reservations,
    (SELECT COUNT(*) FROM backup_points) AS backup_points;

SET ROLE admin_demo;
SELECT create_backup_point('admin_role_check', 'Контрольна точка від ролі адміністратора') AS admin_backup;
RESET ROLE;
