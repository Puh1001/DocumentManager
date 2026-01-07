#!/bin/bash

# ISO Docs - Zero-Downtime Deployment Script (Từ Local)
# Usage: ./scripts/deploy-zero-downtime.sh [user@]hostname [options]

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
  echo ""
  echo "Options:"
  echo "  --skip-backup      Skip database backup"
  echo "  --skip-migration   Skip database migrations"
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
      echo -e "${YELLOW}Unknown option: $1${NC}"
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

echo -e "${BLUE}🚀 Zero-Downtime Deployment to $REMOTE_HOST${NC}"
echo ""

# Step 1: Check git status
echo -e "${BLUE}📤 Step 1: Checking git status...${NC}"
if [ -d ".git" ]; then
  CURRENT_BRANCH=$(git branch --show-current)
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes.${NC}"
    read -p "Commit them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      read -p "Commit message: " COMMIT_MSG
      git add .
      git commit -m "${COMMIT_MSG:-Deploy: Auto commit}"
    else
      echo -e "${YELLOW}⚠️  Continuing with uncommitted changes...${NC}"
    fi
  fi
  
  # Push to remote
  echo -e "${BLUE}Pushing to GitHub...${NC}"
  git push origin "$CURRENT_BRANCH" || {
    echo -e "${YELLOW}⚠️  Git push failed, continuing anyway...${NC}"
  }
else
  echo -e "${YELLOW}⚠️  Not a git repository, skipping git push${NC}"
fi

echo ""

# Step 2: Deploy to server
echo -e "${BLUE}🔌 Step 2: Connecting to $REMOTE_HOST...${NC}"

# Build remote command
REMOTE_CMD="cd $REMOTE_DIR && "
REMOTE_CMD+="echo '📥 Pulling latest code...' && "
REMOTE_CMD+="git pull origin main || git pull origin master || echo '⚠️  Git pull skipped' && "
REMOTE_CMD+="echo '' && "
REMOTE_CMD+="echo '🔧 Making scripts executable...' && "
REMOTE_CMD+="chmod +x scripts/deploy.sh 2>/dev/null || true && "
REMOTE_CMD+="echo '' && "
REMOTE_CMD+="echo '🚀 Starting zero-downtime deployment...' && "
REMOTE_CMD+="./scripts/deploy.sh"

if [ "$SKIP_BACKUP" = true ]; then
  REMOTE_CMD+=" --skip-backup"
fi

if [ "$SKIP_MIGRATION" = true ]; then
  REMOTE_CMD+=" --skip-migration"
fi

# Execute remote deployment
echo ""
$SSH_CMD "$REMOTE_CMD" || {
  echo ""
  echo -e "${RED}❌ Deployment failed!${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check SSH connection: ssh $REMOTE_HOST"
  echo "2. Check server logs: ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose logs'"
  echo "3. Check script exists: ssh $REMOTE_HOST 'ls -la $REMOTE_DIR/scripts/deploy.sh'"
  exit 1
}

echo ""
echo -e "${GREEN}✅ Zero-downtime deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify deployment: curl http://$REMOTE_HOST/api/health"
echo "2. Check logs: ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose logs -f'"
echo "3. Monitor: ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose ps'"

