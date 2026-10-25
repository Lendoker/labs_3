CREATE OR REPLACE VIEW v_books_catalog AS
SELECT
    b.book_id,
    b.isbn,
    b.title,
    b.publication_year,
    b.pages,
    b.total_copies,
    b.available_copies,
    a.author_id,
    a.first_name || ' ' || a.last_name AS author_name,
    a.country AS author_country,
    p.publisher_id,
    p.name AS publisher_name,
    g.genre_id,
    g.name AS genre_name
FROM books b
JOIN authors a ON a.author_id = b.author_id
LEFT JOIN publishers p ON p.publisher_id = b.publisher_id
LEFT JOIN genres g ON g.genre_id = b.genre_id;

CREATE OR REPLACE VIEW v_active_loans AS
SELECT
    l.loan_id,
    l.loan_date,
    l.due_date,
    l.return_date,
    b.book_id,
    b.title,
    r.reader_id,
    r.first_name || ' ' || r.last_name AS reader_name,
    r.library_card_number,
    (l.return_date IS NULL AND l.due_date < CURRENT_DATE) AS is_overdue
FROM loans l
JOIN books b ON b.book_id = l.book_id
JOIN readers r ON r.reader_id = l.reader_id
WHERE l.return_date IS NULL;

SELECT genre_name, COUNT(*) AS books_count
FROM v_books_catalog
GROUP BY genre_name
ORDER BY books_count DESC, genre_name;

SELECT COUNT(*) AS open_loans, COUNT(*) FILTER (WHERE is_overdue) AS overdue_loans
FROM v_active_loans;
