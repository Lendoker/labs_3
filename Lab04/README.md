# Лабораторна робота 4. Бібліотека

Спільна база PostgreSQL 16 у контейнері `library-pg` (порт 5432, база `library`, користувач `postgres`, пароль `postgres`). Контейнер використовується і для лабораторних 3 та 5.

- `database/` - SQL схеми, даних, процедур, тригерів, представлень і запитів
- `console_app/` - консольний CRUD (`python main.py --demo`)
- `web_app/` - Flask-застосунок на порту 5055
- `docs/conceptual_model.png` - ER-діаграма
- `docs/logical_schema.md` - логічна схема у 3НФ
- `report.md` - звіт
- `scripts/backup_db.ps1` - резервна копія через `pg_dump` у контейнері

Облікові записи вебзастосунку: `admin` / `admin123`, `librarian` / `lib123`, `reader` / `read123`.
Ключ JSON API: заголовок `X-API-Key: library-lab-key`.
