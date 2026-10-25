import psycopg2


class DatabaseConnection:
    def __init__(self, dbname="library", user="postgres", password="postgres",
                 host="localhost", port=5432):
        self.conn_params = {
            "dbname": dbname,
            "user": user,
            "password": password,
            "host": host,
            "port": port,
        }
        self.conn = None

    def connect(self):
        self.conn = psycopg2.connect(**self.conn_params)
        self.conn.autocommit = False
        print("Підключено до PostgreSQL: база library")

    def disconnect(self):
        if self.conn:
            self.conn.close()
            self.conn = None
            print("З'єднання закрито")

    def execute(self, query, params=None, fetch=True):
        cursor = self.conn.cursor()
        try:
            cursor.execute(query, params)
            rows = cursor.fetchall() if fetch else None
            self.conn.commit()
            return rows
        except Exception:
            self.conn.rollback()
            raise
        finally:
            cursor.close()
