-- Повний журнал читачів і видач. Простіший тригер видач із лабораторної 4 знімається,
-- щоб одна зміна не писалася в audit_log двічі.

DROP TRIGGER IF EXISTS loans_audit_trigger ON loans;

CREATE OR REPLACE FUNCTION comprehensive_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
    v_key TEXT;
    v_old JSONB;
    v_new JSONB;
BEGIN
    v_key := CASE TG_TABLE_NAME
        WHEN 'readers' THEN 'reader_id'
        WHEN 'loans' THEN 'loan_id'
        ELSE 'book_id'
    END;
    IF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        v_id := (v_old ->> v_key)::INTEGER;
        INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, v_id, v_old, NULL);
        RETURN OLD;
    END IF;

    v_new := to_jsonb(NEW);
    v_id := (v_new ->> v_key)::INTEGER;
    IF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
    END IF;
    INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, TG_OP, v_id, v_old, v_new);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_readers_audit ON readers;
CREATE TRIGGER trg_readers_audit
AFTER INSERT OR UPDATE OR DELETE ON readers
FOR EACH ROW
EXECUTE FUNCTION comprehensive_audit_log();

DROP TRIGGER IF EXISTS trg_loans_audit ON loans;
CREATE TRIGGER trg_loans_audit
AFTER INSERT OR UPDATE OR DELETE ON loans
FOR EACH ROW
EXECUTE FUNCTION comprehensive_audit_log();

CREATE OR REPLACE FUNCTION validate_reader_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Некоректний email: %', NEW.email;
    END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone !~ '^\+380[0-9]{9}$' THEN
        RAISE EXCEPTION 'Некоректний телефон (очікується +380 і 9 цифр): %', NEW.phone;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reader ON readers;
CREATE TRIGGER trg_validate_reader
BEFORE INSERT OR UPDATE OF email, phone ON readers
FOR EACH ROW
EXECUTE FUNCTION validate_reader_contact();

UPDATE readers
SET phone = '+380509998877'
WHERE reader_id = 1;

SELECT operation, table_name, record_id, changed_by,
       old_data->>'phone' AS old_phone,
       new_data->>'phone' AS new_phone
FROM audit_log
WHERE table_name = 'readers'
ORDER BY log_id DESC
LIMIT 2;

DO $$
BEGIN
    INSERT INTO readers (first_name, last_name, email, phone, library_card_number)
    VALUES ('Тест', 'Помилка', 'not-an-email', '+380501112233', 'LIB-ERR-1');
    RAISE EXCEPTION 'Тригер не відхилив некоректний email';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Відхилено: %', SQLERRM;
END $$;

DO $$
BEGIN
    INSERT INTO readers (first_name, last_name, email, phone, library_card_number)
    VALUES ('Тест', 'Телефон', 'phone.bad@email.com', '0501112233', 'LIB-ERR-2');
    RAISE EXCEPTION 'Тригер не відхилив некоректний телефон';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Відхилено: %', SQLERRM;
END $$;

SELECT COUNT(*) AS bad_readers_kept
FROM readers
WHERE library_card_number IN ('LIB-ERR-1', 'LIB-ERR-2');
