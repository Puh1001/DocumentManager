#!/bin/bash

# ISO Docs - Remote Deployment Script
# Deploys to remote server via SSH
# Usage: ./scripts/deploy-remote.sh [user@]hostname [--skip-backup] [--skip-migration]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REMOTE_HOST="${1:-}"
REMOTE_DIR="${REMOTE_DIR:-~/documentsManager}"
SSH_KEY="${SSH_KEY:-}"

if [ -z "$REMOTE_HOST" ]; then
  echo -e "${RED}Usage: $0 [user@]hostname [options]${NC}"
  echo "Example: $0 user@192.168.1.100"
  exit 1
fi

# Parse options
SKIP_BACKUP=false
SKIP_MIGRATION=false
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Build SSH command
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD $REMOTE_HOST"

echo -e "${BLUE}🚀 Starting remote deployment to $REMOTE_HOST${NC}"

# Step 1: Push code to GitHub (if needed)
echo -e "${BLUE}📤 Checking if code needs to be pushed...${NC}"
if [ -d ".git" ]; then
  CURRENT_BRANCH=$(git branch --show-current)
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes. Commit them first?${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
  
  # Push to remote if needed
  git push origin "$CURRENT_BRANCH" || echo -e "${YELLOW}⚠️  Git push skipped${NC}"
fi

# Step 2: SSH into server and run deployment
echo -e "${BLUE}🔌 Connecting to $REMOTE_HOST...${NC}"

# Build remote command
REMOTE_CMD="cd $REMOTE_DIR && "
REMOTE_CMD+="if [ ! -f scripts/deploy.sh ]; then git pull origin main || git pull origin master; fi && "
REMOTE_CMD+="chmod +x scripts/deploy.sh && "
REMOTE_CMD+="./scripts/deploy.sh"

if [ "$SKIP_BACKUP" = true ]; then
  REMOTE_CMD+=" --skip-backup"
fi

if [ "$SKIP_MIGRATION" = true ]; then
  REMOTE_CMD+=" --skip-migration"
fi

# Execute remote deployment
$SSH_CMD "$REMOTE_CMD" || {
  echo -e "${RED}❌ Remote deployment failed${NC}"
  exit 1
}

echo -e "${GREEN}✅ Remote deployment completed successfully!${NC}"

