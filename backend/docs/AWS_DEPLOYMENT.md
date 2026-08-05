# AWS Production Deployment Architecture Blueprint

This document outlines the infrastructure and configuration details for moving the **RetailEdge Pro** live LMS platform from LocalTunnel to a production-ready, highly available AWS setup.

---

## 🏗️ Architecture Design Overview

```
                      [Route 53 DNS]
                            │
                            ▼
              [AWS Certificate Manager (ACM)]
                            │
                            ▼
             [Application Load Balancer (ALB)]
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
      [EC2 Node App 1]              [EC2 Node App 2]
    (Ports: 5000 / WS)            (Ports: 5000 / WS)
             │                             │
             └──────────────┬──────────────┘
                            ▼
                     [Redis ElastiCache]
               (Sticky Sessions / WS Adapter)
                            │
                            ▼
                  [Amazon RDS PostgreSQL]
                   (Multi-AZ / Backups)
```

---

## 🛠️ Infrastructure Provisioning Requirements

### 1. Networking (VPC)
- **Subnets**: 2 Public subnets (for ALB) and 2 Private subnets (for EC2/RDS instances) across 2 Availability Zones (AZs).
- **Security Groups**:
  - **ALB Security Group**: Inbound TCP `80` (HTTP) & `443` (HTTPS) from anywhere (`0.0.0.0/0`).
  - **EC2 Security Group**: Inbound TCP `5000` (Node app) restricted strictly to the ALB Security Group. Outbound unrestricted.
  - **RDS Security Group**: Inbound TCP `5432` restricted strictly to EC2 Security Group.

### 2. Node.js Application Layer (EC2 / ECS)
- **Compute**: AWS EC2 Instances (t3.medium or larger recommended for socket-heavy workloads) or AWS ECS Fargate.
- **Process Manager**: PM2 to orchestrate Node clustering and automatic restart on crash.
- **Environment variables (`.env` file)**:
  ```env
  PORT=5000
  NODE_ENV=production
  DATABASE_URL=postgres://user:password@rds-endpoint:5432/quizhive
  REDIS_URL=redis://elasticache-endpoint:6379
  FRONTEND_URL=https://retailedge.pro
  ADMIN_MONITOR_TOKEN=secure_random_string_here
  ```

### 3. State & Memory Layer (Amazon ElastiCache Redis)
- Used by Socket.IO to enable multi-instance scaling.
- Configure `socket.io-redis` (or `@socket.io/redis-adapter`) to sync events across EC2 Nodes transparently.

### 4. Database Layer (Amazon RDS PostgreSQL)
- **Engine**: PostgreSQL 15+.
- **Multi-AZ**: Enabled for automatic failover.
- **Backups**: Automatically enabled daily (7-day retention).

---

## 🔒 Security, Certificates, & DNS

### 1. SSL/TLS Configuration (ACM)
- Request a wildcard SSL certificate in **AWS Certificate Manager (ACM)** for `*.retailedge.pro`.
- Bind the SSL Certificate to the HTTPS Listener (`443`) of the Application Load Balancer.

### 2. Domain Management (Route 53)
- Create a Public Hosted Zone for `retailedge.pro`.
- Add an `A Record` (Alias) pointing `quizhive.retailedge.pro` to the DNS name of the ALB.

### 3. Application Load Balancer Routing Settings
To support real-time WebSocket connections cleanly, configure the ALB Target Group settings as follows:
- **Protocol**: HTTP/1.1.
- **Port**: `5000`.
- **Sticky Sessions (Session Affinity)**: **ENABLED** (Type: Cookie, Duration: 1 day). 
  > *CRITICAL*: Sticky sessions are required during the HTTP handshake of Socket.IO before upgrading to WebSocket.

---

## 📊 Operations & Telemetry

### 1. Logging (CloudWatch Agent)
- Install the CloudWatch agent on the EC2 instances.
- Forward log locations to CloudWatch:
  - PM2 App Logs: `~/.pm2/logs/app-out.log` (JSON structured lines)
  - PM2 Error Logs: `~/.pm2/logs/app-err.log`
  - System Logs: `/var/log/syslog`

### 2. Daily DB Backup Shell Script (stored on EC2 admin node)
```bash
#!/bin/bash
# Backup script to run daily via systemd-timer or cron
DB_HOST="rds-endpoint"
DB_USER="postgres"
DB_NAME="quizhive"
S3_BUCKET="s3://quizhive-backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="/tmp/db_backup_${TIMESTAMP}.sql.gz"

echo "Executing Database Backup..."
export PGPASSWORD="your_rds_password"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE

echo "Uploading backup to AWS S3 bucket..."
aws s3 cp $BACKUP_FILE ${S3_BUCKET}/db_backup_${TIMESTAMP}.sql.gz

echo "Cleanup temporary backup file..."
rm $BACKUP_FILE
echo "Backup Completed Successfully."
```
