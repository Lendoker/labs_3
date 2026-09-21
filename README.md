# Лабораторні роботи

Підготовлені матеріали:

- `Lab01_CSharp/` — єдиний консольний застосунок C# для ЛР1 і звіт
- `Lab02_Linux/` — сценарій команд Linux і звіт для ЛР2 з файлової системи
- `Lab02_SQL/` — SQL-запити PostgreSQL рівня 3 і звіт для ЛР2

## Перевірка C#

```powershell
dotnet build .\Lab01_CSharp\Lab01_CSharp.csproj
dotnet run --project .\Lab01_CSharp\Lab01_CSharp.csproj
```

## Linux

Скопіювати каталог до Linux/WSL і виконати:

```bash
chmod +x lab02_commands.sh
./lab02_commands.sh
```

Сценарій наприкінці видаляє створений `workspace`, як вимагає завдання.

## SQL

Відкрити `Lab02_SQL/lab02_queries.sql` у Supabase SQL Editor і виконувати
запити послідовно. Скрипт очікує таблиці навчальної БД з ЛР1.
