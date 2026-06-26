#!/bin/bash
# Backup PostgreSQL database
BACKUP_FILE="backup_$(date +%F_%H-%M-%S).sql"
pg_dump -U postgres -d quizhive > $BACKUP_FILE
echo "Backup created at $BACKUP_FILE"
