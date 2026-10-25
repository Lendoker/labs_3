DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'report_viewer') THEN
        CREATE USER report_viewer WITH PASSWORD 'report_pass';
    END IF;
END $$;

GRANT CONNECT ON DATABASE library TO report_viewer;
GRANT USAGE ON SCHEMA public TO report_viewer;
GRANT SELECT ON v_books_catalog, v_overdue_loans, v_reader_loan_stats, books, authors, genres TO report_viewer;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM report_viewer;
