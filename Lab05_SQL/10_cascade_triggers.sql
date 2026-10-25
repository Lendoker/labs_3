CREATE TABLE IF NOT EXISTS reservation_events (
    event_id SERIAL PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    reader_id INTEGER NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION cancel_reservations_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'Blocked' AND OLD.status IS DISTINCT FROM 'Blocked' THEN
        UPDATE reservations
        SET status = 'Cancelled'
        WHERE reader_id = NEW.reader_id
          AND status = 'Active';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_on_block ON readers;
CREATE TRIGGER trg_cancel_on_block
AFTER UPDATE OF status ON readers
FOR EACH ROW
EXECUTE FUNCTION cancel_reservations_on_block();

CREATE OR REPLACE FUNCTION log_reservation_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'Cancelled' AND OLD.status IS DISTINCT FROM 'Cancelled' THEN
        INSERT INTO reservation_events (reservation_id, reader_id, event_type)
        VALUES (NEW.reservation_id, NEW.reader_id, 'cancelled');
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservation_cancel_event ON reservations;
CREATE TRIGGER trg_reservation_cancel_event
AFTER UPDATE OF status ON reservations
FOR EACH ROW
EXECUTE FUNCTION log_reservation_cancel();

INSERT INTO readers (first_name, last_name, email, phone, library_card_number, status)
VALUES ('Каскад', 'Демо', 'cascade.demo@email.com', '+380501010101', 'LIB-CASCADE-1', 'Active')
RETURNING reader_id \gset

INSERT INTO reservations (book_id, reader_id, reservation_date, expiration_date, status)
VALUES (
    (SELECT book_id FROM books WHERE isbn = '978-966-01-0015-8'),
    :reader_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    'Active'
)
RETURNING reservation_id \gset

UPDATE readers SET status = 'Blocked' WHERE reader_id = :reader_id;

SELECT r.reader_id, r.status AS reader_status, rv.reservation_id, rv.status AS reservation_status
FROM readers r
JOIN reservations rv ON rv.reader_id = r.reader_id
WHERE r.reader_id = :reader_id;

SELECT event_id, reservation_id, reader_id, event_type
FROM reservation_events
WHERE reservation_id = :reservation_id;
