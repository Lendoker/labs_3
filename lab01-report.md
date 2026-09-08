# Звіт з лабораторної роботи №1
**Тема:** Робота з СУБД PostgreSQL та основи SQL  
**Виконав:** [Ваше Ім'я та Прізвище]  
**Група:** [Назва групи]  
**Обраний рівень складності:** Рівень 3 (Високий)  

---

## 🎯 Мета роботи
Ознайомитися з основами функціонування реляційних баз даних, налаштувати з'єднання з хмарною СУБД PostgreSQL (Supabase), дослідити структуру наданої бази даних "ТехноМарт" та реалізувати базові і складні SQL-запити для аналізу даних.

---

## 🖥️ Використане програмне забезпечення
- **СУБД:** PostgreSQL (хмарний сервіс Supabase)
- **Інтерфейс:** Supabase SQL Editor / Table Editor
- **Система контролю версій:** Git / GitHub

---

## 📑 Виконання завдань та SQL-запити

### Рівень 1

#### 1. Основні SELECT запити
```sql
-- 1.1 Отримати всі записи з таблиці customers
SELECT * FROM customers;

-- 1.2 Вивести тільки назви товарів і їхні ціни з таблиці products
SELECT product_name, unit_price FROM products;

-- 1.3 Показати контактні дані всіх співробітників
SELECT first_name, last_name, phone, email FROM employees;
```

#### 2. Прості умови WHERE
```sql
-- 2.1 Знайти всіх клієнтів з міста Київ
SELECT * FROM customers WHERE city = 'Київ';

-- 2.2 Вивести товари, які коштують більше 25000 грн
SELECT * FROM products WHERE unit_price > 25000;

-- 2.3 Показати всі замовлення зі статусом 'delivered'
SELECT * FROM orders WHERE order_status = 'delivered';

-- 2.4 Знайти співробітників, які працюють у відділі продажів
SELECT * FROM employees WHERE title ILIKE '%продаж%';
```

#### 3. Базове сортування ORDER BY
```sql
-- 3.1 Відсортувати товари за зростанням ціни
SELECT * FROM products ORDER BY unit_price ASC;

-- 3.2 Показати клієнтів в алфавітному порядку за іменем контактної особи
SELECT * FROM customers ORDER BY contact_name ASC;

-- 3.3 Вивести замовлення від найновіших до найстаріших
SELECT * FROM orders ORDER BY order_date DESC;
```

#### 4. Обмеження результатів LIMIT
```sql
-- 4.1 Показати перші 10 найдорожчих товарів
SELECT * FROM products ORDER BY unit_price DESC LIMIT 10;

-- 4.2 Вивести 5 останніх замовлень (за датою)
SELECT * FROM orders ORDER BY order_date DESC LIMIT 5;

-- 4.3 Отримати перших 8 клієнтів в алфавітному порядку
SELECT * FROM customers ORDER BY contact_name ASC LIMIT 8;
```

---

### Рівень 2

#### 1. Пошук за зразком з LIKE
```sql
-- 1.1 Знайти всіх клієнтів, чиї імена починаються на "Іван"
SELECT * FROM customers WHERE contact_name LIKE 'Іван%';

-- 1.2 Вивести товари, в назві яких є слово "phone" або "телефон"
SELECT * FROM products 
WHERE product_name ILIKE '%phone%' OR product_name ILIKE '%телефон%';

-- 1.3 Самостійні запити:
-- Gmail-пошта клієнтів
SELECT * FROM customers WHERE email LIKE '%@gmail.com';

-- Товари з об'ємом пам'яті 256GB
SELECT * FROM products WHERE product_name LIKE '%256GB%';

-- Співробітники по батькові "Іванович/Іванівна"
SELECT * FROM employees WHERE middle_name LIKE 'Іван%';
```

#### 2. Логічні оператори AND, OR, NOT
```sql
-- 2.1 Знайти товари дорожчі за 15000 грн і дешевші за 50000 грн
SELECT * FROM products WHERE unit_price > 15000 AND unit_price < 50000;

-- 2.2 Вивести клієнтів з Києва або Львова, які є юридичними особами
SELECT * FROM customers WHERE (city = 'Київ' OR city = 'Львів') AND customer_type = 'company';

-- 2.3 Самостійні запити:
-- Дорога доставка перевізниками Нова Пошта або САТ
SELECT * FROM orders WHERE freight > 200 AND (ship_via = 'Нова Пошта' OR ship_via = 'САТ');

-- Співробітники із ЗП > 25000 грн не з Києва
SELECT * FROM employees WHERE salary > 25000 AND NOT (city = 'Київ');

-- Товари, що потребують дозамовлення
SELECT * FROM products WHERE units_in_stock > 0 AND units_in_stock <= reorder_level AND NOT discontinued;

-- Корпоративні клієнти з контактною посадою не з Києва
SELECT * FROM customers WHERE customer_type = 'company' AND contact_title IS NOT NULL AND city != 'Київ';
```

#### 3. Оператори IN, BETWEEN, IS NULL
```sql
-- 3.1 Вивести клієнтів з міст Київ, Харків, Одеса, Дніпро
SELECT * FROM customers WHERE city IN ('Київ', 'Харків', 'Одеса', 'Дніпро');

-- 3.2 Знайти товари в ціновому діапазоні від 10000 до 30000 грн
SELECT * FROM products WHERE unit_price BETWEEN 10000 AND 30000;

-- 3.3 Самостійні запити:
-- IN (Постачальники з західного регіону)
SELECT * FROM suppliers WHERE city IN ('Львів', 'Івано-Франківськ', 'Тернопіль', 'Чернівці', 'Ужгород');

-- IN (Замовлення через Нову Пошту або УкрПошту)
SELECT * FROM orders WHERE ship_via IN ('Нова Пошта', 'УкрПошта');

-- BETWEEN (Співробітники, найняті у 2021-2022 роках)
SELECT * FROM employees WHERE hire_date BETWEEN '2021-01-01' AND '2022-12-31';

-- BETWEEN (Товари зі знижкою від 5% до 15%)
SELECT * FROM order_items WHERE discount BETWEEN 0.05 AND 0.15;

-- IS NULL (Фізичні особи без назви компанії)
SELECT * FROM customers WHERE company_name IS NULL;

-- IS NOT NULL (Відправлені замовлення)
SELECT * FROM orders WHERE shipped_date IS NOT NULL;
```

#### 4. Комбінування умов
```sql
-- 4.1 Преміум смартфони в наявності
SELECT * FROM products 
WHERE (product_name ILIKE '%iPhone%' OR product_name ILIKE '%Galaxy%') 
  AND unit_price BETWEEN 20000 AND 60000 
  AND units_in_stock > 0;

-- 4.2 Замовлення корпоративних клієнтів з доставкою в ключові міста
SELECT * FROM orders 
WHERE ship_city IN ('Київ', 'Львів', 'Одеса') 
  AND freight BETWEEN 100 AND 500 
  AND order_status = 'delivered';

-- 4.3 Кваліфіковані менеджери з ЗП вище середньої
SELECT * FROM employees 
WHERE title LIKE '%Менеджер%' AND salary >= 23000 AND hire_date < '2023-01-01';

-- 4.4 Комп'ютерна техніка (крім Apple)
SELECT * FROM products 
WHERE category_id = 2 
  AND (unit_price BETWEEN 25000 AND 50000 OR units_on_order > 0) 
  AND product_name NOT LIKE '%MacBook%';

-- 4.5 Контакти регіональних клієнтів з ukr.net/gmail
SELECT * FROM customers 
WHERE city NOT IN ('Київ') 
  AND (email LIKE '%@ukr.net' OR email LIKE '%@gmail.com') 
  AND phone IS NOT NULL;
```

#### 5. Складне сортування та пагінація
```sql
-- Сортування за категорією та ціною
SELECT * FROM products ORDER BY category_id ASC, unit_price DESC;

-- Сортування за містом та зарплатою
SELECT * FROM employees ORDER BY city ASC, salary DESC;

-- Пагінація: Друга сторінка товарів (по 10 товарів на сторінку)
SELECT * FROM products ORDER BY product_id LIMIT 10 OFFSET 10;
```

---

### Рівень 3

#### 1. Складні комбінації LIKE
```sql
-- Samsung або Apple, але не чохли
SELECT * FROM products 
WHERE (product_name ILIKE '%Samsung%' OR product_name ILIKE '%Apple%') 
  AND product_name NOT ILIKE '%чохол%';

-- Ігрові пристрої без Switch
SELECT * FROM products 
WHERE (product_name ILIKE '%ROG%' OR product_name ILIKE '%PlayStation%' OR product_name ILIKE '%Xbox%') 
  AND product_name NOT ILIKE '%Switch%';
```

#### 2. Вкладені логічні умови
```sql
-- Дорогі товари категорій 1,2 або будь-які дешевші 5000 грн
SELECT * FROM products 
WHERE ((unit_price > 20000 AND category_id IN (1, 2)) OR unit_price < 5000);

-- Розпродаж: дефіцитні дорогі товари або дешеві застарілі аксесуари
SELECT * FROM products 
WHERE ((unit_price > 30000 AND units_in_stock < 5 AND NOT discontinued) 
   OR (unit_price < 2000 AND category_id = 8));
```

#### 3. Комплексні аналітичні запити
```sql
-- Комплексний відбір клієнтів для програми лояльності (5+ умов)
SELECT customer_id, contact_name, company_name, city, email 
FROM customers 
WHERE (customer_type = 'company' OR registration_date >= '2023-01-01')
  AND city IN ('Київ', 'Харків', 'Одеса', 'Дніпро', 'Львів')
  AND email IS NOT NULL
  AND phone LIKE '+380%'
  AND (company_name NOT ILIKE '%тест%' OR company_name IS NULL)
ORDER BY city, customer_type DESC;
```

#### 4. Дослідження даних та пошук закономірностей
```sql
-- Ціновий аналіз: Бюджетний сегмент
SELECT 'Бюджетний' AS segment, COUNT(*) AS total_items, AVG(unit_price) AS avg_price 
FROM products WHERE unit_price < 5000;

-- Географія: Столичний регіон
SELECT 'Київ' AS region, COUNT(*) AS customers_count FROM customers WHERE city = 'Київ';

-- Часові патерни: Q1 2024 року
SELECT 'Q1 2024' AS period, COUNT(*) AS orders_count FROM orders 
WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31';
```

#### 5. Креативні завдання
```sql
-- Розрахунок потенційного виторгу від товарних залишків
SELECT product_name, unit_price, units_in_stock, (unit_price * units_in_stock) AS total_stock_value 
FROM products WHERE units_in_stock > 0 
ORDER BY total_stock_value DESC LIMIT 5;

-- Маркування терміновості доставки за допомогою CASE
SELECT 
    order_id, 
    order_date, 
    required_date, 
    (required_date - order_date) AS days_allowed,
    CASE 
        WHEN (required_date - order_date) <= 3 THEN 'Експрес'
        WHEN (required_date - order_date) <= 5 THEN 'Стандарт'
        ELSE 'Планове'
    END AS shipping_urgency
FROM orders 
WHERE order_status = 'pending' OR order_status = 'processing';
```

---

## ❓ Відповіді на контрольні запитання

1. **Що таке SQL? Декларативність vs Імперативність:**  
   SQL (Structured Query Language) — мова для управління реляційними БД. SQL є декларативною мовою: ми вказуємо, *що* хочемо отримати (наприклад, `SELECT * FROM products WHERE price > 100`), а СУБД сама визначає оптимальний план виконання.

2. **Порядок виконання частин SELECT:**  
   Послідовність виконання: `FROM` ➡️ `WHERE` ➡️ `GROUP BY` ➡️ `HAVING` ➡️ `SELECT` ➡️ `ORDER BY` ➡️ `LIMIT`.

3. **Різниця між `=` та `LIKE`:**  
   Оператор `=` шукає точний збіг значення. `LIKE` використовується для часткового співпадіння за шаблоном із використанням спецсимволів (`%`, `_`).

4. **Wildcards `%` та `_`:**  
   `%` відповідає будь-якій кількості символів (зокрема 0), `_` — чітко одному символу.

5. **Чому `company_name = NULL` не працює?**  
   У SQL `NULL` означає відсутність значення. Порівняння `=` з `NULL` повертає `UNKNOWN`. Потрібно використовувати `IS NULL` або `IS NOT NULL`.

6. **AND vs OR та пріоритет:**  
   `AND` має вищий пріоритет за `OR`. Якщо в запиті є обидва оператори, для задання вірного порядку групування умов обов'язково використовуються дужки.

7. **Особливості `BETWEEN`:**  
   `BETWEEN` завжди включає граничні значення (`a <= x <= b`).

8. **LIMIT, OFFSET та пагінація:**  
   `LIMIT` задає кількість записів на сторінці, `OFFSET` — скільки записів пропустити.Формула: `OFFSET = (номер_сторінки - 1) * розмір_сторінки`.

9. **Важливість `ORDER BY` з `LIMIT`:**  
   Без `ORDER BY` порядок повернення рядків є детерміновано невизначеним. Без сортування `LIMIT` повертає випадкові записи.

10. **LIKE vs ILIKE у PostgreSQL:**  
    `LIKE` чутливий до регістру символів, а `ILIKE` — регістронезалежний.

11. **Обробка `NULL` при сортуванні:**  
    За замовчуванням у PostgreSQL `NULL` розміщуються в кінці при `ASC` та на початку при `DESC`. Поведінку змінюють конструкції `NULLS FIRST` або `NULLS LAST`.

12. **Приклад бізнес-сценарію з дужками:**  
    *Запит:* Знайти пристрої Apple або Samsung дешевші за 20000 грн.  
    *Правильна умова:* `WHERE (brand = 'Apple' OR brand = 'Samsung') AND price < 20000`.

---

## 🎯 Висновки
Під час виконання лабораторної роботи було засвоєно основи мови SQL (DQL), розгорнуто хмарну базу даних PostgreSQL у сервісі Supabase, імпортовано тестову структуру магазину "ТехноМарт" та успішно виконано всі завдання трьох рівнів складності.
