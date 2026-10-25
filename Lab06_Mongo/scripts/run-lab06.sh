#!/bin/bash
export NO_COLOR=1
export TERM=dumb
mongosh --quiet --norc "mongodb://127.0.0.1:27017/library?directConnection=true&w=majority&wtimeoutMS=30000" /tmp/lab06.js > /tmp/lab06-output.txt 2>&1
echo "SHELL_EXIT:$?" >> /tmp/lab06-output.txt
