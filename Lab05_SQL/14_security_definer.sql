-- Тригери пишуть у службові таблиці. Без SECURITY DEFINER модератор отримує
-- permission denied for table books_versions, хоча UPDATE books йому дозволений.

ALTER FUNCTION create_book_version() SECURITY DEFINER;
ALTER FUNCTION create_book_version() SET search_path = public;
ALTER FUNCTION log_books_changes() SECURITY DEFINER;
ALTER FUNCTION log_books_changes() SET search_path = public;
ALTER FUNCTION comprehensive_audit_log() SECURITY DEFINER;
ALTER FUNCTION comprehensive_audit_log() SET search_path = public;
ALTER FUNCTION refresh_genre_summary() SECURITY DEFINER;
ALTER FUNCTION refresh_genre_summary() SET search_path = public;
ALTER FUNCTION cancel_reservations_on_block() SECURITY DEFINER;
ALTER FUNCTION cancel_reservations_on_block() SET search_path = public;
ALTER FUNCTION log_reservation_cancel() SECURITY DEFINER;
ALTER FUNCTION log_reservation_cancel() SET search_path = public;
