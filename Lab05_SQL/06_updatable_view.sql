DROP VIEW IF EXISTS v_reader_contacts;
CREATE VIEW v_reader_contacts AS
SELECT reader_id, first_name, last_name, email, phone, status
FROM readers
WHERE status <> 'Inactive';

CREATE RULE v_reader_contacts_update AS
ON UPDATE TO v_reader_contacts
DO INSTEAD
    UPDATE readers
    SET email = NEW.email,
        phone = NEW.phone,
        status = NEW.status
    WHERE reader_id = OLD.reader_id;

UPDATE v_reader_contacts
SET phone = '+380501234567'
WHERE reader_id = 1;

SELECT reader_id, last_name, phone, email
FROM v_reader_contacts
WHERE reader_id = 1;

SELECT reader_id, phone FROM readers WHERE reader_id = 1;
