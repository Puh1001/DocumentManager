#!/bin/bash
# SMB Mount Script for Linux Production
# Usage: Place in /usr/local/bin/mount-smb.sh
# Make executable: chmod +x /usr/local/bin/mount-smb.sh

MOUNT_POINT="/mnt/smb"
SMB_SHARE="//10.0.60.30/Public"
CREDENTIALS="/etc/smb-credentials"

# Check if already mounted
if mountpoint -q "$MOUNT_POINT"; then
    echo "SMB share already mounted"
    exit 0
fi

# Create mount point if not exists
mkdir -p "$MOUNT_POINT"

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
