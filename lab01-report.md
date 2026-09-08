# Звіт з лабораторної роботи №1
**Тема:** Робота з СУБД PostgreSQL та основи SQL  
**Виконав:** Пінкевич Артем
**Група:** ІПЗ-32
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

-- 1.1 Отримати всі записи з таблиці customers
SELECT * FROM customers
<img width="1572" height="777" alt="image" src="https://github.com/user-attachments/assets/17677855-8002-4cec-9fc3-527d3687764e" />


-- 1.2 Вивести тільки назви товарів і їхні ціни з таблиці products
SELECT product_name, unit_price FROM products;
<img width="1568" height="824" alt="image" src="https://github.com/user-attachments/assets/f5727e6c-8644-4704-81a1-6d402b7f02fd" />



-- 1.3 Показати контактні дані всіх співробітників
SELECT first_name, last_name, phone, email FROM employees;
<img width="1573" height="577" alt="image" src="https://github.com/user-attachments/assets/192a3d97-afe7-4885-9529-c9d6cfa7b900" />



#### 2. Прості умови WHERE

-- 2.1 Знайти всіх клієнтів з міста Київ
SELECT * FROM customers WHERE city = 'Київ';
<img width="1565" height="427" alt="image" src="https://github.com/user-attachments/assets/f32255aa-48c5-4bdf-a678-a69d4d058247" />


-- 2.2 Вивести товари, які коштують більше 25000 грн
SELECT * FROM products WHERE unit_price > 25000;
<img width="1562" height="730" alt="image" src="https://github.com/user-attachments/assets/ba13eac4-b104-4223-921b-1df6b7591830" />


-- 2.3 Показати всі замовлення зі статусом 'delivered'
SELECT * FROM orders WHERE order_status = 'delivered';
<img width="1563" height="820" alt="image" src="https://github.com/user-attachments/assets/e91cd0a2-428f-449f-9244-4a1499108633" />


-- 2.4 Знайти співробітників, які працюють у відділі продажів
SELECT * FROM employees WHERE title ILIKE '%продаж%';
<img width="1565" height="400" alt="image" src="https://github.com/user-attachments/assets/52d09d33-62c5-4795-bd1b-b29bd3aa183d" />



#### 3. Базове сортування ORDER BY

-- 3.1 Відсортувати товари за зростанням ціни
SELECT * FROM products ORDER BY unit_price ASC;
<img width="1571" height="811" alt="image" src="https://github.com/user-attachments/assets/afd53e4b-8cdc-463c-8334-bf0f064ac563" />


-- 3.2 Показати клієнтів в алфавітному порядку за іменем контактної особи
SELECT * FROM customers ORDER BY contact_name ASC;
<img width="1562" height="745" alt="image" src="https://github.com/user-attachments/assets/7f47d96c-a361-4b10-9d83-49b767a6bd7a" />


-- 3.3 Вивести замовлення від найновіших до найстаріших
SELECT * FROM orders ORDER BY order_date DESC;
<img width="1564" height="817" alt="image" src="https://github.com/user-attachments/assets/b9159084-f236-4e31-af8f-3db202a7737d" />



#### 4. Обмеження результатів LIMIT

-- 4.1 Показати перші 10 найдорожчих товарів
SELECT * FROM products ORDER BY unit_price DESC LIMIT 10;
<img width="1573" height="607" alt="image" src="https://github.com/user-attachments/assets/0e2c3f10-fc9f-4b96-a00b-690a69855370" />


-- 4.2 Вивести 5 останніх замовлень (за датою)
SELECT * FROM orders ORDER BY order_date DESC LIMIT 5;
<img width="1563" height="473" alt="image" src="https://github.com/user-attachments/assets/108c58e8-6c9c-4931-98b8-9760d67b0806" />


-- 4.3 Отримати перших 8 клієнтів в алфавітному порядку
SELECT * FROM customers ORDER BY contact_name ASC LIMIT 8;
<img width="1563" height="542" alt="image" src="https://github.com/user-attachments/assets/c3bdd229-e309-4351-b172-aca8b0483414" />



---

### Рівень 2

#### 1. Пошук за зразком з LIKE

-- 1.1 Знайти всіх клієнтів, чиї імена починаються на "Іван"
SELECT * FROM customers WHERE contact_name LIKE 'Іван%';
<img width="1566" height="340" alt="image" src="https://github.com/user-attachments/assets/489a223e-5ca2-4b95-95c6-5f0ab7bc4d61" />


-- 1.2 Вивести товари, в назві яких є слово "phone" або "телефон"
SELECT * FROM products 
WHERE product_name ILIKE '%phone%' OR product_name ILIKE '%телефон%';
<img width="1565" height="347" alt="image" src="https://github.com/user-attachments/assets/6e3be757-a418-4925-8710-5ba90168a409" />


-- 1.3 Самостійні запити:
-- Gmail-пошта клієнтів
SELECT * FROM customers WHERE email LIKE '%@gmail.com';
<img width="1563" height="451" alt="image" src="https://github.com/user-attachments/assets/cfe7ba1f-45b2-409b-aed4-78c5e502820f" />


-- Товари з об'ємом пам'яті 256GB
SELECT * FROM products WHERE product_name LIKE '%256GB%';
<img width="1567" height="427" alt="image" src="https://github.com/user-attachments/assets/7be54ded-59d3-47d4-908a-d2752adacb0b" />


-- Співробітники по батькові "Іванович/Іванівна"
SELECT * FROM employees WHERE middle_name LIKE 'Іван%';
<img width="1563" height="343" alt="image" src="https://github.com/user-attachments/assets/523f3a00-81dd-4014-914e-17228ed4280a" />



#### 2. Логічні оператори AND, OR, NOT

-- 2.1 Знайти товари дорожчі за 15000 грн і дешевші за 50000 грн
SELECT * FROM products WHERE unit_price > 15000 AND unit_price < 50000;
<img width="1568" height="759" alt="image" src="https://github.com/user-attachments/assets/c2bdca87-4b2e-4426-98ed-7c6efb8f2ff9" />


-- 2.2 Вивести клієнтів з Києва або Львова, які є юридичними особами
SELECT * FROM customers WHERE (city = 'Київ' OR city = 'Львів') AND customer_type = 'company';
<img width="1560" height="403" alt="image" src="https://github.com/user-attachments/assets/292401b4-b567-4408-bfc7-c7119a46030b" />


-- 2.3 Самостійні запити:
-- Дорога доставка перевізниками Нова Пошта або САТ
SELECT * FROM orders WHERE freight > 200 AND (ship_via = 'Нова Пошта' OR ship_via = 'САТ');
<img width="1560" height="484" alt="image" src="https://github.com/user-attachments/assets/ffc3c28c-ae2e-4c14-9b29-e140ee38f067" />


-- Співробітники із ЗП > 25000 грн не з Києва
SELECT * FROM employees WHERE salary > 25000 AND NOT (city = 'Київ');
<img width="1575" height="334" alt="image" src="https://github.com/user-attachments/assets/53e1cbea-80de-4ce8-a647-210eba700538" />


-- Товари, що потребують дозамовлення
SELECT * FROM products WHERE units_in_stock > 0 AND units_in_stock <= reorder_level AND NOT discontinued;
<img width="1579" height="338" alt="image" src="https://github.com/user-attachments/assets/72485485-07ab-452b-b0e8-c3852b6795d4" />


-- Корпоративні клієнти з контактною посадою не з Києва
SELECT * FROM customers WHERE customer_type = 'company' AND contact_title IS NOT NULL AND city != 'Київ';
<img width="1561" height="405" alt="image" src="https://github.com/user-attachments/assets/52154dac-5e6f-4d14-8520-ec288ae487de" />



#### 3. Оператори IN, BETWEEN, IS NULL

-- 3.1 Вивести клієнтів з міст Київ, Харків, Одеса, Дніпро
SELECT * FROM customers WHERE city IN ('Київ', 'Харків', 'Одеса', 'Дніпро');
<img width="1568" height="653" alt="image" src="https://github.com/user-attachments/assets/1e5a995e-55c6-4c6d-a36d-3ea46b9a259a" />


-- 3.2 Знайти товари в ціновому діапазоні від 10000 до 30000 грн
SELECT * FROM products WHERE unit_price BETWEEN 10000 AND 30000;
<img width="1567" height="676" alt="image" src="https://github.com/user-attachments/assets/4e8bf102-1c21-44f4-be91-96e998f895da" />


-- 3.3 Самостійні запити:
-- IN (Постачальники з західного регіону)
SELECT * FROM suppliers WHERE city IN ('Львів', 'Івано-Франківськ', 'Тернопіль', 'Чернівці', 'Ужгород');
<img width="1563" height="392" alt="image" src="https://github.com/user-attachments/assets/812ae925-cdb0-4b9d-88ad-63d1cb1a21b1" />


-- IN (Замовлення через Нову Пошту або УкрПошту)
SELECT * FROM orders WHERE ship_via IN ('Нова Пошта', 'УкрПошта');
<img width="1564" height="820" alt="image" src="https://github.com/user-attachments/assets/787bcb7f-f1e4-4455-8bfd-71376f457d8a" />


-- BETWEEN (Співробітники, найняті у 2021-2022 роках)
SELECT * FROM employees WHERE hire_date BETWEEN '2021-01-01' AND '2022-12-31';
<img width="1561" height="432" alt="image" src="https://github.com/user-attachments/assets/4fb07c50-bf27-4be7-9227-60d3e05ade06" />


-- BETWEEN (Товари зі знижкою від 5% до 15%)
SELECT * FROM order_items WHERE discount BETWEEN 0.05 AND 0.15;
<img width="1570" height="813" alt="image" src="https://github.com/user-attachments/assets/36a674a0-f180-49dc-9820-cf2407dee2d0" />


-- IS NULL (Фізичні особи без назви компанії)
SELECT * FROM customers WHERE company_name IS NULL;
<img width="1562" height="569" alt="image" src="https://github.com/user-attachments/assets/c88e5aee-54a0-4a75-9e84-20a1c30cab2b" />


-- IS NOT NULL (Відправлені замовлення)
SELECT * FROM orders WHERE shipped_date IS NOT NULL;
<img width="1564" height="822" alt="image" src="https://github.com/user-attachments/assets/f5f5f8a0-bbde-4ad5-858e-fcbb797a3822" />



#### 4. Комбінування умов

-- 4.1 Преміум смартфони в наявності
SELECT * FROM products 
WHERE (product_name ILIKE '%iPhone%' OR product_name ILIKE '%Galaxy%') 
  AND unit_price BETWEEN 20000 AND 60000 
  AND units_in_stock > 0;
<img width="1566" height="394" alt="image" src="https://github.com/user-attachments/assets/eaeb1123-5b91-4c5e-94e0-d23ad4f998eb" />


-- 4.2 Замовлення корпоративних клієнтів з доставкою в ключові міста
SELECT * FROM orders 
WHERE ship_city IN ('Київ', 'Львів', 'Одеса') 
  AND freight BETWEEN 100 AND 500 
  AND order_status = 'delivered';
<img width="1562" height="619" alt="image" src="https://github.com/user-attachments/assets/e6afa0e5-0b33-4c94-b6a8-68a7fc18957b" />


-- 4.3 Кваліфіковані менеджери з ЗП вище середньої
SELECT * FROM employees 
WHERE title LIKE '%Менеджер%' AND salary >= 23000 AND hire_date < '2023-01-01';
<img width="1569" height="396" alt="image" src="https://github.com/user-attachments/assets/ebf01ac8-cde8-4faa-89b3-a9615b03c243" />


-- 4.4 Комп'ютерна техніка (крім Apple)
SELECT * FROM products 
WHERE category_id = 2 
  AND (unit_price BETWEEN 25000 AND 50000 OR units_on_order > 0) 
  AND product_name NOT LIKE '%MacBook%';
<img width="1567" height="436" alt="image" src="https://github.com/user-attachments/assets/0a78c3eb-1cf6-4c31-a7d2-6e1cb916c8c9" />


-- 4.5 Контакти регіональних клієнтів з ukr.net/gmail
SELECT * FROM customers 
WHERE city NOT IN ('Київ') 
  AND (email LIKE '%@ukr.net' OR email LIKE '%@gmail.com') 
  AND phone IS NOT NULL;
<img width="1569" height="485" alt="image" src="https://github.com/user-attachments/assets/b05370b0-0973-4d47-9443-0ded9d9c9469" />



#### 5. Складне сортування та пагінація

-- Сортування за категорією та ціною
SELECT * FROM products ORDER BY category_id ASC, unit_price DESC;
<img width="1566" height="809" alt="image" src="https://github.com/user-attachments/assets/1f0983de-9e04-488c-974e-81fd979afa34" />


-- Сортування за містом та зарплатою
SELECT * FROM employees ORDER BY city ASC, salary DESC;
<img width="1565" height="553" alt="image" src="https://github.com/user-attachments/assets/50fc66b8-88d0-407a-a13d-dde3c7cf5c3a" />


-- Пагінація: Друга сторінка товарів (по 10 товарів на сторінку)
SELECT * FROM products ORDER BY product_id LIMIT 10 OFFSET 10;
<img width="1563" height="600" alt="image" src="https://github.com/user-attachments/assets/d9a749c4-dbd2-4284-a253-5ef3f6ac5002" />



---

### Рівень 3

#### 1. Складні комбінації LIKE

-- Samsung або Apple, але не чохли
SELECT * FROM products 
WHERE (product_name ILIKE '%Samsung%' OR product_name ILIKE '%Apple%') 
  AND product_name NOT ILIKE '%чохол%';
<img width="1568" height="445" alt="image" src="https://github.com/user-attachments/assets/3a470ffb-002d-4ab4-a9b2-94095cf0ed2e" />


-- Ігрові пристрої без Switch
SELECT * FROM products 
WHERE (product_name ILIKE '%ROG%' OR product_name ILIKE '%PlayStation%' OR product_name ILIKE '%Xbox%') 
  AND product_name NOT ILIKE '%Switch%';
<img width="1565" height="411" alt="image" src="https://github.com/user-attachments/assets/21753b0e-3fc0-41da-9fd9-e6a8f76275e9" />



#### 2. Вкладені логічні умови

-- Дорогі товари категорій 1,2 або будь-які дешевші 5000 грн
SELECT * FROM products 
WHERE ((unit_price > 20000 AND category_id IN (1, 2)) OR unit_price < 5000);
<img width="1567" height="650" alt="image" src="https://github.com/user-attachments/assets/93e68114-e7dd-4b18-94f0-93d5e68ed223" />


-- Розпродаж: дефіцитні дорогі товари або дешеві застарілі аксесуари
SELECT * FROM products 
WHERE ((unit_price > 30000 AND units_in_stock < 5 AND NOT discontinued) 
   OR (unit_price < 2000 AND category_id = 8));
<img width="1564" height="336" alt="image" src="https://github.com/user-attachments/assets/78940de4-c1e0-416e-89bc-299133b1b6fa" />


#### 3. Комплексні аналітичні запити

-- Комплексний відбір клієнтів для програми лояльності (5+ умов)
SELECT customer_id, contact_name, company_name, city, email 
FROM customers 
WHERE (customer_type = 'company' OR registration_date >= '2023-01-01')
  AND city IN ('Київ', 'Харків', 'Одеса', 'Дніпро', 'Львів')
  AND email IS NOT NULL
  AND phone LIKE '+380%'
  AND (company_name NOT ILIKE '%тест%' OR company_name IS NULL)
ORDER BY city, customer_type DESC;
<img width="1565" height="737" alt="image" src="https://github.com/user-attachments/assets/c81b0acb-3522-43ad-8d3a-4414ed930100" />



#### 4. Дослідження даних та пошук закономірностей

-- Ціновий аналіз: Бюджетний сегмент
SELECT 'Бюджетний' AS segment, COUNT(*) AS total_items, AVG(unit_price) AS avg_price 
FROM products WHERE unit_price < 5000;
<img width="1573" height="342" alt="image" src="https://github.com/user-attachments/assets/b0d90e5c-37e8-49ce-960f-940f3fbab330" />


-- Географія: Столичний регіон
SELECT 'Київ' AS region, COUNT(*) AS customers_count FROM customers WHERE city = 'Київ';
<img width="1566" height="350" alt="image" src="https://github.com/user-attachments/assets/bba3dc07-a5ff-4c59-9cfc-de96d7eeecae" />


-- Часові патерни: Q1 2024 року
SELECT 'Q1 2024' AS period, COUNT(*) AS orders_count FROM orders 
WHERE order_date BETWEEN '2024-01-01' AND '2024-03-31';
<img width="1562" height="361" alt="image" src="https://github.com/user-attachments/assets/e3d76913-beb4-4758-b627-5c278f24f984" />



#### 5. Креативні завдання

-- Розрахунок потенційного виторгу від товарних залишків
SELECT product_name, unit_price, units_in_stock, (unit_price * units_in_stock) AS total_stock_value 
FROM products WHERE units_in_stock > 0 
ORDER BY total_stock_value DESC LIMIT 5;
<img width="1565" height="458" alt="image" src="https://github.com/user-attachments/assets/a6ae5dfa-fb98-4125-90af-7415c02a3c36" />


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
<img width="1562" height="426" alt="image" src="https://github.com/user-attachments/assets/e09514d2-0f30-4112-8ed1-e88f8cf700ef" />


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
