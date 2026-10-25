-- Ролі admin / librarian / reader. Паролі навчальні, лише для локального контейнера.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_library_admin') THEN
        CREATE ROLE role_library_admin NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_librarian') THEN
        CREATE ROLE role_librarian NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_reader') THEN
        CREATE ROLE role_reader NOLOGIN;
    END IF;
END $$;

GRANT CONNECT ON DATABASE library TO role_library_admin, role_librarian, role_reader;
GRANT USAGE ON SCHEMA public TO role_library_admin, role_librarian, role_reader;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO role_library_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO role_library_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO role_library_admin;

GRANT SELECT, INSERT, UPDATE ON books, loans, reservations, readers TO role_librarian;
GRANT DELETE ON reservations TO role_librarian;
GRANT SELECT ON authors, genres, publishers, audit_log, books_versions, v_books_change_history, v_book_versions TO role_librarian;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO role_librarian;
GRANT EXECUTE ON FUNCTION issue_loan(integer, integer, integer) TO role_librarian;
GRANT EXECUTE ON FUNCTION return_loan(integer) TO role_librarian;
GRANT EXECUTE ON FUNCTION extend_loan(integer, integer) TO role_librarian;
GRANT EXECUTE ON FUNCTION execute_scheduled_operations() TO role_librarian;

GRANT SELECT ON books, authors, genres, publishers TO role_reader;

REVOKE ALL ON FUNCTION issue_loan(integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION return_loan(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION extend_loan(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION execute_scheduled_operations() FROM PUBLIC;
REVOKE ALL ON FUNCTION revert_book_to_version(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_book_version(integer, timestamp without time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_changes_report(timestamp without time zone, timestamp without time zone) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION issue_loan(integer, integer, integer) TO role_librarian, role_library_admin;
GRANT EXECUTE ON FUNCTION return_loan(integer) TO role_librarian, role_library_admin;
GRANT EXECUTE ON FUNCTION extend_loan(integer, integer) TO role_librarian, role_library_admin;
GRANT EXECUTE ON FUNCTION execute_scheduled_operations() TO role_library_admin;
GRANT EXECUTE ON FUNCTION revert_book_to_version(integer, integer) TO role_library_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO role_library_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO role_library_admin;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_demo') THEN
        CREATE USER admin_demo WITH PASSWORD 'admin_pass';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'librarian_demo') THEN
        CREATE USER librarian_demo WITH PASSWORD 'librarian_pass';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reader_demo') THEN
        CREATE USER reader_demo WITH PASSWORD 'reader_pass';
    END IF;
END $$;

GRANT role_library_admin TO admin_demo;
GRANT role_librarian TO librarian_demo;
GRANT role_reader TO reader_demo;
ALTER ROLE admin_demo INHERIT;
ALTER ROLE librarian_demo INHERIT;
ALTER ROLE reader_demo INHERIT;

-- restore_from_backup ще не створена на цьому кроці: відкликання нижче в 10_checkpoint.sql.
