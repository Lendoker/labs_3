$docker = "C:\Users\User\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
$outDir = Join-Path $PSScriptRoot "backups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$dest = Join-Path $outDir "library_full.sql"

& $docker exec library-pg pg_dump -U postgres -d library --no-owner --no-privileges -f /tmp/library_full.sql
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed: $LASTEXITCODE" }
& $docker cp library-pg:/tmp/library_full.sql $dest
if ($LASTEXITCODE -ne 0) { throw "docker cp failed: $LASTEXITCODE" }

& $docker exec library-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS library_restore;"
if ($LASTEXITCODE -ne 0) { throw "drop database failed" }
& $docker exec library-pg psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE library_restore;"
if ($LASTEXITCODE -ne 0) { throw "create database failed" }
& $docker exec library-pg psql -U postgres -d library_restore -v ON_ERROR_STOP=1 -f /tmp/library_full.sql
if ($LASTEXITCODE -ne 0) { throw "restore failed" }

& $docker exec library-pg psql -U postgres -d library_restore -c "SELECT 'books' AS t, COUNT(*) FROM books UNION ALL SELECT 'loans', COUNT(*) FROM loans UNION ALL SELECT 'circulation_facts', COUNT(*) FROM circulation_facts ORDER BY t;"
Write-Output ("backup=" + $dest)
Write-Output ("bytes=" + (Get-Item $dest).Length)
