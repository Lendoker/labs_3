-- Три запити, які порівнюються через EXPLAIN (ANALYZE, BUFFERS) до і після індексів.

-- Q1. Події однієї книги за конкретний день
SELECT book_id, event_type, fee
FROM circulation_facts
WHERE book_id = (SELECT MIN(book_id) FROM books)
  AND event_date = DATE '2024-06-01'
ORDER BY fact_id;

-- Q2. Прострочення з внеском 94
SELECT fact_id, reader_id, event_date, fee
FROM circulation_facts
WHERE event_type = 'overdue' AND fee = 7
ORDER BY event_date DESC
LIMIT 25;

-- Q3. Обіг за один день
SELECT event_date, COUNT(*) AS cnt, SUM(fee) AS fee_sum
FROM circulation_facts
WHERE event_date = DATE '2023-06-15'
GROUP BY event_date;
