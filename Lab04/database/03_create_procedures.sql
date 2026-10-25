-- Ті самі бізнес-процедури, що й у лабораторній 3: видача, повернення, продовження.
-- CREATE OR REPLACE залишає одну версію функції в спільній базі library.

CREATE OR REPLACE FUNCTION issue_loan(
    p_book_id INTEGER,
    p_reader_id INTEGER,
    p_days INTEGER DEFAULT 14
)
RETURNS TABLE (success BOOLEAN, message TEXT, loan_id INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_available INTEGER;
    v_loan_id INTEGER;
BEGIN
    IF p_days < 1 OR p_days > 60 THEN
        RETURN QUERY SELECT FALSE, 'Термін видачі має бути від 1 до 60 днів'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;

    SELECT status INTO v_status FROM readers WHERE reader_id = p_reader_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Читача не знайдено'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    IF v_status <> 'Active' THEN
        RETURN QUERY SELECT FALSE, 'Читач не має статусу Active'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;

    SELECT available_copies INTO v_available
    FROM books WHERE book_id = p_book_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Книгу не знайдено'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;
    IF v_available <= 0 THEN
        RETURN QUERY SELECT FALSE, 'Немає вільних примірників'::TEXT, NULL::INTEGER;
        RETURN;
    END IF;

    INSERT INTO loans (book_id, reader_id, loan_date, due_date)
    VALUES (p_book_id, p_reader_id, CURRENT_DATE, CURRENT_DATE + p_days)
    RETURNING loans.loan_id INTO v_loan_id;

    UPDATE books
    SET available_copies = available_copies - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE book_id = p_book_id;

    RETURN QUERY SELECT TRUE, 'Книгу видано'::TEXT, v_loan_id;
END;
$$;

CREATE OR REPLACE FUNCTION return_loan(p_loan_id INTEGER)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_book_id INTEGER;
BEGIN
    SELECT book_id INTO v_book_id
    FROM loans
    WHERE loan_id = p_loan_id AND return_date IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Відкриту видачу не знайдено'::TEXT;
        RETURN;
    END IF;

    UPDATE loans SET return_date = CURRENT_DATE WHERE loan_id = p_loan_id;

    UPDATE books
    SET available_copies = LEAST(total_copies, available_copies + 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE book_id = v_book_id;

    RETURN QUERY SELECT TRUE, 'Книгу повернено'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION extend_loan(
    p_loan_id INTEGER,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (success BOOLEAN, message TEXT, new_due_date DATE)
LANGUAGE plpgsql
AS $$
DECLARE
    v_reader_id INTEGER;
    v_status VARCHAR(20);
    v_due DATE;
    v_overdue INTEGER;
BEGIN
    SELECT l.reader_id, r.status, l.due_date
    INTO v_reader_id, v_status, v_due
    FROM loans l
    JOIN readers r ON r.reader_id = l.reader_id
    WHERE l.loan_id = p_loan_id AND l.return_date IS NULL
    FOR UPDATE OF l;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Відкриту видачу не знайдено'::TEXT, NULL::DATE;
        RETURN;
    END IF;
    IF v_status = 'Blocked' THEN
        RETURN QUERY SELECT FALSE, 'Читач заблокований'::TEXT, NULL::DATE;
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_overdue
    FROM loans
    WHERE reader_id = v_reader_id
      AND return_date IS NULL
      AND due_date < CURRENT_DATE;

    IF v_overdue > 0 THEN
        RETURN QUERY SELECT FALSE, 'У читача є прострочені книги'::TEXT, NULL::DATE;
        RETURN;
    END IF;

    UPDATE loans
    SET due_date = due_date + p_days
    WHERE loan_id = p_loan_id
    RETURNING due_date INTO v_due;

    RETURN QUERY SELECT TRUE, 'Термін продовжено'::TEXT, v_due;
END;
$$;
