-- Тригер 1: час зміни книги. Тригер 2: журнал видач.
-- Аудит і версіонування книг уже створені в лабораторній 3.

CREATE OR REPLACE FUNCTION touch_book_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS books_touch_updated_at ON books;
CREATE TRIGGER books_touch_updated_at
BEFORE UPDATE ON books
FOR EACH ROW
EXECUTE FUNCTION touch_book_updated_at();

CREATE OR REPLACE FUNCTION log_loan_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, new_data)
        VALUES ('loans', 'INSERT', NEW.loan_id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data)
        VALUES ('loans', 'UPDATE', NEW.loan_id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data)
        VALUES ('loans', 'DELETE', OLD.loan_id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS loans_audit_trigger ON loans;
CREATE TRIGGER loans_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON loans
FOR EACH ROW
EXECUTE FUNCTION log_loan_changes();

UPDATE loans
SET due_date = due_date
WHERE loan_id = (SELECT MIN(loan_id) FROM loans WHERE return_date IS NOT NULL);

SELECT operation, record_id, changed_by
FROM audit_log
WHERE table_name = 'loans'
ORDER BY log_id DESC
LIMIT 3;
