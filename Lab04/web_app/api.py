from flask import jsonify, request

from database import query, execute

API_KEY = "library-lab-key"


def _authorized():
    return request.headers.get("X-API-Key") == API_KEY


def register_api(app):
    @app.get("/api/books")
    def api_books():
        if not _authorized():
            return jsonify({"error": "Invalid API key"}), 401
        term = (request.args.get("q") or "").strip()
        rows = query(
            """
            SELECT book_id, title, isbn, publication_year, available_copies, author_name, genre_name
            FROM v_books_catalog
            WHERE (%s = '' OR title ILIKE %s OR author_name ILIKE %s)
            ORDER BY title
            """,
            (term, f"%{term}%", f"%{term}%"),
        )
        return jsonify({"success": True, "count": len(rows), "data": rows})

    @app.get("/api/books/<int:book_id>")
    def api_book(book_id):
        if not _authorized():
            return jsonify({"error": "Invalid API key"}), 401
        rows = query("SELECT * FROM v_books_catalog WHERE book_id = %s", (book_id,))
        if not rows:
            return jsonify({"error": "Book not found"}), 404
        return jsonify({"success": True, "data": rows[0]})

    @app.get("/api/stats")
    def api_stats():
        if not _authorized():
            return jsonify({"error": "Invalid API key"}), 401
        genre = query(
            """
            SELECT genre_name AS genre, COUNT(*) AS books_count
            FROM v_books_catalog
            GROUP BY genre_name
            ORDER BY books_count DESC, genre_name
            """
        )
        return jsonify({"success": True, "genres": genre})

    @app.post("/api/loans")
    def api_loan():
        if not _authorized():
            return jsonify({"error": "Invalid API key"}), 401
        data = request.get_json(silent=True) or {}
        needed = ("book_id", "reader_id")
        if any(key not in data for key in needed):
            return jsonify({"error": "Missing book_id or reader_id"}), 400
        days = int(data.get("days") or 14)
        row = execute(
            "SELECT success, message, loan_id FROM issue_loan(%s, %s, %s)",
            (int(data["book_id"]), int(data["reader_id"]), days),
        )
        status = 201 if row and row[0] else 400
        return jsonify({"success": bool(row[0]), "message": row[1], "loan_id": row[2]}), status
