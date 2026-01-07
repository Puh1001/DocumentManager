# 🚀 Quick Deploy Guide

## Deploy Zero-Downtime Từ Local (Khuyến Nghị) ⭐

**Chỉ 1 lệnh:**

```bash
./scripts/deploy-zero-downtime.sh user@your-server.com
```

**Tự động:**

- ✅ Check SSH connection trước
- ✅ Push code lên GitHub (nếu cần)
- ✅ SSH vào server
- ✅ Pull code mới
- ✅ Backup database
- ✅ Build images
- ✅ Deploy zero-downtime (1-2 giây downtime)
- ✅ Health checks tự động
- ✅ Run migrations
- ✅ Summary report

**Các lệnh khác:**

```bash
# Check status
./scripts/deploy-zero-downtime.sh status user@server.com

# Xem logs
./scripts/deploy-zero-downtime.sh logs user@server.com

# Health check
./scripts/deploy-zero-downtime.sh check user@server.com
```

---

## Deploy Trên Server

### Option 1: Zero-Downtime (Khuyến nghị)

```bash
cd ~/documentsManager
./scripts/deploy.sh
```

**Downtime:** 1-2 giây

### Option 2: Deploy Đơn Giản

```bash
cd ~/documentsManager
./scripts/deploy-simple.sh
```

**Downtime:** 30-60 giây

---

## Setup Lần Đầu

### 1. Setup SSH Key

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096

# Copy lên server
ssh-copy-id user@your-server.com
```

### 2. Test Connection

```bash
ssh user@your-server.com "echo 'SSH OK'"
```

### 3. Deploy

```bash
./scripts/deploy-zero-downtime.sh user@your-server.com
```

---

## Options

```bash
# Skip backup
./scripts/deploy-zero-downtime.sh user@server.com --skip-backup

# Skip migration
./scripts/deploy-zero-downtime.sh user@server.com --skip-migration

# Với SSH key
SSH_KEY=~/.ssh/id_rsa ./scripts/deploy-zero-downtime.sh user@server.com
```

---

## Xem Chi Tiết

- **Zero-Downtime Guide:** `docs/deploy-zero-downtime-guide.md`
- **Deployment Automation:** `docs/deployment-automation.md`
- **Deployment Guide:** `docs/deployment-guide.md`
