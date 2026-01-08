# Deployment Scripts

Scripts tự động hóa deployment cho ISO Document Management System.

## Scripts

### 1. `deploy-auto.sh` / `deploy-auto.ps1` ⭐⭐ Khuyến Nghị (Deploy từ Local)

**Script tự động hoàn toàn:** Pull code, Build, Migrate, Deploy với Zero-Downtime - Tất cả từ local machine!

**Tính năng:**
- ✅ Tự động pull code trên server
- ✅ Tự động chạy migration (không cần thủ công)
- ✅ Zero-downtime deployment
- ✅ Health check tự động
- ✅ Backup database tự động

**Linux/Mac:**
```bash
./scripts/deploy-auto.sh user@192.168.1.100
./scripts/deploy-auto.sh user@server.com --skip-backup
```

**Windows:**
```powershell
.\scripts\deploy-auto.ps1 -Host "user@192.168.1.100"
.\scripts\deploy-auto.ps1 -Host "user@server.com" -SkipBackup
```

**Thời gian:** 5-8 phút  
**Downtime:** 0 giây (zero-downtime)  
**Migration:** Tự động ✅

**Environment Variables:**
```bash
export REMOTE_DIR="/var/www/documentsManager"  # Custom server path
export SSH_KEY="~/.ssh/id_rsa"                 # Custom SSH key
export REPO_URL="https://github.com/..."      # Auto-detected from git
```

---

### 2. `deploy-simple.sh`

Script đơn giản nhất, phù hợp cho deploy nhanh trên server.

```bash
./scripts/deploy-simple.sh
```

**Thời gian:** 3-5 phút  
**Downtime:** 30-60 giây  
**Migration:** Tự động ✅

---

### 3. `deploy.sh`

Script đầy đủ với zero-downtime deployment (chạy trên server).

```bash
./scripts/deploy.sh
./scripts/deploy.sh --skip-backup
./scripts/deploy.sh --skip-migration
```

**Thời gian:** 5-8 phút  
**Downtime:** 0 giây (zero-downtime)  
**Migration:** Tự động ✅ (trừ khi dùng --skip-migration)

---

### 4. `deploy-remote.sh` / `deploy-remote.ps1`

Deploy từ local machine lên server qua SSH (legacy, dùng `deploy-auto.sh` thay thế).

**Linux/Mac:**
```bash
./scripts/deploy-remote.sh user@192.168.1.100
```

**Windows:**
```powershell
.\scripts\deploy-remote.ps1 -Host "user@192.168.1.100"
```

---

## Quick Start

### Lần Đầu Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/documentsManager.git
cd documentsManager

# 2. Make scripts executable
chmod +x scripts/*.sh

# 3. Setup environment
cp .env.example .env.production
# Edit .env.production

# 4. Deploy
./scripts/deploy-simple.sh
```

### Deploy Thường Xuyên

**Khuyến nghị: Deploy từ Local (Tự động hoàn toàn)**

```bash
# Linux/Mac - Từ local machine
./scripts/deploy-auto.sh user@server.com

# Windows PowerShell - Từ local machine
.\scripts\deploy-auto.ps1 -Host "user@server.com"
```

**Hoặc deploy trực tiếp trên server:**

```bash
# Trên server
cd ~/documentsManager
./scripts/deploy-simple.sh
# hoặc
./scripts/deploy.sh
```

**Lưu ý:** Script `deploy-auto.sh` tự động:
- Push code lên git (nếu có thay đổi)
- Pull code trên server
- Build Docker images
- Backup database
- Chạy migration tự động
- Deploy zero-downtime
- Health check

---

## Xem Chi Tiết

Xem `docs/deployment-automation.md` để biết thêm chi tiết.

