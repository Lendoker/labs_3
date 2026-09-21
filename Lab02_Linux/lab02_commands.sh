#!/usr/bin/env bash
set -euo pipefail

# Виконання в домашньому каталозі Linux. Команди відповідають 7 етапам.
echo "Етап 1"
pwd
cd /
ls -F
printf '\n/var без переходу:\n'
ls -lah /var
cd ~

echo "Етап 2"
mkdir -p "$HOME/workspace"
cd "$HOME/workspace"
mkdir docs backup temp
mkdir -p projects/2026/linux_course
ls -laR .

echo "Етап 3"
touch task1.txt task2.txt notes.doc .settings
ls -l
ls -la
stat task1.txt
sleep 1
touch task1.txt
stat task1.txt

echo "Етап 4"
cat /etc/passwd > task1.txt
stat task1.txt
cp task1.txt docs/users_report.txt
cp task1.txt task2.txt backup/
cp -i task1.txt backup/ || true
cp -r docs backup/
ls -laR backup

echo "Етап 5"
mv notes.doc instruction.txt
mv instruction.txt projects/2026/linux_course/
mv temp backup/

echo "Етап 6"
cd projects/2026/linux_course
pwd
ls -l instruction.txt
cd ../..
pwd
cd /etc
cd -

echo "Етап 7"
mkdir to_delete
rmdir to_delete
rmdir backup || true
rm -i task2.txt || true
cd "$HOME"
rm -rf workspace
test ! -e "$HOME/workspace" && echo "workspace успішно видалено"
