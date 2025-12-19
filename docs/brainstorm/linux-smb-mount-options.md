# Brainstorm: Cách Mount Ổ Chung SMB với Server Linux

**Date:** 2024-12-18  
**Context:** Deploy backend trên Ubuntu server, cần mount SMB share từ Windows server (10.0.60.30/Public)

---

## Problem Statement

### Requirements

- **Source:** Windows SMB share tại `\\10.0.60.30\Public`
- **Target:** Ubuntu server cần mount để backend có thể access files
- **Domain:** `bestpacific.com`
- **Authentication:** Username/password với domain
- **Base Path:** `IT-Information Technology Dept\devTest`
- **High Availability:** 2 Ubuntu servers mount chung 1 storage (future)

### Constraints

- Backend chạy trong Docker container
- Cần mount persistent (survive reboot)
- Cần auto-mount khi server restart
- Phải handle mount failures gracefully
- Security: Credentials không được expose trong code

---

## Solution Options

### Option 1: Manual Mount với CIFS-Utils ⭐ **SIMPLE**

**Approach:** Install `cifs-utils`, mount manually, add to `/etc/fstab` for persistence

**Setup:**

```bash
# 1. Install cifs-utils
sudo apt-get update
sudo apt-get install cifs-utils

# 2. Create mount point
sudo mkdir -p /mnt/smb

# 3. Create credentials file (secure)
sudo nano /etc/smb-credentials
# Content:
username=your-username
password=your-password
domain=bestpacific.com

# 4. Secure credentials file
sudo chmod 600 /etc/smb-credentials

# 5. Manual mount (test first)
sudo mount -t cifs //10.0.60.30/Public /mnt/smb \
  -o credentials=/etc/smb-credentials,uid=1000,gid=1000,file_mode=0664,dir_mode=0775

# 6. Verify mount
ls /mnt/smb

# 7. Add to /etc/fstab for auto-mount
sudo nano /etc/fstab
# Add line:
//10.0.60.30/Public /mnt/smb cifs credentials=/etc/smb-credentials,uid=1000,gid=1000,file_mode=0664,dir_mode=0775,iocharset=utf8,vers=3.0 0 0

# 8. Test fstab entry
sudo mount -a
```

**Pros:**

- ✅ **Simple** - Standard Linux approach
- ✅ **Persistent** - Auto-mount on boot via `/etc/fstab`
- ✅ **Secure** - Credentials in separate file with 600 permissions
- ✅ **Reliable** - Well-tested, widely used
- ✅ **No dependencies** - Only `cifs-utils` package

**Cons:**

- ❌ **Manual setup** - Phải setup trên mỗi server
- ❌ **No auto-retry** - Nếu mount fail, phải manual fix
- ❌ **fstab issues** - Nếu config sai, có thể block boot
- ❌ **No monitoring** - Không có built-in health check

**When to use:**

- Single server deployment
- Simple setup, không cần complex automation
- Có thể manually manage mounts

---

### Option 2: Systemd Service với Auto-Mount ⭐ **RECOMMENDED**

**Approach:** Systemd service để mount SMB share với auto-retry và health checks

**Setup:**

**1. Create mount script:**

```bash
# /usr/local/bin/mount-smb.sh
#!/bin/bash
MOUNT_POINT="/mnt/smb"
SMB_SHARE="//10.0.60.30/Public"
CREDENTIALS="/etc/smb-credentials"

# Check if already mounted
if mountpoint -q "$MOUNT_POINT"; then
    echo "SMB share already mounted"
    exit 0
fi

# Mount SMB share
mount -t cifs "$SMB_SHARE" "$MOUNT_POINT" \
  -o credentials="$CREDENTIALS",uid=1000,gid=1000,file_mode=0664,dir_mode=0775,iocharset=utf8,vers=3.0

if [ $? -eq 0 ]; then
    echo "SMB share mounted successfully"
    exit 0
else
    echo "Failed to mount SMB share"
    exit 1
fi
```

**2. Create systemd service:**

```ini
# /etc/systemd/system/smb-mount.service
[Unit]
Description=Mount SMB Share
After=network-online.target
Wants=network-online.target
Before=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mount-smb.sh
ExecStop=/usr/bin/umount /mnt/smb
RemainAfterExit=yes
Restart=on-failure
RestartSec=30
TimeoutStartSec=60

[Install]
WantedBy=multi-user.target
```

**3. Create systemd timer for health check:**

```ini
# /etc/systemd/system/smb-mount-check.timer
[Unit]
Description=Check SMB Mount Health
Requires=smb-mount.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/smb-mount-check.service
[Unit]
Description=Check SMB Mount Health
After=smb-mount.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-smb-mount.sh
```

**4. Enable and start:**

```bash
# Make script executable
sudo chmod +x /usr/local/bin/mount-smb.sh

# Enable service
sudo systemctl enable smb-mount.service
sudo systemctl start smb-mount.service

# Enable health check timer
sudo systemctl enable smb-mount-check.timer
sudo systemctl start smb-mount-check.timer

# Check status
sudo systemctl status smb-mount.service
```

**Pros:**

- ✅ **Auto-retry** - Systemd tự động retry nếu mount fail
- ✅ **Health checks** - Timer check mount health định kỳ
- ✅ **Dependency management** - Mount trước khi Docker start
- ✅ **Logging** - Systemd logs tự động
- ✅ **Production-ready** - Robust, handle failures

**Cons:**

- ❌ **More complex** - Cần setup scripts và services
- ❌ **Maintenance** - Phải maintain scripts
- ❌ **Learning curve** - Cần hiểu systemd

**When to use:**

- Production deployment
- Cần reliability và auto-recovery
- Multiple servers (có thể reuse scripts)
- High availability setup

---

### Option 3: AutoFS (Automatic Mounting)

**Approach:** AutoFS tự động mount khi access, unmount khi idle

**Setup:**

```bash
# 1. Install autofs
sudo apt-get install autofs

# 2. Configure autofs
sudo nano /etc/auto.master
# Add:
/mnt/smb /etc/auto.smb --timeout=300

# 3. Create map file
sudo nano /etc/auto.smb
# Content:
Public -fstype=cifs,credentials=/etc/smb-credentials,uid=1000,gid=1000,file_mode=0664,dir_mode=0775,iocharset=utf8,vers=3.0 ://10.0.60.30/Public

# 4. Restart autofs
sudo systemctl restart autofs

# 5. Test (auto-mounts on access)
ls /mnt/smb/Public
```

**Pros:**

- ✅ **Lazy mounting** - Chỉ mount khi cần
- ✅ **Auto-unmount** - Unmount khi idle (save resources)
- ✅ **Transparent** - Hoạt động như local filesystem

**Cons:**

- ❌ **Latency** - First access có delay (mount time)
- ❌ **Complexity** - Config phức tạp hơn
- ❌ **Not ideal for Docker** - Docker cần mount persistent
- ❌ **Timeout issues** - Có thể unmount khi đang dùng

**When to use:**

- Shared workstations
- Intermittent access
- Resource-constrained environments
- **NOT recommended** for Docker containers

---

### Option 4: Docker Volume với Host Mount

**Approach:** Mount SMB trên host, pass vào Docker như volume

**Setup:**

**1. Mount trên host (Option 1 hoặc 2):**

```bash
# Mount SMB trên host
sudo mount -t cifs //10.0.60.30/Public /mnt/smb \
  -o credentials=/etc/smb-credentials,uid=1000,gid=1000
```

**2. Docker Compose:**

```yaml
# docker-compose.prod.yml
services:
  api:
    image: iso-docs-api:latest
    volumes:
      - /mnt/smb:/shared  # Mount from host to container
    environment:
      - SMB_MOUNT_PATH=/shared
    depends_on:
      - postgres
```

**3. Dockerfile (nếu cần):**

```dockerfile
# No special config needed - just use volume mount
```

**Pros:**

- ✅ **Separation** - Host handles mount, container just uses it
- ✅ **Flexibility** - Có thể change mount method mà không rebuild container
- ✅ **Standard** - Standard Docker volume approach
- ✅ **Isolation** - Container không cần SMB credentials

**Cons:**

- ❌ **Host dependency** - Container phụ thuộc vào host mount
- ❌ **Mount order** - Phải mount trước khi start container

**When to use:**

- **RECOMMENDED** - Best practice cho Docker
- Production deployment
- Kết hợp với Option 1 hoặc 2

---

### Option 5: Docker Volume Plugin (SMB)

**Approach:** Dùng Docker volume plugin để mount SMB trực tiếp trong container

**Setup:**

```bash
# 1. Install SMB volume plugin
docker plugin install vieux/sshfs:latest

# Hoặc dùng local-persist plugin với host mount
# (Không có official SMB plugin, nên dùng host mount thay thế)
```

**Pros:**

- ✅ **Container-native** - Mount trong container
- ✅ **No host setup** - Không cần mount trên host

**Cons:**

- ❌ **Plugin complexity** - Phải maintain plugin
- ❌ **Less common** - Ít dùng, ít support
- ❌ **Not recommended** - Host mount tốt hơn

**When to use:**

- **NOT recommended** - Use Option 4 instead

---

## Comparison Matrix

| Solution | Setup Complexity | Reliability | Auto-Retry | Health Check | Docker-Friendly | Score |
|----------|-----------------|-------------|------------|-------------|-----------------|-------|
| **Manual + fstab** | ⭐⭐ Low | ⭐⭐⭐ Good | ❌ No | ❌ No | ⭐⭐⭐⭐ Good | **6/10** |
| **Systemd Service** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Excellent | ✅ Yes | ✅ Yes | ⭐⭐⭐⭐⭐ Excellent | **9/10** |
| **AutoFS** | ⭐⭐⭐⭐ High | ⭐⭐⭐ Medium | ⭐⭐ Partial | ❌ No | ⭐⭐ Poor | **5/10** |
| **Docker Volume** | ⭐⭐ Low | ⭐⭐⭐⭐ Good | ⭐⭐ Depends | ⭐⭐ Depends | ⭐⭐⭐⭐⭐ Excellent | **8/10** |
| **Docker Plugin** | ⭐⭐⭐⭐ High | ⭐⭐⭐ Medium | ⭐⭐ Partial | ❌ No | ⭐⭐⭐ Medium | **4/10** |

---

## Recommended Solution

### **Hybrid: Systemd Service + Docker Volume** ⭐ **BEST**

**Architecture:**

```
┌─────────────────┐
│  Ubuntu Server  │
│                 │
│  ┌───────────┐  │
│  │ Systemd   │  │  Mounts SMB share
│  │ Service   │  │  /mnt/smb
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Docker    │  │  Volume mount
│  │ Container │  │  /mnt/smb → /shared
│  │ (Backend) │  │
│  └───────────┘  │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│  SMB Share      │
│  10.0.60.30     │
│  /Public        │
└─────────────────┘
```

**Implementation Steps:**

1. **Install cifs-utils:**
   ```bash
   sudo apt-get update
   sudo apt-get install cifs-utils
   ```

2. **Create credentials file:**
   ```bash
   sudo nano /etc/smb-credentials
   # username=your-username
   # password=your-password
   # domain=bestpacific.com
   sudo chmod 600 /etc/smb-credentials
   ```

3. **Create mount script:**
   ```bash
   sudo nano /usr/local/bin/mount-smb.sh
   # (Script from Option 2)
   sudo chmod +x /usr/local/bin/mount-smb.sh
   ```

4. **Create systemd service:**
   ```bash
   sudo nano /etc/systemd/system/smb-mount.service
   # (Service from Option 2)
   ```

5. **Enable and start:**
   ```bash
   sudo systemctl enable smb-mount.service
   sudo systemctl start smb-mount.service
   ```

6. **Verify mount:**
   ```bash
   ls /mnt/smb
   mount | grep smb
   ```

7. **Update Docker Compose:**
   ```yaml
   services:
     api:
       volumes:
         - /mnt/smb:/shared
       environment:
         - SMB_MOUNT_PATH=/shared
   ```

8. **Test container access:**
   ```bash
   docker-compose exec api ls /shared
   ```

---

## High Availability Setup (2 Servers)

### Architecture

```
┌─────────────┐                    ┌─────────────┐
│ Server 1    │                    │ Server 2    │
│ (Ubuntu)    │                    │ (Ubuntu)    │
│             │                    │             │
│ /mnt/smb    │                    │ /mnt/smb    │
│ (mounted)   │                    │ (mounted)   │
└──────┬──────┘                    └──────┬──────┘
       │                                   │
       └──────────────┬───────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │  SMB Share      │
            │  10.0.60.30     │
            │  /Public        │
            └─────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │  Load Balancer  │
            │  (Nginx/HAProxy)│
            └─────────────────┘
```

### Setup Steps

1. **Setup Systemd Service trên cả 2 servers:**
   - Copy scripts và configs
   - Enable services
   - Verify mounts

2. **Configure Load Balancer:**
   ```nginx
   # nginx.conf
   upstream backend {
       server server1:3001;
       server server2:3001;
   }
   
   server {
       location /api {
           proxy_pass http://backend;
       }
   }
   ```

3. **Shared Storage Benefits:**
   - Both servers access same files
   - No data sync needed
   - Consistent file state

---

## Security Considerations

### 1. Credentials File

```bash
# Secure permissions
sudo chmod 600 /etc/smb-credentials
sudo chown root:root /etc/smb-credentials
```

### 2. Network Security

- Use VPN or private network
- Firewall rules: Only allow SMB ports (445, 139)
- Consider SMB signing for encryption

### 3. File Permissions

```bash
# Mount options
uid=1000,gid=1000          # Match Docker user
file_mode=0664             # Read/write for owner/group
dir_mode=0775              # Execute for directories
```

### 4. Credentials Rotation

- Rotate passwords regularly
- Use service account (not personal account)
- Store credentials in secrets manager (future)

---

## Troubleshooting

### Mount Fails

```bash
# Check credentials
sudo cat /etc/smb-credentials

# Test mount manually
sudo mount -t cifs //10.0.60.30/Public /mnt/smb -o credentials=/etc/smb-credentials

# Check logs
sudo journalctl -u smb-mount.service -f

# Check network
ping 10.0.60.30
telnet 10.0.60.30 445
```

### Permission Denied

```bash
# Check mount options
mount | grep smb

# Verify uid/gid
id

# Check file permissions
ls -la /mnt/smb
```

### Auto-Mount Not Working

```bash
# Check fstab syntax
sudo mount -a

# Check systemd service
sudo systemctl status smb-mount.service
sudo journalctl -u smb-mount.service
```

### Docker Container Can't Access

```bash
# Verify host mount
ls /mnt/smb

# Check Docker volume
docker-compose exec api ls /shared

# Check container user
docker-compose exec api id
```

---

## Implementation Checklist

- [ ] Install `cifs-utils` package
- [ ] Create `/etc/smb-credentials` file (secure permissions)
- [ ] Create mount script `/usr/local/bin/mount-smb.sh`
- [ ] Create systemd service `/etc/systemd/system/smb-mount.service`
- [ ] Enable and start systemd service
- [ ] Verify mount: `ls /mnt/smb`
- [ ] Update Docker Compose with volume mount
- [ ] Test container access: `docker-compose exec api ls /shared`
- [ ] Setup health check timer (optional)
- [ ] Document credentials rotation process
- [ ] Test auto-mount on reboot

---

## Success Metrics

- ✅ SMB share mounts successfully on boot
- ✅ Systemd service auto-retries on failure
- ✅ Docker container can access `/shared` path
- ✅ File operations work correctly
- ✅ Mount survives server reboot
- ✅ Health checks detect mount failures

---

## Next Steps

1. **Choose approach:** Systemd Service + Docker Volume (recommended)
2. **Setup on dev server:** Test mount và Docker access
3. **Document process:** Create runbook cho production
4. **Setup on prod servers:** Deploy to both servers
5. **Configure load balancer:** Route traffic to both servers
6. **Monitor:** Setup alerts cho mount failures

---

**Decision:** **Systemd Service + Docker Volume** là best practice cho production deployment với Docker containers. Approach này đảm bảo reliability, auto-recovery, và dễ maintain.

