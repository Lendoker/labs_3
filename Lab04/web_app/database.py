import psycopg2
from psycopg2.extras import RealDictCursor

CONN = dict(host="localhost", port=5432, dbname="library", user="postgres", password="postgres")


def query(sql, params=None, fetch=True):
    conn = psycopg2.connect(**CONN)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall() if fetch else None
        conn.commit()
        return rows
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute(sql, params=None):
    conn = psycopg2.connect(**CONN)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone() if cur.description else None
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
