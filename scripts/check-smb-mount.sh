#!/bin/bash
# SMB Mount Health Check Script
# Usage: Place in /usr/local/bin/check-smb-mount.sh
# Make executable: chmod +x /usr/local/bin/check-smb-mount.sh

MOUNT_POINT="/mnt/smb"

if ! mountpoint -q "$MOUNT_POINT"; then
    echo "SMB mount is not active, attempting to remount..."
    systemctl restart smb-mount.service
    exit 1
fi

echo "SMB mount is healthy"
exit 0

