-- Відкладені операції: процедура виконує ті, чий час настав.

CREATE OR REPLACE FUNCTION execute_scheduled_operations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_operation RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_operation IN
        SELECT * FROM scheduled_operations
        WHERE status = 'Pending' AND scheduled_for <= CURRENT_TIMESTAMP
        ORDER BY scheduled_for, operation_id
        FOR UPDATE
    LOOP
        BEGIN
            CASE v_operation.operation_type
                WHEN 'UPDATE_BOOK_STATUS' THEN
                    UPDATE books
                    SET available_copies = (v_operation.operation_data->>'available_copies')::INTEGER,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE book_id = (v_operation.operation_data->>'book_id')::INTEGER;
                WHEN 'EXPIRE_RESERVATION' THEN
                    UPDATE reservations
                    SET status = 'Expired'
                    WHERE reservation_id = (v_operation.operation_data->>'reservation_id')::INTEGER
                      AND status = 'Active';
                WHEN 'BLOCK_READER' THEN
                    UPDATE readers
                    SET status = 'Blocked'
                    WHERE reader_id = (v_operation.operation_data->>'reader_id')::INTEGER;
                ELSE
                    RAISE EXCEPTION 'Невідомий тип операції: %', v_operation.operation_type;
            END CASE;

            UPDATE scheduled_operations
            SET status = 'Executed', executed_at = CURRENT_TIMESTAMP, error_message = NULL
            WHERE operation_id = v_operation.operation_id;
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            UPDATE scheduled_operations
            SET status = 'Failed',
                executed_at = CURRENT_TIMESTAMP,
                error_message = SQLERRM
            WHERE operation_id = v_operation.operation_id;
        END;
    END LOOP;
    RETURN v_count;
END;
$$;

INSERT INTO scheduled_operations (operation_type, target_table, operation_data, scheduled_for)
SELECT 'EXPIRE_RESERVATION', 'reservations',
       jsonb_build_object('reservation_id', reservation_id),
       CURRENT_TIMESTAMP - INTERVAL '1 minute'
FROM reservations
WHERE status = 'Active'
ORDER BY reservation_id
LIMIT 1;

INSERT INTO scheduled_operations (operation_type, target_table, operation_data, scheduled_for)
VALUES (
    'UPDATE_BOOK_STATUS',
    'books',
    '{"book_id": "не-число", "available_copies": 1}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 minute'
);

INSERT INTO scheduled_operations (operation_type, target_table, operation_data, scheduled_for)
VALUES (
    'BLOCK_READER',
    'readers',
    jsonb_build_object('reader_id', 12),
    CURRENT_TIMESTAMP + INTERVAL '2 days'
);

SELECT execute_scheduled_operations() AS executed_now;

SELECT operation_id, operation_type, status, scheduled_for < CURRENT_TIMESTAMP AS due,
       error_message
FROM scheduled_operations
ORDER BY operation_id;

SELECT reservation_id, status
FROM reservations
WHERE reservation_id = (
    SELECT (operation_data->>'reservation_id')::INTEGER
    FROM scheduled_operations
    WHERE operation_type = 'EXPIRE_RESERVATION'
    ORDER BY operation_id DESC
    LIMIT 1
);
