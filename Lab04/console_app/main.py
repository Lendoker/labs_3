"""Консольний CRUD для бібліотеки. Запуск з --demo виконує створення, читання, зміну і видалення."""

import argparse
import sys

from database import DatabaseConnection

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def list_books(db):
    return db.execute(
        """
        SELECT b.book_id, b.title, b.isbn, b.publication_year, b.available_copies,
               a.last_name
        FROM books b
        JOIN authors a ON a.author_id = b.author_id
        ORDER BY b.title
        """
    )


def print_books(rows):
    print(f"{'ID':<4} {'Назва':<42} {'ISBN':<18} {'Рік':<6} {'Вільно':<7} Автор")
    print("-" * 100)
    for row in rows:
        print(f"{row[0]:<4} {row[1][:42]:<42} {row[2]:<18} {row[3]:<6} {row[4]:<7} {row[5]}")
    print(f"Рядків: {len(rows)}")


def add_book(db, title, isbn, year, pages, copies, author_id):
    rows = db.execute(
        """
        INSERT INTO books (isbn, title, author_id, publication_year, pages, total_copies, available_copies)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING book_id
        """,
        (isbn, title, author_id, year, pages, copies, copies),
    )
    print(f"CREATE: книгу додано, book_id={rows[0][0]}")
    return rows[0][0]


def update_pages(db, book_id, pages):
    rows = db.execute(
        "UPDATE books SET pages = %s WHERE book_id = %s RETURNING book_id, title, pages",
        (pages, book_id),
    )
    if not rows:
        print("UPDATE: книгу не знайдено")
        return
    print(f"UPDATE: {rows[0][1]} тепер має {rows[0][2]} стор.")


def delete_book(db, book_id):
    rows = db.execute(
        "DELETE FROM books WHERE book_id = %s RETURNING book_id, title",
        (book_id,),
    )
    if not rows:
        print("DELETE: книгу не знайдено")
        return
    print(f"DELETE: видалено «{rows[0][1]}» (id={rows[0][0]})")


def run_demo(db):
    isbn = "978-966-77-0001-1"
    db.execute("DELETE FROM books WHERE isbn = %s", (isbn,), fetch=False)
    before = db.execute("SELECT COUNT(*) FROM books")[0][0]
    print(f"READ: книг до демонстрації = {before}")
    author_id = db.execute("SELECT author_id FROM authors WHERE last_name = 'Франко' LIMIT 1")[0][0]
    book_id = add_book(db, "Демонстраційний наклад", isbn, 2024, 120, 2, author_id)
    found = db.execute(
        "SELECT book_id, title, pages FROM books WHERE book_id = %s",
        (book_id,),
    )
    print(f"READ: знайдено id={found[0][0]}, назва={found[0][1]}, сторінок={found[0][2]}")
    update_pages(db, book_id, 128)
    delete_book(db, book_id)
    after = db.execute("SELECT COUNT(*) FROM books")[0][0]
    print(f"READ: книг після демонстрації = {after}")
    print_books(list_books(db)[:8])
    print("CRUD demo завершено")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()
    db = DatabaseConnection()
    db.connect()
    try:
        if args.demo:
            run_demo(db)
            return
        print("Інтерактивне меню: 1 книги, 2 додати, 3 змінити сторінки, 4 видалити, 0 вихід")
        while True:
            choice = input("Опція: ").strip()
            if choice == "1":
                print_books(list_books(db))
            elif choice == "2":
                add_book(
                    db,
                    input("Назва: "),
                    input("ISBN: "),
                    int(input("Рік: ")),
                    int(input("Сторінки: ")),
                    int(input("Примірники: ")),
                    int(input("ID автора: ")),
                )
            elif choice == "3":
                update_pages(db, int(input("ID: ")), int(input("Сторінки: ")))
            elif choice == "4":
                delete_book(db, int(input("ID: ")))
            elif choice == "0":
                break
    finally:
        db.disconnect()


if __name__ == "__main__":
    main()
