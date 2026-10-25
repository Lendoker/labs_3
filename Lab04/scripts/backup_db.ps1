$docker = "C:\Users\User\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
$outDir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $outDir "library-$stamp.sql"
& $docker exec library-pg pg_dump -U postgres -d library --no-owner -f /tmp/lab04_backup.sql
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed: $LASTEXITCODE" }
& $docker cp library-pg:/tmp/lab04_backup.sql $dest
if ($LASTEXITCODE -ne 0) { throw "docker cp failed: $LASTEXITCODE" }
$item = Get-Item $dest
Write-Output ("backup=" + $item.FullName)
Write-Output ("bytes=" + $item.Length)
