#!/bin/bash
set -e
rm -rf /tmp/library_backup
mongodump --uri="mongodb://127.0.0.1:27017/?directConnection=true" --db=library --out=/tmp/library_backup
find /tmp/library_backup -type f -printf "%p %s\n" | sort
echo DUMP_OK
