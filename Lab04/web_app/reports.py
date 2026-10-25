import html
import os
from datetime import datetime


def write_catalog_report(rows, totals, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    body = []
    for row in rows:
        body.append(
            "<tr>"
            f"<td>{row['book_id']}</td>"
            f"<td>{html.escape(row['title'])}</td>"
            f"<td>{html.escape(row['author_name'])}</td>"
            f"<td>{html.escape(row['genre_name'] or '')}</td>"
            f"<td>{row['publication_year']}</td>"
            f"<td>{row['available_copies']}/{row['total_copies']}</td>"
            "</tr>"
        )
    document = f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>Звіт каталогу бібліотеки</title>
<style>
body {{ font-family: Segoe UI, sans-serif; margin: 32px; color: #1c1c1c; }}
h1 {{ color: #1f6b4a; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #cfd8d3; padding: 8px; text-align: left; }}
th {{ background: #1f6b4a; color: white; }}
tr:nth-child(even) {{ background: #f3f7f4; }}
.meta {{ color: #555; }}
</style>
</head>
<body>
<h1>Каталог бібліотеки</h1>
<p class="meta">Волинський фаховий коледж НУХТ. Пінкевич Артем Романович, ІПЗ-32. Сформовано {datetime.now():%d.%m.%Y %H:%M}.</p>
<p>Книг: {totals['books']}. Відкритих видач: {totals['open_loans']}. Прострочених: {totals['overdue']}.</p>
<table>
<thead><tr><th>ID</th><th>Назва</th><th>Автор</th><th>Жанр</th><th>Рік</th><th>Вільно/тираж</th></tr></thead>
<tbody>
{''.join(body)}
</tbody>
</table>
</body>
</html>
"""
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(document)
    return path
