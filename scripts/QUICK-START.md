# Quick Start - Deploy Tự Động

## 🚀 Deploy từ Local Machine (Khuyến Nghị)

### Windows (PowerShell)

```powershell
# Cơ bản
.\scripts\deploy-auto.ps1 -Host "user@your-server.com"

# Bỏ qua backup (nhanh hơn)
.\scripts\deploy-auto.ps1 -Host "user@your-server.com" -SkipBackup

# Build không cache (sạch hơn)
.\scripts\deploy-auto.ps1 -Host "user@your-server.com" -NoCache

# Custom SSH key
.\scripts\deploy-auto.ps1 -Host "user@your-server.com" -SshKey "C:\Users\YourName\.ssh\id_rsa"

# Custom server path
$env:REMOTE_DIR="/var/www/documentsManager"
.\scripts\deploy-auto.ps1 -Host "user@your-server.com"
```

### Linux/Mac (Bash)

```bash
# Cơ bản
./scripts/deploy-auto.sh user@your-server.com

# Bỏ qua backup
./scripts/deploy-auto.sh user@your-server.com --skip-backup

# Build không cache
./scripts/deploy-auto.sh user@your-server.com --no-cache

# Custom SSH key
SSH_KEY=~/.ssh/id_rsa ./scripts/deploy-auto.sh user@your-server.com

# Custom server path
REMOTE_DIR=/var/www/documentsManager ./scripts/deploy-auto.sh user@your-server.com
```

## ✅ Script Tự Động Làm Gì?

1. **Kiểm tra Git** - Commit và push code nếu có thay đổi
2. **Kết nối Server** - SSH vào server
3. **Pull Code** - Tự động pull code mới nhất
4. **Build Images** - Build Docker images
5. **Backup DB** - Backup database (trừ khi dùng --skip-backup)
6. **Deploy Zero-Downtime** - Deploy không downtime
7. **Chạy Migration** - **Tự động chạy migration** ✅
8. **Health Check** - Kiểm tra API và Web
9. **Cleanup** - Dọn dẹp images cũ

## 🔧 Setup Lần Đầu

### 1. Cấu hình SSH

```bash
# Tạo SSH key (nếu chưa có)
ssh-keygen -t rsa -b 4096

# Copy key lên server
ssh-copy-id user@your-server.com

# Test kết nối
ssh user@your-server.com
```

### 2. Clone Repository trên Server

```bash
# SSH vào server
ssh user@your-server.com

# Clone repo
git clone https://github.com/your-org/documentsManager.git ~/documentsManager
cd ~/documentsManager

# Setup environment
cp .env.example .env.production
# Edit .env.production với thông tin production
```

### 3. Deploy Lần Đầu

```bash
# Từ local machine
./scripts/deploy-auto.sh user@your-server.com
```

## 📝 Lưu Ý

- **Migration tự động:** Script sẽ tự động chạy `prisma migrate deploy` - không cần chạy thủ công!
- **Zero-downtime:** Script sử dụng rolling update để không có downtime
- **Health check:** Script sẽ đợi API healthy trước khi hoàn thành
- **Retry logic:** Migration có retry logic (10 lần) để đảm bảo thành công

## 🐛 Troubleshooting

### Lỗi SSH Connection

```bash
# Test SSH
ssh user@your-server.com

# Nếu cần dùng SSH key
ssh -i ~/.ssh/id_rsa user@your-server.com
```

### Lỗi Migration

```bash
# SSH vào server và check logs
ssh user@your-server.com
cd ~/documentsManager
docker-compose -f docker-compose.prod.yml logs api

# Chạy migration thủ công nếu cần
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Lỗi Build

```bash
# Check Docker
docker --version
docker-compose --version

# Check disk space
df -h
```

## 📚 Xem Thêm

- `README.md` - Tổng quan tất cả scripts
- `docs/deployment-automation.md` - Chi tiết deployment
