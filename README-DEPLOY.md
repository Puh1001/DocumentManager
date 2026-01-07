# 🚀 Quick Deploy Guide

## Deploy Đơn Giản (Khuyến Nghị)

### Trên Server:

```bash
cd ~/documentsManager
./scripts/deploy-simple.sh
```

**Chỉ 1 lệnh!** Script sẽ tự động:
- ✅ Pull code mới
- ✅ Backup database
- ✅ Build và deploy
- ✅ Chạy migrations
- ✅ Cleanup

---

## Deploy Zero-Downtime

```bash
cd ~/documentsManager
./scripts/deploy.sh
```

**Zero-downtime** với health checks tự động.

---

## Deploy Từ Local

```bash
# Push code lên GitHub
git push origin main

# Deploy lên server qua SSH
./scripts/deploy-remote.sh user@your-server.com
```

---

## Xem Chi Tiết

Xem file `docs/deployment-automation.md` để biết thêm chi tiết.

