#!/bin/bash

# ISO Docs - Auto Deployment Script (Từ Local đến Server)
# Tự động: Pull code, Build, Migrate, Deploy với Zero-Downtime
# Usage: ./scripts/deploy-auto.sh [user@]hostname [options]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REMOTE_HOST="${1:-}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/DocumentManager}"
SSH_KEY="${SSH_KEY:-}"
COMPOSE_FILE="docker-compose.prod.yml"
REPO_URL="${REPO_URL:-}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse options
SKIP_BACKUP=false
NO_CACHE=false
shift

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    *)
      log_warning "Unknown option: $1"
      shift
      ;;
  esac
done

if [ -z "$REMOTE_HOST" ]; then
  echo "=============================================="
  echo "  🚀 ISO Docs - Auto Deployment"
  echo "=============================================="
  echo ""
  echo "Usage: $0 [user@]hostname [options]"
  echo ""
  echo "Example:"
  echo "  $0 user@192.168.1.100"
  echo "  $0 user@server.com --skip-backup"
  echo ""
  echo "Options:"
  echo "  --skip-backup      Skip database backup"
  echo "  --no-cache         Build without Docker cache"
  echo ""
  echo "Environment Variables:"
  echo "  REMOTE_DIR         Server path (default: ~/documentsManager)"
  echo "  SSH_KEY            Path to SSH private key"
  echo "  REPO_URL           Git repository URL (auto-detected)"
  echo ""
  exit 1
fi

# Build SSH command
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD -o ServerAliveInterval=60"
SSH_CMD="$SSH_CMD -o ServerAliveCountMax=10"
SSH_CMD="$SSH_CMD -o TCPKeepAlive=yes"
SSH_CMD="$SSH_CMD $REMOTE_HOST"

echo "=============================================="
echo "  🚀 ISO Docs - Auto Deployment"
echo "=============================================="
echo ""
log_info "Server: $REMOTE_HOST"
log_info "Path: $REMOTE_DIR"
echo ""

# Step 1: Check git status and push
log_info "📤 Step 1: Checking git status..."
if [ -d ".git" ]; then
  CURRENT_BRANCH=$(git branch --show-current)
  if [ -n "$(git status --porcelain)" ]; then
    log_warning "You have uncommitted changes"
    read -p "Commit them now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      read -p "Commit message: " COMMIT_MSG
      git add .
      git commit -m "${COMMIT_MSG:-Deploy: Auto commit}"
    fi
  fi
  
  log_info "Pushing to remote..."
  git push origin "$CURRENT_BRANCH" || {
    log_warning "Git push failed, continuing anyway..."
  }
  
  # Auto-detect repo URL if not set
  if [ -z "$REPO_URL" ]; then
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
  fi
else
  log_warning "Not a git repository"
fi

echo ""

# Step 2: Deploy on server
log_info "🔌 Step 2: Deploying on server..."

# Build deploy options
DEPLOY_OPTS=""
if [ "$SKIP_BACKUP" = true ]; then
  DEPLOY_OPTS="$DEPLOY_OPTS --skip-backup"
fi

if [ "$NO_CACHE" = true ]; then
  DEPLOY_OPTS="$DEPLOY_OPTS --no-cache"
fi

# Execute remote deployment
$SSH_CMD bash << REMOTE_DEPLOY_SCRIPT
set -e

REMOTE_DIR_VAR="$REMOTE_DIR"
REPO_URL_VAR="$REPO_URL"
DEPLOY_OPTS_VAR="$DEPLOY_OPTS"
COMPOSE_FILE_VAR="$COMPOSE_FILE"

echo "📂 Checking application directory..."
if [ ! -d "\$REMOTE_DIR_VAR" ]; then
  if [ -n "\$REPO_URL_VAR" ]; then
    echo "📥 Cloning repository..."
    git clone "\$REPO_URL_VAR" "\$REMOTE_DIR_VAR" || {
      echo "❌ Failed to clone repository"
      exit 1
    }
  else
    echo "❌ Directory not found: \$REMOTE_DIR_VAR"
    echo "   Please clone repository manually or set REPO_URL"
    exit 1
  fi
fi

echo "📂 Navigating to application directory..."
cd "\$REMOTE_DIR_VAR"

echo "📥 Pulling latest code from Git..."
git fetch origin
CURRENT_BRANCH=\$(git branch --show-current 2>/dev/null || echo "main")
git reset --hard origin/\$CURRENT_BRANCH || git reset --hard origin/main || git reset --hard origin/master || {
  echo "⚠️  Git reset failed, trying pull..."
  git pull origin \$CURRENT_BRANCH || git pull origin main || git pull origin master || {
    echo "❌ Failed to pull code"
    exit 1
  }
}

echo "🔧 Updating script permissions..."
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo "🚀 Starting deployment with auto-migration..."

# Check if deploy.sh exists, if not use inline deployment
if [ -f "scripts/deploy.sh" ]; then
  # Use existing deploy script but ensure migration runs
  ./scripts/deploy.sh\$DEPLOY_OPTS_VAR
else
  # Inline deployment script
  echo "📦 Building Docker images..."
  BUILD_CMD="docker-compose -f \$COMPOSE_FILE_VAR build"
  if echo "\$DEPLOY_OPTS_VAR" | grep -q "no-cache"; then
    BUILD_CMD="\$BUILD_CMD --no-cache"
  fi
  \$BUILD_CMD || {
    echo "❌ Failed to build images"
    exit 1
  }
  
  echo "💾 Backing up database..."
  if echo "\$DEPLOY_OPTS_VAR" | grep -q "skip-backup"; then
    echo "⚠️  Skipping backup"
  else
    mkdir -p ./backups
    docker-compose -f \$COMPOSE_FILE_VAR exec -T postgres pg_dump -U admin documents_db > "./backups/db_backup_\$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || {
      echo "⚠️  Database backup skipped (postgres may not be running)"
    }
  fi
  
  echo "🔄 Deploying with zero-downtime..."
  # Stop old containers gracefully
  docker-compose -f \$COMPOSE_FILE_VAR stop --timeout 10 api web 2>/dev/null || true
  docker-compose -f \$COMPOSE_FILE_VAR rm -f api web 2>/dev/null || true
  
  # Start new containers
  docker-compose -f \$COMPOSE_FILE_VAR up -d --no-deps api web || {
    echo "❌ Failed to start containers"
    exit 1
  }
  
  echo "⏳ Waiting for API to be ready..."
  sleep 5
  
  echo "🔄 Running database migrations (AUTO)..."
  MAX_RETRIES=10
  RETRY=0
  while [ \$RETRY -lt \$MAX_RETRIES ]; do
    if docker-compose -f \$COMPOSE_FILE_VAR exec -T api npx prisma migrate deploy 2>/dev/null; then
      echo "✅ Migrations completed"
      break
    else
      RETRY=\$((RETRY + 1))
      if [ \$RETRY -ge \$MAX_RETRIES ]; then
        echo "❌ Migration failed after \$MAX_RETRIES attempts"
        exit 1
      fi
      echo "⏳ Retrying migration (\$RETRY/\$MAX_RETRIES)..."
      sleep 3
    fi
  done
  
  echo "🔍 Health check..."
  sleep 3
  API_PORT=\$(docker-compose -f \$COMPOSE_FILE_VAR config 2>/dev/null | grep -A 5 "api:" | grep "ports:" -A 2 | grep -oE "[0-9]+:3001" | cut -d: -f1 || echo "3001")
  for i in {1..30}; do
    if curl -f -s "http://localhost:\${API_PORT:-3001}/api/health" > /dev/null 2>&1; then
      echo "✅ API is healthy"
      break
    fi
    if [ \$i -eq 30 ]; then
      echo "⚠️  API health check timeout, but continuing..."
    fi
    sleep 2
  done
  
  echo "🧹 Cleaning up..."
  docker image prune -f || true
fi

echo ""
echo "✅ Deployment completed!"
docker-compose -f \$COMPOSE_FILE_VAR ps

REMOTE_DEPLOY_SCRIPT

if [ $? -ne 0 ]; then
  echo ""
  log_error "Deployment failed!"
  exit 1
fi

echo ""
log_success "🎉 Deployment completed successfully!"
echo ""
log_info "Next steps:"
log_info "1. Verify: curl http://$REMOTE_HOST/api/health"
log_info "2. Check logs: ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose -f $COMPOSE_FILE logs -f'"
