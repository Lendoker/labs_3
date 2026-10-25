-- SAVEPOINT і каскадне видалення бронювань разом із книгою.

BEGIN;

INSERT INTO authors (first_name, last_name, birth_year, country)
VALUES ('Василь', 'Стус', 1938, 'Україна')
RETURNING author_id \gset

SAVEPOINT after_author;

\set ON_ERROR_STOP off
INSERT INTO books (isbn, title, author_id, publisher_id, genre_id, publication_year, pages, total_copies, available_copies)
VALUES ('978-966-01-0001-1', 'Дублікат ISBN', :author_id, 2, 1, 1991, 200, 2, 2);
\set ON_ERROR_STOP on

ROLLBACK TO SAVEPOINT after_author;

INSERT INTO books (isbn, title, author_id, publisher_id, genre_id, publication_year, pages, total_copies, available_copies)
VALUES ('978-966-01-0030-1', 'Палімпсест', :author_id, 2, 1, 1991, 220, 2, 2)
RETURNING book_id, isbn, title;

COMMIT;

SELECT a.last_name, b.title, b.isbn
FROM authors a
JOIN books b ON b.author_id = a.author_id
WHERE a.last_name = 'Стус';

-- Каскад: книга -> бронювання ON DELETE CASCADE.
BEGIN;

INSERT INTO authors (first_name, last_name, birth_year, country)
VALUES ('Тестовий', 'Автор', 1900, 'Україна')
RETURNING author_id \gset

INSERT INTO books (isbn, title, author_id, publisher_id, genre_id, publication_year, pages, total_copies, available_copies)
VALUES ('978-966-00-0099-9', 'Тестова книга для каскаду', :author_id, 1, 6, 2000, 40, 1, 1)
RETURNING book_id \gset

INSERT INTO reservations (book_id, reader_id, reservation_date, expiration_date, status)
VALUES (:book_id, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Active')
RETURNING reservation_id, book_id;

COMMIT;

SELECT b.book_id, b.title, r.reservation_id, r.status
FROM books b
LEFT JOIN reservations r ON r.book_id = b.book_id
WHERE b.isbn = '978-966-00-0099-9';

DELETE FROM books WHERE isbn = '978-966-00-0099-9'
RETURNING book_id, title;

SELECT COUNT(*) AS reservations_left_for_deleted_book
FROM reservations r
WHERE NOT EXISTS (SELECT 1 FROM books b WHERE b.book_id = r.book_id);

DELETE FROM authors WHERE last_name = 'Автор' AND first_name = 'Тестовий'
RETURNING author_id, last_name;
