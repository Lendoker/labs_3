DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_user') THEN
        CREATE ROLE role_user NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_moderator') THEN
        CREATE ROLE role_moderator NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_admin') THEN
        CREATE ROLE role_admin NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'user_demo') THEN
        CREATE USER user_demo WITH PASSWORD 'user_pass';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moderator_demo') THEN
        CREATE USER moderator_demo WITH PASSWORD 'moderator_pass';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_l5') THEN
        CREATE USER admin_l5 WITH PASSWORD 'admin_l5_pass';
    END IF;
END $$;

GRANT role_user TO role_moderator;
GRANT role_moderator TO role_admin;
GRANT role_user TO user_demo;
GRANT role_moderator TO moderator_demo;
GRANT role_admin TO admin_l5;
ALTER ROLE user_demo INHERIT;
ALTER ROLE moderator_demo INHERIT;
ALTER ROLE admin_l5 INHERIT;

GRANT CONNECT ON DATABASE library TO role_user, role_moderator, role_admin;
GRANT USAGE ON SCHEMA public TO role_user, role_moderator, role_admin;
GRANT SELECT ON books, authors, genres, publishers, v_books_catalog TO role_user;
GRANT INSERT, UPDATE ON books, loans, reservations TO role_moderator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO role_moderator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO role_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO role_admin;

SELECT child.rolname AS role, parent.rolname AS inherits
FROM pg_auth_members m
JOIN pg_roles child ON child.oid = m.member
JOIN pg_roles parent ON parent.oid = m.roleid
WHERE child.rolname IN ('role_user', 'role_moderator', 'role_admin', 'user_demo', 'moderator_demo', 'admin_l5')
ORDER BY child.rolname, parent.rolname;
