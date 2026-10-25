import os
import re
from datetime import date
from functools import wraps

from flask import Flask, flash, redirect, render_template, request, send_file, session, url_for
from psycopg2 import errors
from werkzeug.security import check_password_hash, generate_password_hash

from api import register_api
from charts import save_genre_chart
from database import execute, query
from reports import write_catalog_report

app = Flask(__name__)
app.secret_key = "library-lab-04-pinkevych"
BASE = os.path.dirname(os.path.abspath(__file__))
CHART_PATH = os.path.join(BASE, "static", "charts", "genres.png")
REPORT_PATH = os.path.abspath(os.path.join(BASE, "..", "reports", "catalog_report.html"))
ISBN_RE = re.compile(r"^978-\d{3}-\d{2}-\d{4}-\d$")


def current_user():
    if "user_id" not in session:
        return None
    return {"user_id": session["user_id"], "username": session["username"],
            "role": session["role"], "full_name": session["full_name"]}


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user():
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


def roles_required(*roles):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if not user:
                return redirect(url_for("login"))
            if user["role"] not in roles:
                flash("Недостатньо прав для цієї дії", "error")
                return redirect(url_for("books"))
            return view(*args, **kwargs)
        return wrapped
    return decorator


def log_action(action, table_name, record_id, details):
    user = current_user()
    if not user:
        return
    execute(
        "SELECT log_activity(%s, %s, %s, %s, %s)",
        (user["user_id"], action, table_name, record_id, details),
    )


def validate_book(form):
    errors = []
    title = (form.get("title") or "").strip()
    isbn = (form.get("isbn") or "").strip()
    try:
        year = int(form.get("year") or 0)
        pages = int(form.get("pages") or 0)
        copies = int(form.get("copies") or 0)
        author_id = int(form.get("author_id") or 0)
    except ValueError:
        return ["Рік, сторінки, тираж і автор мають бути числами"], None
    if not title or len(title) > 200:
        errors.append("Назва обов'язкова і не довша за 200 символів")
    if not ISBN_RE.match(isbn):
        errors.append("ISBN має вигляд 978-966-01-0001-1")
    if year < 1450 or year > date.today().year:
        errors.append("Рік видання поза допустимим діапазоном")
    if pages < 1 or pages > 10000:
        errors.append("Кількість сторінок має бути від 1 до 10000")
    if copies < 1 or copies > 1000:
        errors.append("Тираж має бути від 1 до 1000")
    if not query("SELECT 1 FROM authors WHERE author_id = %s", (author_id,)):
        errors.append("Обраного автора немає в базі")
    publisher_raw = form.get("publisher_id") or ""
    genre_raw = form.get("genre_id") or ""
    publisher_id = int(publisher_raw) if publisher_raw else None
    genre_id = int(genre_raw) if genre_raw else None
    data = dict(title=title, isbn=isbn, year=year, pages=pages, copies=copies,
                author_id=author_id, publisher_id=publisher_id, genre_id=genre_id)
    return errors, data


@app.context_processor
def inject_user():
    return {"user": current_user()}


@app.get("/")
@login_required
def index():
    counts = query(
        """
        SELECT
            (SELECT COUNT(*) FROM books) AS books,
            (SELECT COUNT(*) FROM readers) AS readers,
            (SELECT COUNT(*) FROM loans WHERE return_date IS NULL) AS open_loans,
            (SELECT COUNT(*) FROM v_overdue_loans) AS overdue
        """
    )[0]
    return render_template("index.html", counts=counts)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        rows = query("SELECT * FROM app_users WHERE username = %s", (username,))
        if not rows or not check_password_hash(rows[0]["password_hash"], password):
            flash("Невірний логін або пароль", "error")
            return render_template("login.html"), 401
        user = rows[0]
        session["user_id"] = user["user_id"]
        session["username"] = user["username"]
        session["role"] = user["role"]
        session["full_name"] = user["full_name"]
        log_action("LOGIN", "app_users", user["user_id"], user["username"])
        return redirect(url_for("index"))
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        full_name = (request.form.get("full_name") or "").strip()
        password = request.form.get("password") or ""
        email_ok = re.match(r"^[A-Za-z0-9._-]{3,50}$", username)
        if not email_ok or not full_name or len(password) < 6:
            flash("Логін: 3–50 латинських символів, пароль від 6 символів, ПІБ обов'язкове", "error")
            return render_template("register.html"), 400
        try:
            row = execute(
                """
                INSERT INTO app_users (username, password_hash, full_name, role)
                VALUES (%s, %s, %s, 'reader')
                RETURNING user_id
                """,
                (username, generate_password_hash(password), full_name),
            )
        except errors.UniqueViolation:
            flash("Такий логін уже зайнятий", "error")
            return render_template("register.html"), 400
        flash("Обліковий запис читача створено", "success")
        log_action_as(row[0], "REGISTER", "app_users", row[0], username)
        return redirect(url_for("login"))
    return render_template("register.html")


def log_action_as(user_id, action, table_name, record_id, details):
    execute("SELECT log_activity(%s, %s, %s, %s, %s)",
            (user_id, action, table_name, record_id, details))


@app.post("/logout")
@login_required
def logout():
    log_action("LOGOUT", "app_users", session.get("user_id"), session.get("username"))
    session.clear()
    return redirect(url_for("login"))


@app.get("/books")
@login_required
def books():
    term = (request.args.get("q") or "").strip()
    genre_id = request.args.get("genre_id") or ""
    sort = request.args.get("sort") or "title"
    direction = "DESC" if request.args.get("dir") == "desc" else "ASC"
    sort_sql = {"title": "b.title", "year": "b.publication_year", "copies": "b.available_copies"}
    order_col = sort_sql.get(sort, "b.title")
    genre_param = int(genre_id) if genre_id.isdigit() else None
    rows = query(
        f"""
        SELECT b.book_id, b.title, b.isbn, b.publication_year, b.pages,
               b.available_copies, b.total_copies, b.author_name, b.genre_name
        FROM v_books_catalog b
        WHERE (%s = '' OR b.title ILIKE %s OR b.author_name ILIKE %s OR b.isbn ILIKE %s)
          AND (%s::int IS NULL OR b.genre_id = %s)
        ORDER BY {order_col} {direction}, b.book_id
        """,
        (term, f"%{term}%", f"%{term}%", f"%{term}%", genre_param, genre_param),
    )
    genres = query("SELECT genre_id, name FROM genres ORDER BY name")
    return render_template("books.html", books=rows, genres=genres, q=term,
                           genre_id=genre_id, sort=sort, direction=direction.lower())


@app.route("/books/add", methods=["GET", "POST"])
@roles_required("admin", "librarian")
def add_book():
    authors = query("SELECT author_id, first_name, last_name FROM authors ORDER BY last_name")
    publishers = query("SELECT publisher_id, name FROM publishers ORDER BY name")
    genres = query("SELECT genre_id, name FROM genres ORDER BY name")
    if request.method == "POST":
        errors, data = validate_book(request.form)
        if errors:
            for message in errors:
                flash(message, "error")
            return render_template("book_form.html", authors=authors, publishers=publishers,
                                   genres=genres, book=request.form), 400
        try:
            row = execute(
                """
                INSERT INTO books (isbn, title, author_id, publisher_id, genre_id,
                                   publication_year, pages, total_copies, available_copies)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING book_id
                """,
                (data["isbn"], data["title"], data["author_id"], data["publisher_id"], data["genre_id"],
                 data["year"], data["pages"], data["copies"], data["copies"]),
            )
        except errors.UniqueViolation:
            flash("Книга з таким ISBN уже є", "error")
            return render_template("book_form.html", authors=authors, publishers=publishers,
                                   genres=genres, book=request.form), 400
        log_action("INSERT", "books", row[0], data["title"])
        flash("Книгу додано", "success")
        return redirect(url_for("books"))
    return render_template("book_form.html", authors=authors, publishers=publishers, genres=genres, book={})


@app.route("/books/<int:book_id>/edit", methods=["GET", "POST"])
@roles_required("admin", "librarian")
def edit_book(book_id):
    authors = query("SELECT author_id, first_name, last_name FROM authors ORDER BY last_name")
    publishers = query("SELECT publisher_id, name FROM publishers ORDER BY name")
    genres = query("SELECT genre_id, name FROM genres ORDER BY name")
    current = query("SELECT * FROM books WHERE book_id = %s", (book_id,))
    if not current:
        flash("Книгу не знайдено", "error")
        return redirect(url_for("books"))
    if request.method == "POST":
        errors, data = validate_book(request.form)
        if errors:
            for message in errors:
                flash(message, "error")
            return render_template("book_form.html", authors=authors, publishers=publishers,
                                   genres=genres, book=request.form), 400
        if data["copies"] < (current[0]["total_copies"] - current[0]["available_copies"]):
            flash("Тираж не може бути меншим за кількість виданих примірників", "error")
            return render_template("book_form.html", authors=authors, publishers=publishers,
                                   genres=genres, book=request.form), 400
        issued = current[0]["total_copies"] - current[0]["available_copies"]
        execute(
            """
            UPDATE books
            SET title = %s, isbn = %s, author_id = %s, publisher_id = %s, genre_id = %s,
                publication_year = %s, pages = %s, total_copies = %s,
                available_copies = %s
            WHERE book_id = %s
            """,
            (data["title"], data["isbn"], data["author_id"], data["publisher_id"], data["genre_id"],
             data["year"], data["pages"], data["copies"], data["copies"] - issued, book_id),
        )
        log_action("UPDATE", "books", book_id, data["title"])
        flash("Книгу оновлено", "success")
        return redirect(url_for("books"))
    book = {
        "title": current[0]["title"], "isbn": current[0]["isbn"],
        "year": current[0]["publication_year"], "pages": current[0]["pages"],
        "copies": current[0]["total_copies"], "author_id": current[0]["author_id"],
        "publisher_id": current[0]["publisher_id"] or "", "genre_id": current[0]["genre_id"] or "",
    }
    return render_template("book_form.html", authors=authors, publishers=publishers,
                           genres=genres, book=book, editing=True)


@app.post("/books/<int:book_id>/delete")
@roles_required("admin", "librarian")
def delete_book(book_id):
    try:
        row = execute("DELETE FROM books WHERE book_id = %s RETURNING title", (book_id,))
    except errors.ForeignKeyViolation:
        flash("Книгу не видалено: є видачі або бронювання", "error")
        return redirect(url_for("books"))
    if not row:
        flash("Книгу не знайдено", "error")
    else:
        log_action("DELETE", "books", book_id, row[0])
        flash("Книгу видалено", "success")
    return redirect(url_for("books"))


@app.get("/readers")
@roles_required("admin", "librarian")
def readers():
    rows = query(
        """
        SELECT reader_id, first_name, last_name, email, phone, library_card_number, status
        FROM readers ORDER BY last_name, first_name
        """
    )
    return render_template("readers.html", readers=rows)


@app.route("/loans", methods=["GET", "POST"])
@roles_required("admin", "librarian")
def loans():
    if request.method == "POST":
        action = request.form.get("action")
        try:
            if action == "issue":
                result = query(
                    "SELECT * FROM issue_loan(%s, %s, %s)",
                    (int(request.form["book_id"]), int(request.form["reader_id"]), int(request.form.get("days") or 14)),
                )[0]
                flash(result["message"], "success" if result["success"] else "error")
                if result["success"]:
                    log_action("ISSUE", "loans", result["loan_id"], f"book {request.form['book_id']}")
            elif action == "return":
                result = query("SELECT * FROM return_loan(%s)", (int(request.form["loan_id"]),))[0]
                flash(result["message"], "success" if result["success"] else "error")
                if result["success"]:
                    log_action("RETURN", "loans", int(request.form["loan_id"]), "return")
        except (ValueError, KeyError):
            flash("Некоректні дані форми", "error")
    open_loans = query("SELECT * FROM v_active_loans ORDER BY due_date, title")
    book_opts = query("SELECT book_id, title, available_copies FROM books WHERE available_copies > 0 ORDER BY title")
    reader_opts = query(
        """
        SELECT reader_id, first_name, last_name FROM readers
        WHERE status = 'Active' ORDER BY last_name
        """
    )
    return render_template("loans.html", loans=open_loans, books=book_opts, readers=reader_opts)


@app.get("/stats")
@login_required
def stats():
    rows = query(
        """
        SELECT COALESCE(genre_name, 'Без жанру') AS genre, COUNT(*) AS books_count
        FROM v_books_catalog
        GROUP BY genre_name
        ORDER BY books_count DESC, genre
        """
    )
    by_reader = query(
        """
        SELECT reader_name, loans_total, open_loans
        FROM v_reader_loan_stats
        ORDER BY loans_total DESC
        LIMIT 8
        """
    )
    by_month = query(
        """
        SELECT TO_CHAR(DATE_TRUNC('month', loan_date), 'YYYY-MM') AS month, COUNT(*) AS loans_count
        FROM loans
        GROUP BY DATE_TRUNC('month', loan_date)
        ORDER BY DATE_TRUNC('month', loan_date)
        """
    )
    save_genre_chart(rows, CHART_PATH)
    return render_template("stats.html", rows=rows, by_reader=by_reader, by_month=by_month)


@app.get("/report")
@roles_required("admin", "librarian")
def report():
    rows = query(
        """
        SELECT book_id, title, author_name, genre_name, publication_year, available_copies, total_copies
        FROM v_books_catalog ORDER BY title
        """
    )
    totals = query(
        """
        SELECT (SELECT COUNT(*) FROM books) AS books,
               (SELECT COUNT(*) FROM loans WHERE return_date IS NULL) AS open_loans,
               (SELECT COUNT(*) FROM v_overdue_loans) AS overdue
        """
    )[0]
    write_catalog_report(rows, totals, REPORT_PATH)
    log_action("REPORT", "books", None, REPORT_PATH)
    return send_file(REPORT_PATH, as_attachment=True, download_name="catalog_report.html")


@app.get("/audit")
@roles_required("admin")
def audit():
    db_log = query(
        """
        SELECT log_id, table_name, operation, record_id, changed_by, changed_at
        FROM audit_log ORDER BY log_id DESC LIMIT 25
        """
    )
    app_log = query(
        """
        SELECT a.log_id, u.username, a.action, a.table_name, a.record_id, a.details, a.created_at
        FROM activity_log a
        LEFT JOIN app_users u ON u.user_id = a.user_id
        ORDER BY a.log_id DESC LIMIT 25
        """
    )
    return render_template("audit.html", db_log=db_log, app_log=app_log)


register_api(app)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5055, debug=False)
