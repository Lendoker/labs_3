-- Безпечні UPDATE/DELETE і транзакції з COMMIT та ROLLBACK.

-- Перевірка перед оновленням. Один примірник «Марусі Чурай» списується на реставрацію.
SELECT book_id, title, available_copies
FROM books
WHERE book_id = 12;

UPDATE books
SET available_copies = available_copies - 1,
    updated_at = CURRENT_TIMESTAMP
WHERE book_id = 12 AND available_copies > 0
RETURNING book_id, title, available_copies;

-- Видача книги як одна транзакція
BEGIN;

INSERT INTO loans (book_id, reader_id, loan_date, due_date)
VALUES (15, 4, CURRENT_DATE, CURRENT_DATE + 14)
RETURNING loan_id, book_id, reader_id, due_date;

UPDATE books
SET available_copies = available_copies - 1,
    updated_at = CURRENT_TIMESTAMP
WHERE book_id = 15 AND available_copies > 0
RETURNING book_id, title, available_copies;

COMMIT;

-- Помилка цілісності: available_copies > total_copies. Транзакція відкочується.
\set ON_ERROR_STOP off
BEGIN;
INSERT INTO books (isbn, title, author_id, publisher_id, genre_id, publication_year, pages, total_copies, available_copies)
VALUES ('978-966-01-0099-1', 'Некоректний тираж', 1, 1, 1, 2020, 100, 1, 5);
ROLLBACK;
\set ON_ERROR_STOP on

SELECT isbn FROM books WHERE isbn = '978-966-01-0099-1';

-- Видалення автора, у якого є книги: FK RESTRICT, потім ROLLBACK.
\set ON_ERROR_STOP off
BEGIN;
DELETE FROM authors WHERE author_id = 1;
ROLLBACK;
\set ON_ERROR_STOP on

SELECT author_id, first_name, last_name FROM authors WHERE author_id = 1;

-- Безпечне видалення неактивного читача без відкритих видач.
SELECT reader_id, last_name, status
FROM readers
WHERE status = 'Inactive'
  AND reader_id NOT IN (
      SELECT reader_id FROM loans WHERE return_date IS NULL
  );

DELETE FROM readers
WHERE status = 'Inactive'
  AND reader_id NOT IN (
      SELECT reader_id FROM loans WHERE return_date IS NULL
  )
RETURNING reader_id, last_name, library_card_number;
