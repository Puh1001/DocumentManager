# Deployment Scripts

Scripts tự động hóa deployment cho ISO Document Management System.

## Scripts

### 1. `deploy-simple.sh` ⭐ Khuyến Nghị

Script đơn giản nhất, phù hợp cho deploy nhanh.

```bash
./scripts/deploy-simple.sh
```

**Thời gian:** 3-5 phút  
**Downtime:** 30-60 giây

---

### 2. `deploy.sh`

Script đầy đủ với zero-downtime deployment.

```bash
./scripts/deploy.sh
./scripts/deploy.sh --skip-backup
./scripts/deploy.sh --skip-migration
```

**Thời gian:** 5-8 phút  
**Downtime:** 0 giây (zero-downtime)

---

### 3. `deploy-remote.sh` / `deploy-remote.ps1`

Deploy từ local machine lên server qua SSH.

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

```bash
# Trên server
cd ~/documentsManager
./scripts/deploy-simple.sh

# Hoặc từ local
./scripts/deploy-remote.sh user@server.com
```

---

## Xem Chi Tiết

Xem `docs/deployment-automation.md` để biết thêm chi tiết.

