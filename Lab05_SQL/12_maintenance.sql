CREATE OR REPLACE PROCEDURE maintain_database()
LANGUAGE plpgsql
AS $$
DECLARE
    tbl RECORD;
    v_count INTEGER := 0;
BEGIN
    ANALYZE;
    COMMIT;
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE format('REINDEX TABLE public.%I', tbl.tablename);
        v_count := v_count + 1;
        COMMIT;
    END LOOP;
    INSERT INTO maintenance_log (operation, details)
    VALUES ('ANALYZE + REINDEX', 'tables=' || v_count);
END;
$$;

CALL maintain_database();

SELECT operation, details, executed_at
FROM maintenance_log
WHERE operation = 'ANALYZE + REINDEX'
ORDER BY log_id DESC
LIMIT 1;
