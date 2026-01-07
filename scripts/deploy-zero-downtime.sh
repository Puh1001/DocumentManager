#!/bin/bash

# ISO Docs - Zero-Downtime Deployment Script (Từ Local)
# Usage: ./scripts/deploy-zero-downtime.sh [user@]hostname [options]
# Version: 2.0 - Improved with SSH check, health checks, and better error handling

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REMOTE_HOST="${1:-}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/DocumentManager}"  # Default path, can be overridden
SSH_KEY="${SSH_KEY:-}"
COMPOSE_FILE="docker-compose.prod.yml"
REPO_URL="${REPO_URL:-}"  # Will be auto-detected from git remote if not set

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

# Build SSH command (will be set later)
SSH_CMD=""

# Helper functions for status/logs/check
show_server_status() {
    log_info "📊 Checking server status..."
    
    $SSH_CMD << EOF
        set -e
        cd "$REMOTE_DIR" || { echo "Directory not found"; exit 1; }
        
        echo "=== Git Status ==="
        git status --porcelain || echo "Not a git repository"
        git log --oneline -5 || echo "No git history"
        
        echo -e "\n=== Container Status ==="
        docker-compose -f $COMPOSE_FILE ps 2>/dev/null || echo "Docker compose not running"
        
        echo -e "\n=== System Resources ==="
        df -h | grep -E '(Filesystem|/$)' || true
        free -h || true
EOF
}

show_server_logs() {
    log_info "📝 Showing server logs..."
    
    $SSH_CMD << EOF
        cd "$REMOTE_DIR" || { echo "Directory not found"; exit 1; }
        docker-compose -f $COMPOSE_FILE logs --tail=100 -f
EOF
}

quick_health_check() {
    log_info "🔍 Quick health check..."
    
    $SSH_CMD << EOF
        set -e
        cd "$REMOTE_DIR" || { echo "Directory not found"; exit 1; }
        
        echo "=== Container Status ==="
        docker-compose -f $COMPOSE_FILE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" || true
        
        echo -e "\n=== Health Checks ==="
        # Try to get API port from compose file or use default
        API_PORT=\$(docker-compose -f $COMPOSE_FILE config 2>/dev/null | grep -A 5 "api:" | grep "ports:" -A 2 | grep -oE "[0-9]+:3001" | cut -d: -f1 || echo "3001")
        WEB_PORT=\$(docker-compose -f $COMPOSE_FILE config 2>/dev/null | grep -A 5 "web:" | grep "ports:" -A 2 | grep -oE "[0-9]+:3000" | cut -d: -f1 || echo "3000")
        
        echo "Checking API (port \${API_PORT})..."
        curl -f -s http://localhost:\${API_PORT}/api/health > /dev/null && echo "✅ API is healthy" || echo "❌ API health check failed"
        
        echo "Checking Web (port \${WEB_PORT})..."
        curl -f -s http://localhost:\${WEB_PORT}/ > /dev/null && echo "✅ Web is healthy" || echo "⚠️  Web health check skipped"
EOF
}

# Check if SSH key is available
check_ssh_access() {
    log_info "Checking SSH access to server..."
    
    local ssh_test_cmd="ssh"
    if [ -n "$SSH_KEY" ]; then
        ssh_test_cmd="$ssh_test_cmd -i $SSH_KEY"
    fi
    # Add keepalive options to prevent timeout during long operations
    ssh_test_cmd="$ssh_test_cmd -o ConnectTimeout=10"
    ssh_test_cmd="$ssh_test_cmd -o ServerAliveInterval=60"
    ssh_test_cmd="$ssh_test_cmd -o ServerAliveCountMax=10"
    ssh_test_cmd="$ssh_test_cmd -o TCPKeepAlive=yes"
    ssh_test_cmd="$ssh_test_cmd -o BatchMode=yes"
    ssh_test_cmd="$ssh_test_cmd $REMOTE_HOST"
    
    if $ssh_test_cmd exit 2>/dev/null; then
        log_success "SSH access confirmed"
    else
        log_error "Cannot connect to server via SSH"
        log_info "Please ensure:"
        log_info "  1. SSH key is added to server"
        log_info "  2. Server details are correct: $REMOTE_HOST"
        log_info "  3. Server is accessible"
        log_info ""
        log_info "Test connection: ssh $REMOTE_HOST"
        exit 1
    fi
}

if [ -z "$REMOTE_HOST" ]; then
  echo "=============================================="
  echo "  🚀 ISO Docs - Zero-Downtime Deployment"
  echo "=============================================="
  echo ""
  echo "Usage: $0 [user@]hostname [options]"
  echo ""
  echo "Example:"
  echo "  $0 user@192.168.1.100"
  echo "  $0 bp_admin@10.0.60.238"
  echo ""
  echo "Options:"
  echo "  --skip-backup      Skip database backup"
  echo "  --skip-migration   Skip database migrations"
  echo ""
  echo "Environment Variables:"
  echo "  REMOTE_DIR         Server path (default: /var/www/DocumentManager)"
  echo "  REPO_URL           Git repository URL (auto-detected if not set)"
  echo "  SSH_KEY            Path to SSH private key"
  echo ""
  echo "Other Commands:"
  echo "  status            Show server and application status"
  echo "  logs              Show application logs"
  echo "  check             Quick health check"
  echo ""
  echo "Examples:"
  echo "  $0 user@server.com                           # Deploy zero-downtime"
  echo "  $0 user@server.com --skip-backup              # Skip backup"
  echo "  REMOTE_DIR=/custom/path $0 user@server.com   # Custom path"
  echo "  $0 status user@server.com                     # Check status"
  echo ""
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

# Build SSH command (needed for helper functions)
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
# Add keepalive options to prevent timeout during long operations (e.g., Docker build)
SSH_CMD="$SSH_CMD -o ServerAliveInterval=60"
SSH_CMD="$SSH_CMD -o ServerAliveCountMax=10"
SSH_CMD="$SSH_CMD -o TCPKeepAlive=yes"

# Handle special commands (status, logs, check)
case "$REMOTE_HOST" in
    "status")
        REMOTE_HOST="${2:-}"
        if [ -z "$REMOTE_HOST" ]; then
            log_error "Please provide hostname for status check"
            echo "Usage: $0 status [user@]hostname"
            exit 1
        fi
        SSH_CMD="$SSH_CMD $REMOTE_HOST"
        check_ssh_access
        show_server_status
        exit 0
        ;;
    "logs")
        REMOTE_HOST="${2:-}"
        if [ -z "$REMOTE_HOST" ]; then
            log_error "Please provide hostname for logs"
            echo "Usage: $0 logs [user@]hostname"
            exit 1
        fi
        SSH_CMD="$SSH_CMD $REMOTE_HOST"
        check_ssh_access
        show_server_logs
        exit 0
        ;;
    "check"|"health")
        REMOTE_HOST="${2:-}"
        if [ -z "$REMOTE_HOST" ]; then
            log_error "Please provide hostname for health check"
            echo "Usage: $0 check [user@]hostname"
            exit 1
        fi
        SSH_CMD="$SSH_CMD $REMOTE_HOST"
        check_ssh_access
        quick_health_check
        exit 0
        ;;
esac

# Build SSH command for deployment
SSH_CMD="$SSH_CMD $REMOTE_HOST"

echo "=============================================="
echo "  🚀 ISO Docs - Zero-Downtime Deployment"
echo "=============================================="
echo ""
log_info "Server: $REMOTE_HOST"
log_info "Path: $REMOTE_DIR"
if [ -n "$REPO_URL" ]; then
    log_info "Repo: $REPO_URL"
fi
echo ""

# Check SSH access first
check_ssh_access
echo ""

# Step 1: Check git status
log_info "📤 Step 1: Checking git status..."
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
log_info "🔌 Step 2: Preparing server environment..."

# Auto-detect repo URL if not set
if [ -z "$REPO_URL" ] && [ -d ".git" ]; then
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -n "$REPO_URL" ]; then
        log_info "Auto-detected repo URL: $REPO_URL"
    fi
fi

# Build deploy options
DEPLOY_OPTS=""
if [ "$SKIP_BACKUP" = true ]; then
  DEPLOY_OPTS="$DEPLOY_OPTS --skip-backup"
fi

if [ "$SKIP_MIGRATION" = true ]; then
  DEPLOY_OPTS="$DEPLOY_OPTS --skip-migration"
fi

# Execute remote deployment using heredoc for better syntax handling
log_info "Executing deployment on server..."
$SSH_CMD bash << REMOTE_DEPLOY_SCRIPT
set -e

REMOTE_DIR_VAR="$REMOTE_DIR"
REPO_URL_VAR="$REPO_URL"
DEPLOY_OPTS_VAR="$DEPLOY_OPTS"

echo "📂 Checking application directory..."
if [ ! -d "\$REMOTE_DIR_VAR" ]; then
  echo "📦 Directory not found, checking if we can clone..."
  if [ -n "\$REPO_URL_VAR" ]; then
    echo "📥 Cloning repository to \$REMOTE_DIR_VAR..."
    git clone "\$REPO_URL_VAR" "\$REMOTE_DIR_VAR" || {
      echo "❌ Failed to clone repository. Please clone manually:"
      echo "   git clone \$REPO_URL_VAR \$REMOTE_DIR_VAR"
      exit 1
    }
  else
    echo "❌ Directory not found: \$REMOTE_DIR_VAR"
    echo "   Please clone repository manually or set REPO_URL environment variable"
    exit 1
  fi
fi

echo "📂 Navigating to application directory..."
cd "\$REMOTE_DIR_VAR"

echo "📥 Pulling latest code from Git..."
git fetch origin
git reset --hard origin/main || git reset --hard origin/master || echo "⚠️  Git reset skipped"

echo "🔧 Updating script permissions..."
chmod +x scripts/deploy.sh 2>/dev/null || true

echo ""
echo "🚀 Starting zero-downtime deployment..."
./scripts/deploy.sh\$DEPLOY_OPTS_VAR
REMOTE_DEPLOY_SCRIPT

# Check deployment result
if [ $? -ne 0 ]; then
  echo ""
  log_error "Deployment failed!"
  echo ""
  log_info "Troubleshooting:"
  log_info "1. Check SSH connection: ssh $REMOTE_HOST"
  log_info "2. Check server logs: ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose -f $COMPOSE_FILE logs'"
  log_info "3. Check script exists: ssh $REMOTE_HOST 'ls -la $REMOTE_DIR/scripts/deploy.sh'"
  log_info "4. Check directory: ssh $REMOTE_HOST 'ls -la $REMOTE_DIR'"
  exit 1
fi

echo ""
log_success "Zero-downtime deployment completed successfully!"
echo ""

# Step 3: Quick health check
log_info "🔍 Step 3: Performing health check..."
quick_health_check

echo ""
log_success "🎉 All done!"
echo ""
log_info "Next steps:"
log_info "1. Verify: curl http://$REMOTE_HOST/api/health"
log_info "2. Check logs: $0 logs $REMOTE_HOST"
log_info "3. Check status: $0 status $REMOTE_HOST"

