CREATE OR REPLACE VIEW v_overdue_loans AS
SELECT
    loan_id,
    book_id,
    title,
    reader_id,
    reader_name,
    library_card_number,
    loan_date,
    due_date,
    (CURRENT_DATE - due_date) AS days_overdue
FROM v_active_loans
WHERE is_overdue;

CREATE OR REPLACE VIEW v_reader_loan_stats AS
SELECT
    r.reader_id,
    r.first_name || ' ' || r.last_name AS reader_name,
    r.status,
    COUNT(l.loan_id) AS loans_total,
    COUNT(l.loan_id) FILTER (WHERE l.return_date IS NULL) AS open_loans,
    COUNT(l.loan_id) FILTER (WHERE l.return_date IS NULL AND l.due_date < CURRENT_DATE) AS overdue_loans
FROM readers r
LEFT JOIN loans l ON l.reader_id = r.reader_id
GROUP BY r.reader_id, r.first_name, r.last_name, r.status;

SELECT COUNT(*) AS overdue_now FROM v_overdue_loans;

SELECT reader_name, loans_total, open_loans, overdue_loans
FROM v_reader_loan_stats
ORDER BY overdue_loans DESC, loans_total DESC
LIMIT 8;
