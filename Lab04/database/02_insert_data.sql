-- Додаткові дані лабораторної 4. Повторний запуск не створює дублікатів ISBN і email.

INSERT INTO authors (first_name, last_name, birth_year, country) VALUES
    ('Сергій', 'Жадан', 1974, 'Україна'),
    ('Юрій', 'Андрухович', 1960, 'Україна'),
    ('Оксана', 'Забужко', 1960, 'Україна')
ON CONFLICT (first_name, last_name, birth_year) DO NOTHING;

INSERT INTO books (isbn, title, author_id, publisher_id, genre_id, publication_year, pages, total_copies, available_copies)
SELECT v.isbn, v.title, a.author_id, p.publisher_id, g.genre_id, v.year, v.pages, v.copies, v.copies
FROM (VALUES
    ('978-966-01-0016-5', 'Ворошиловград', 'Жадан', 'Фоліо', 'Роман', 2010, 448, 4),
    ('978-966-01-0017-2', 'Месопотамія', 'Жадан', 'Наш Формат', 'Роман', 2014, 368, 3),
    ('978-966-01-0018-9', 'Перверзія', 'Андрухович', 'Видавництво Старого Лева', 'Роман', 1996, 320, 3),
    ('978-966-01-0019-6', 'Дванадцять обручів', 'Андрухович', 'Видавництво Старого Лева', 'Роман', 2003, 400, 3),
    ('978-966-01-0020-2', 'Музей покинутих секретів', 'Забужко', 'Наш Формат', 'Роман', 2009, 832, 2)
) AS v(isbn, title, last_name, publisher, genre, year, pages, copies)
JOIN authors a ON a.last_name = v.last_name
JOIN publishers p ON p.name = v.publisher
JOIN genres g ON g.name = v.genre
ON CONFLICT (isbn) DO NOTHING;

INSERT INTO readers (first_name, last_name, email, phone, library_card_number, registration_date, status) VALUES
    ('Марко', 'Савчук', 'marko.savchuk@email.com', '+380501110011', 'LIB-2026-013', '2026-03-01', 'Active'),
    ('Дарина', 'Іваненко', 'daryna.ivanenko@email.com', '+380502220022', 'LIB-2026-014', '2026-03-12', 'Active')
ON CONFLICT (email) DO NOTHING;

INSERT INTO loans (book_id, reader_id, loan_date, due_date, return_date)
SELECT b.book_id, r.reader_id, DATE '2026-10-01', DATE '2026-10-21', NULL
FROM books b
JOIN readers r ON r.library_card_number = 'LIB-2026-013'
WHERE b.isbn = '978-966-01-0016-5'
  AND NOT EXISTS (
      SELECT 1 FROM loans l WHERE l.book_id = b.book_id AND l.reader_id = r.reader_id
  );

UPDATE books b
SET available_copies = total_copies - (
    SELECT COUNT(*) FROM loans l
    WHERE l.book_id = b.book_id AND l.return_date IS NULL
)
WHERE b.isbn IN ('978-966-01-0016-5');

INSERT INTO reservations (book_id, reader_id, reservation_date, expiration_date, status)
SELECT b.book_id, r.reader_id, TIMESTAMP '2026-10-11 10:00', TIMESTAMP '2026-10-25 10:00', 'Active'
FROM books b
JOIN readers r ON r.library_card_number = 'LIB-2026-014'
WHERE b.isbn = '978-966-01-0020-2'
  AND NOT EXISTS (
      SELECT 1 FROM reservations rv WHERE rv.book_id = b.book_id AND rv.reader_id = r.reader_id
  );
