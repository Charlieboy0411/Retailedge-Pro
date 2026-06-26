#!/bin/bash
# Import SQL dump to PostgreSQL
psql -U postgres -d quizhive < dump.sql
echo "PostgreSQL import completed"
