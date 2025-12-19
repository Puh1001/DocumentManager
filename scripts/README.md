# SMB Mount Scripts

Scripts và configuration files để setup SMB mount trên Linux server.

## Files

- `mount-smb.sh` - Script để mount SMB share
- `check-smb-mount.sh` - Health check script
- `smb-mount.service` - Systemd service file
- `smb-mount-check.timer` - Health check timer
- `smb-mount-check.service` - Health check service

## Setup Instructions

### 1. Install cifs-utils

```bash
sudo apt-get update
sudo apt-get install cifs-utils
```

### 2. Create Credentials File

```bash
sudo nano /etc/smb-credentials
```

Add:

```
username=your-username
password=your-password
domain=bestpacific.com
```

Secure:

```bash
sudo chmod 600 /etc/smb-credentials
sudo chown root:root /etc/smb-credentials
```

### 3. Copy Scripts

```bash
# Copy mount script
sudo cp scripts/mount-smb.sh /usr/local/bin/mount-smb.sh
sudo chmod +x /usr/local/bin/mount-smb.sh

# Copy health check script
sudo cp scripts/check-smb-mount.sh /usr/local/bin/check-smb-mount.sh
sudo chmod +x /usr/local/bin/check-smb-mount.sh
```

### 4. Copy Systemd Files

```bash
# Copy service files
sudo cp scripts/smb-mount.service /etc/systemd/system/smb-mount.service
sudo cp scripts/smb-mount-check.service /etc/systemd/system/smb-mount-check.service
sudo cp scripts/smb-mount-check.timer /etc/systemd/system/smb-mount-check.timer

# Reload systemd
sudo systemctl daemon-reload
```

### 5. Enable and Start

```bash
# Enable and start mount service
sudo systemctl enable smb-mount.service
sudo systemctl start smb-mount.service

# Enable health check timer
sudo systemctl enable smb-mount-check.timer
sudo systemctl start smb-mount-check.timer

# Check status
sudo systemctl status smb-mount.service
```

### 6. Verify

```bash
# Check mount
ls /mnt/smb
mount | grep smb

# View logs
sudo journalctl -u smb-mount.service -f
```

## Customization

### Update SMB Server/Share

Edit `/usr/local/bin/mount-smb.sh`:

- `SMB_SHARE`: Change to your SMB server/share
- `MOUNT_POINT`: Change mount point if needed

### Update Mount Options

Edit mount command in `/usr/local/bin/mount-smb.sh`:

- `uid=1000,gid=1000`: Match Docker container user
- `file_mode=0664,dir_mode=0775`: Adjust permissions as needed
- `vers=3.0`: SMB version (try 2.0 or 1.0 if 3.0 fails)

## Troubleshooting

See `docs/deployment-guide.md` for detailed troubleshooting steps.
