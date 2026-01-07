# Deploy Script Improvements - Dựa Trên Best Practices

**Date:** 2025-01-06  
**Version:** 2.0

---

## Cải Thiện Đã Áp Dụng

Dựa trên script tham khảo từ Machine-Status project, đã cải thiện script deploy với:

### 1. SSH Check Trước Khi Deploy ✅

**Trước:**

- Không check SSH, lỗi mới biết

**Sau:**

- Check SSH connection trước khi deploy
- Hiển thị lỗi rõ ràng nếu không kết nối được
- Hướng dẫn troubleshooting

```bash
check_ssh_access() {
    # Test SSH connection với timeout
    # Hiển thị lỗi và hướng dẫn nếu fail
}
```

---

### 2. Better Error Handling ✅

**Trước:**

- Lỗi chung chung
- Khó debug

**Sau:**

- Error messages rõ ràng
- Troubleshooting steps tự động
- Exit codes đúng

---

### 3. Health Check Sau Deploy ✅

**Trước:**

- Không có health check tự động

**Sau:**

- Tự động health check sau deploy
- Hiển thị container status
- Check API và Web endpoints

---

### 4. Status/Logs/Check Commands ✅

**Trước:**

- Chỉ có deploy command

**Sau:**

- `status` - Xem server status
- `logs` - Xem application logs
- `check` - Quick health check

```bash
# Check status
./scripts/deploy-zero-downtime.sh status user@server.com

# Xem logs
./scripts/deploy-zero-downtime.sh logs user@server.com

# Health check
./scripts/deploy-zero-downtime.sh check user@server.com
```

---

### 5. Better Git Handling ✅

**Trước:**

- `git pull` đơn giản

**Sau:**

- `git fetch` + `git reset --hard` để đảm bảo code mới nhất
- Xử lý cả main và master branch
- Error handling tốt hơn

---

### 6. Improved Logging ✅

**Trước:**

- Log đơn giản

**Sau:**

- Structured logging với colors
- `log_info()`, `log_success()`, `log_warning()`, `log_error()`
- Dễ đọc và debug hơn

---

## So Sánh

| Feature            | Trước      | Sau                    |
| ------------------ | ---------- | ---------------------- |
| **SSH Check**      | ❌         | ✅                     |
| **Error Handling** | Cơ bản     | Nâng cao               |
| **Health Check**   | ❌         | ✅                     |
| **Status Command** | ❌         | ✅                     |
| **Logs Command**   | ❌         | ✅                     |
| **Git Handling**   | `git pull` | `fetch + reset --hard` |
| **Logging**        | Đơn giản   | Structured             |

---

## Cách Sử Dụng

### Deploy

```bash
./scripts/deploy-zero-downtime.sh user@server.com
```

### Check Status

```bash
./scripts/deploy-zero-downtime.sh status user@server.com
```

**Hiển thị:**

- Git status
- Container status
- System resources

### Xem Logs

```bash
./scripts/deploy-zero-downtime.sh logs user@server.com
```

**Hiển thị:**

- Application logs (last 100 lines)
- Follow mode (real-time)

### Health Check

```bash
./scripts/deploy-zero-downtime.sh check user@server.com
```

**Hiển thị:**

- Container status
- API health check
- Web health check

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

## Troubleshooting

### Lỗi: SSH Connection Failed

Script sẽ tự động check và hiển thị:

```
[ERROR] Cannot connect to server via SSH
[INFO] Please ensure:
[INFO]   1. SSH key is added to server
[INFO]   2. Server details are correct: user@server.com
[INFO]   3. Server is accessible
[INFO]
[INFO] Test connection: ssh user@server.com
```

### Lỗi: Directory Not Found

Script sẽ check và báo lỗi rõ ràng:

```
❌ Directory not found: ~/documentsManager
```

**Fix:**

```bash
# Clone repository trên server
ssh user@server.com "git clone <repo-url> ~/documentsManager"
```

---

## Best Practices Từ Script Tham Khảo

### 1. Validate Trước Khi Deploy

- ✅ Check SSH access
- ✅ Check prerequisites
- ✅ Validate configuration

### 2. Better Error Messages

- ✅ Hiển thị lỗi rõ ràng
- ✅ Hướng dẫn troubleshooting
- ✅ Exit codes đúng

### 3. Health Checks

- ✅ Check sau deploy
- ✅ Verify services healthy
- ✅ Quick status check

### 4. Multiple Commands

- ✅ Deploy command
- ✅ Status command
- ✅ Logs command
- ✅ Check command

---

## Kết Luận

Script đã được cải thiện với:

- ✅ SSH check tự động
- ✅ Better error handling
- ✅ Health checks
- ✅ Status/logs/check commands
- ✅ Improved logging
- ✅ Better git handling

**Kết quả:** Script professional hơn, dễ dùng hơn, và dễ debug hơn!
