#!/bin/bash
# Export SQLite database to SQL dump
sqlite3 quizhive.sqlite .dump > dump.sql
echo "SQLite database exported to dump.sql"
