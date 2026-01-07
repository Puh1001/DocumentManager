# Debug Report: SSH Connection Timeout During Deployment

**Date:** 2026-01-07  
**Issue:** SSH connection bị ngắt trong quá trình deployment  
**Status:** Root cause identified, fix ready

---

## Problem Summary

Deployment bị dừng với lỗi:
```
Read from remote host 10.0.60.238: Connection reset by peer
client_loop: send disconnect: Connection reset by peer
```

Lỗi xảy ra khi đang build Docker images trên remote server qua SSH.

---

## Root Cause Analysis

### 5 Whys Analysis

1. **Tại sao connection bị ngắt?**
   - SSH connection timeout do không có activity trong thời gian dài

2. **Tại sao SSH timeout?**
   - Build process quá lâu:
     - `apt-get update && install`: 207.4s (~3.5 phút)
     - `npm ci`: 238.9s (~4 phút)
     - Tổng cộng: >7 phút không có output

3. **Tại sao không có keepalive?**
   - Script không cấu hình SSH keepalive options
   - SSH mặc định timeout sau một khoảng thời gian không có activity

4. **Tại sao build chạy trực tiếp qua SSH?**
   - Script dùng SSH heredoc để chạy commands
   - Build process chạy trong SSH session, không có detach

5. **Tại sao không dùng nohup/screen/tmux?**
   - Script thiết kế để chạy trực tiếp, không có background process

---

## Evidence

### Logs từ deployment

```
# Build process bắt đầu
[2026-01-07 04:39:05] Building Docker images...
Building api

# apt-get install mất 207.4s
#7 [builder  3/12] RUN apt-get update && apt-get install -y ...
#7 DONE 207.4s

# npm ci mất 238.9s
#10 [runner 5/9] RUN npm ci --only=production
#10 DONE 238.9s

# npm ci trong builder stage
#14 [builder  7/12] RUN npm ci
#14 ... (đang chạy)

# Connection bị ngắt
Read from remote host 10.0.60.238: Connection reset by peer
client_loop: send disconnect: Connection reset by peer
```

### Timeline

- **04:39:05** - Bắt đầu build
- **04:42:32** - apt-get hoàn thành (207s)
- **04:46:31** - npm ci (production) hoàn thành (238s)
- **04:46:31+** - npm ci (builder) đang chạy → **Connection timeout**

**Tổng thời gian:** >7 phút không có output từ Docker build

### SSH Configuration trong Script

```bash
# Line 104: SSH command chỉ có ConnectTimeout
ssh_test_cmd="$ssh_test_cmd -o ConnectTimeout=10 -o BatchMode=yes $REMOTE_HOST"

# Line 291: SSH command cho deployment không có keepalive
$SSH_CMD bash << REMOTE_DEPLOY_SCRIPT
```

**Vấn đề:** Không có `ServerAliveInterval` và `ServerAliveCountMax`

---

## Root Cause

**Vấn đề:** SSH connection timeout do:
1. Build process quá lâu (>7 phút) không có output
2. SSH không có keepalive mechanism
3. Network/firewall có thể drop idle connections

**Tại sao build quá lâu:**
- Docker build chạy trên remote server
- apt-get install dependencies: ~3.5 phút
- npm ci install packages: ~4 phút
- Tổng cộng >7 phút, vượt quá SSH idle timeout

---

## Fix Plan

### Solution 1: Add SSH Keepalive (Recommended)

**Thêm SSH keepalive options vào SSH command:**

```bash
# In deploy-zero-downtime.sh
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
# Add keepalive options
SSH_CMD="$SSH_CMD -o ServerAliveInterval=60"
SSH_CMD="$SSH_CMD -o ServerAliveCountMax=10"
SSH_CMD="$SSH_CMD -o TCPKeepAlive=yes"
SSH_CMD="$SSH_CMD $REMOTE_HOST"
```

**Lý do:**
- `ServerAliveInterval=60`: Gửi keepalive mỗi 60 giây
- `ServerAliveCountMax=10`: Cho phép 10 lần timeout trước khi disconnect
- `TCPKeepAlive=yes`: Enable TCP-level keepalive
- **Total timeout:** 60s × 10 = 10 phút (đủ cho build process)

### Solution 2: Run Build in Background with nohup

**Chạy build trong background:**

```bash
# In remote deployment script
nohup ./scripts/deploy.sh > deploy.log 2>&1 &
DEPLOY_PID=$!

# Wait for completion
wait $DEPLOY_PID
```

**Lý do:**
- Build chạy độc lập, không phụ thuộc SSH session
- SSH có thể disconnect, build vẫn tiếp tục
- Có thể check status sau

### Solution 3: Use screen/tmux

**Chạy deployment trong screen:**

```bash
# In remote deployment script
screen -dmS deployment ./scripts/deploy.sh
# Or
tmux new-session -d -s deployment './scripts/deploy.sh'
```

**Lý do:**
- Session persist ngay cả khi SSH disconnect
- Có thể reconnect và monitor
- Phù hợp cho long-running processes

### Solution 4: Pre-build Images Locally

**Build images trên local, push lên registry, pull trên server:**

```bash
# Local
docker-compose build
docker-compose push

# Remote
docker-compose pull
docker-compose up -d
```

**Lý do:**
- Build nhanh hơn trên local (có cache)
- Remote chỉ cần pull images
- Không phụ thuộc SSH session

---

## Recommended Fix

**Chọn Solution 1** vì:
- ✅ Đơn giản, ít thay đổi code
- ✅ Giữ nguyên workflow hiện tại
- ✅ Không cần thay đổi infrastructure
- ✅ Phù hợp với build time hiện tại (7-10 phút)

**Thay đổi cần thiết:**
1. Thêm SSH keepalive options vào `SSH_CMD` trong `deploy-zero-downtime.sh`
2. Cập nhật `check_ssh_access()` để dùng cùng options
3. Test với build process thực tế

---

## Implementation

### File to Modify

`scripts/deploy-zero-downtime.sh`

### Changes

**Line ~100-118 (check_ssh_access function):**
```bash
check_ssh_access() {
    log_info "Checking SSH access to server..."
    
    local ssh_test_cmd="ssh"
    if [ -n "$SSH_KEY" ]; then
        ssh_test_cmd="$ssh_test_cmd -i $SSH_KEY"
    fi
    # Add keepalive options
    ssh_test_cmd="$ssh_test_cmd -o ConnectTimeout=10"
    ssh_test_cmd="$ssh_test_cmd -o ServerAliveInterval=60"
    ssh_test_cmd="$ssh_test_cmd -o ServerAliveCountMax=10"
    ssh_test_cmd="$ssh_test_cmd -o TCPKeepAlive=yes"
    ssh_test_cmd="$ssh_test_cmd -o BatchMode=yes"
    ssh_test_cmd="$ssh_test_cmd $REMOTE_HOST"
    
    if $ssh_test_cmd exit 2>/dev/null; then
        log_success "SSH access confirmed"
    else
        # ... error handling
    fi
}
```

**Line ~150-170 (Build SSH_CMD):**
```bash
# Build SSH command
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
# Add keepalive options
SSH_CMD="$SSH_CMD -o ServerAliveInterval=60"
SSH_CMD="$SSH_CMD -o ServerAliveCountMax=10"
SSH_CMD="$SSH_CMD -o TCPKeepAlive=yes"
SSH_CMD="$SSH_CMD $REMOTE_HOST"
```

---

## Verification

Sau khi fix, verify bằng cách:

1. **Test SSH keepalive:**
   ```bash
   ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=10 user@host "sleep 600; echo done"
   ```

2. **Test deployment với build:**
   ```bash
   ./scripts/deploy-zero-downtime.sh bp_admin@10.0.60.238
   ```

3. **Monitor connection:**
   - Check SSH connection không bị ngắt trong quá trình build
   - Verify deployment hoàn thành thành công

---

## Related Files

- `scripts/deploy-zero-downtime.sh` - Main deployment script
- `scripts/deploy.sh` - Server-side deployment script
- `scripts/deploy-remote.sh` - Alternative remote deployment script

---

## Notes

- SSH keepalive sẽ gửi packets mỗi 60 giây
- Với `ServerAliveCountMax=10`, total timeout = 60s × 10 = 10 phút
- Nếu build >10 phút, cần tăng `ServerAliveCountMax` hoặc dùng Solution 2/3
- Network/firewall có thể drop connections, keepalive giúp maintain connection

