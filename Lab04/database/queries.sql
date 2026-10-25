-- 1. Фільтр і сортування
SELECT title, publication_year, available_copies
FROM books
WHERE publication_year >= 1900
ORDER BY publication_year DESC, title;

-- 2. JOIN автор + видавництво
SELECT b.title, a.last_name, p.name AS publisher, p.city
FROM books b
JOIN authors a ON a.author_id = b.author_id
JOIN publishers p ON p.publisher_id = b.publisher_id
WHERE a.country = 'Україна'
ORDER BY a.last_name, b.title;

-- 3. Агрегація за жанром
SELECT g.name AS genre, COUNT(b.book_id) AS books_count,
       ROUND(AVG(b.pages), 1) AS avg_pages,
       SUM(b.available_copies) AS available
FROM genres g
LEFT JOIN books b ON b.genre_id = g.genre_id
GROUP BY g.genre_id, g.name
HAVING COUNT(b.book_id) > 0
ORDER BY books_count DESC, g.name;

-- 4. Підзапит: книги з тиражем вище середнього
SELECT title, total_copies
FROM books
WHERE total_copies > (SELECT AVG(total_copies) FROM books)
ORDER BY total_copies DESC, title;

-- 5. Кілька JOIN: відкриті видачі
SELECT l.loan_id, b.title, r.last_name AS reader, l.due_date,
       CASE WHEN l.due_date < CURRENT_DATE THEN 'прострочено' ELSE 'вчасно' END AS state
FROM loans l
JOIN books b ON b.book_id = l.book_id
JOIN readers r ON r.reader_id = l.reader_id
JOIN authors a ON a.author_id = b.author_id
WHERE l.return_date IS NULL
ORDER BY l.due_date, b.title;

-- 6. Агрегат: видачі на читача
SELECT r.last_name, r.first_name,
       COUNT(l.loan_id) AS loans_total,
       COUNT(l.loan_id) FILTER (WHERE l.return_date IS NULL) AS still_open
FROM readers r
LEFT JOIN loans l ON l.reader_id = r.reader_id
GROUP BY r.reader_id, r.last_name, r.first_name
ORDER BY loans_total DESC, r.last_name;

-- 7. Агрегат: бронювання за статусом
SELECT status, COUNT(*) AS reservations_count
FROM reservations
GROUP BY status
ORDER BY reservations_count DESC;

-- 8. Агрегат: видачі за місяцем
SELECT TO_CHAR(DATE_TRUNC('month', loan_date), 'YYYY-MM') AS month,
       COUNT(*) AS loans_count
FROM loans
GROUP BY DATE_TRUNC('month', loan_date)
ORDER BY DATE_TRUNC('month', loan_date);
