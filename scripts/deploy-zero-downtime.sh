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
REMOTE_DIR="${REMOTE_DIR:-~/documentsManager}"
SSH_KEY="${SSH_KEY:-}"
COMPOSE_FILE="docker-compose.prod.yml"

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
    ssh_test_cmd="$ssh_test_cmd -o ConnectTimeout=10 -o BatchMode=yes $REMOTE_HOST"
    
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
  echo "Other Commands:"
  echo "  status            Show server and application status"
  echo "  logs              Show application logs"
  echo "  check             Quick health check"
  echo ""
  echo "Examples:"
  echo "  $0 user@server.com              # Deploy zero-downtime"
  echo "  $0 user@server.com --skip-backup # Skip backup"
  echo "  $0 user@server.com status       # Check status"
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

# Build remote command with better error handling
REMOTE_CMD="set -e && "
REMOTE_CMD+="echo '📂 Navigating to application directory...' && "
REMOTE_CMD+="cd $REMOTE_DIR || { echo '❌ Directory not found: $REMOTE_DIR'; exit 1; } && "
REMOTE_CMD+="echo '📥 Pulling latest code from Git...' && "
REMOTE_CMD+="git fetch origin && "
REMOTE_CMD+="git reset --hard origin/main || git reset --hard origin/master || echo '⚠️  Git reset skipped' && "
REMOTE_CMD+="echo '🔧 Updating script permissions...' && "
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
  log_error "Deployment failed!"
  echo ""
  log_info "Troubleshooting:"
  log_info "1. Check SSH connection: ssh $REMOTE_HOST"
  log_info "2. Check server logs: ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose -f $COMPOSE_FILE logs'"
  log_info "3. Check script exists: ssh $REMOTE_HOST 'ls -la $REMOTE_DIR/scripts/deploy.sh'"
  log_info "4. Check directory: ssh $REMOTE_HOST 'ls -la $REMOTE_DIR'"
  exit 1
}

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

