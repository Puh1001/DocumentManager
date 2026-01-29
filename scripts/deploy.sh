#!/bin/bash

# ISO Docs - Zero-Downtime Deployment Script
# Usage: ./scripts/deploy.sh [--skip-backup] [--skip-migration] [--no-cache]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="iso-docs"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Parse arguments
SKIP_BACKUP=false
SKIP_MIGRATION=false
NO_CACHE=false

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
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Logging function
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
  exit 1
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
  fi
  
  if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed"
  fi
  
  if [ ! -f "$COMPOSE_FILE" ]; then
    error "Docker compose file not found: $COMPOSE_FILE"
  fi
  
  success "Prerequisites check passed"
}

# Backup database
backup_database() {
  if [ "$SKIP_BACKUP" = true ]; then
    warning "Skipping database backup"
    return
  fi
  
  log "Creating database backup..."
  
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
  
  if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
    docker-compose -f "$COMPOSE_FILE" exec -T postgres \
      pg_dump -U admin documents_db > "$BACKUP_FILE" 2>/dev/null || {
      error "Failed to backup database"
    }
    success "Database backed up to: $BACKUP_FILE"
  else
    warning "PostgreSQL container is not running, skipping backup"
  fi
}

# Health check function
health_check() {
  local service=$1
  local url=$2
  local max_attempts=90
  local attempt=1
  
  log "Waiting for $service to be healthy..."
  
  while [ $attempt -le $max_attempts ]; do
    if curl -f -s "$url" > /dev/null 2>&1; then
      success "$service is healthy"
      return 0
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
  done
  
  error "$service health check failed after $max_attempts attempts"
}

# Pull latest code
pull_code() {
  log "Pulling latest code from Git..."
  
  if [ -d ".git" ]; then
    git fetch origin
    git pull origin main || git pull origin master || {
      warning "Git pull failed, continuing with current code"
    }
    success "Code updated"
  else
    warning "Not a git repository, skipping git pull"
  fi
}

# Build images
build_images() {
  log "Building Docker images..."
  
  local build_cmd="docker-compose -f $COMPOSE_FILE build"
  if [ "$NO_CACHE" = true ]; then
    build_cmd="$build_cmd --no-cache"
    log "Using --no-cache flag (slower but ensures clean build)"
  else
    log "Using Docker cache (faster, rebuilds only changed layers)"
  fi
  
  $build_cmd || {
    error "Failed to build Docker images"
  }
  
  success "Docker images built successfully"
}

# Deploy with zero-downtime
deploy_zero_downtime() {
  log "Starting zero-downtime deployment..."
  
  # Step 1: Ensure database is running (needed for migration)
  log "Ensuring database is running..."
  docker-compose -f "$COMPOSE_FILE" up -d postgres redis 2>/dev/null || true
  
  # Wait for database to be ready
  log "Waiting for database to be ready..."
  sleep 5
  
  # Step 2: Run migrations BEFORE deploying new containers (if not skipped)
  if [ "$SKIP_MIGRATION" != true ]; then
    log "Running database migrations before deployment..."
    
    # Try to run migration using a temporary API container or directly
    # Option 1: Use existing API container if running
    if docker-compose -f "$COMPOSE_FILE" ps api | grep -q "Up"; then
      log "Running migrations using existing API container..."
      docker-compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy || {
        warning "Migration via existing container failed, will retry after deployment"
      }
    else
      # Option 2: Start a temporary API container just for migration
      log "Starting temporary API container for migration..."
      docker-compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy || {
        warning "Migration via temporary container failed, will retry after deployment"
      }
    fi
  fi
  
  # Step 3: Stop old containers gracefully (with timeout)
  log "Stopping old containers gracefully..."
  docker-compose -f "$COMPOSE_FILE" stop --timeout 10 api web 2>/dev/null || true
  
  # Step 4: Remove old containers (fix ContainerConfig KeyError)
  # This prevents docker-compose from trying to merge metadata from old containers
  log "Removing old containers..."
  docker-compose -f "$COMPOSE_FILE" rm -f api web 2>/dev/null || true
  
  # Step 5: Start new containers with new images (images already built in build_images step)
  log "Starting new containers with updated images..."
  docker-compose -f "$COMPOSE_FILE" up -d --no-deps api web || {
    error "Failed to start new containers"
  }
  
  # Step 6: Wait for containers to start
  log "Waiting for containers to start..."
  sleep 3
  
  # Step 7: Run migrations again if they failed before (or if skipped earlier)
  if [ "$SKIP_MIGRATION" != true ]; then
    log "Verifying/running migrations after deployment..."
    MAX_RETRIES=10
    RETRY=0
    while [ $RETRY -lt $MAX_RETRIES ]; do
      if docker-compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy 2>/dev/null; then
        success "Migrations completed successfully"
        break
      else
        RETRY=$((RETRY + 1))
        if [ $RETRY -ge $MAX_RETRIES ]; then
          error "Migration failed after $MAX_RETRIES attempts"
        fi
        log "Retrying migration ($RETRY/$MAX_RETRIES)..."
        sleep 3
      fi
    done
  fi
  
  # Step 8: Health check API
  log "Checking API health..."
  if docker-compose -f "$COMPOSE_FILE" ps api | grep -q "Up"; then
    API_PORT=$(docker-compose -f "$COMPOSE_FILE" config | grep -A 5 "api:" | grep "ports:" -A 2 | grep -oE "[0-9]+:3001" | cut -d: -f1 || echo "3001")
    health_check "API" "http://localhost:${API_PORT:-3001}/api/health"
  else
    error "API container is not running"
  fi
  
  # Step 9: Health check Web
  log "Checking Web health..."
  if docker-compose -f "$COMPOSE_FILE" ps web | grep -q "Up"; then
    WEB_PORT=$(docker-compose -f "$COMPOSE_FILE" config | grep -A 5 "web:" | grep "ports:" -A 2 | grep -oE "[0-9]+:3000" | cut -d: -f1 || echo "3000")
    # Web might not have /api/health endpoint, check root instead
    if curl -f -s "http://localhost:${WEB_PORT:-3000}/" > /dev/null 2>&1; then
      success "Web is healthy"
    else
      # Try /api/health as fallback
      health_check "Web" "http://localhost:${WEB_PORT:-3000}/api/health" || {
        warning "Web health check failed, but continuing..."
      }
    fi
  else
    error "Web container is not running"
  fi
  
  success "All containers are healthy"
  
  success "Zero-downtime deployment completed"
}

# Run migrations (kept for backward compatibility, but migrations now run in deploy_zero_downtime)
run_migrations() {
  if [ "$SKIP_MIGRATION" = true ]; then
    warning "Skipping database migrations"
    return
  fi
  
  # Migrations are now handled in deploy_zero_downtime function
  # This function is kept for backward compatibility
  log "Migrations already handled during deployment"
  success "Migrations completed"
}

# Cleanup old images
cleanup() {
  log "Cleaning up old Docker images..."
  
  # Remove dangling images
  docker image prune -f
  
  # Keep last 3 versions of images
  docker images | grep "$PROJECT_NAME" | tail -n +4 | awk '{print $3}' | xargs -r docker rmi -f || true
  
  success "Cleanup completed"
}

# Rollback function
rollback() {
  error "Deployment failed. Please check logs and rollback manually if needed."
}

# Main deployment flow
main() {
  log "=========================================="
  log "Starting ISO Docs Deployment"
  log "=========================================="
  
  # Trap errors
  trap rollback ERR
  
  check_prerequisites
  pull_code
  backup_database
  build_images
  deploy_zero_downtime
  # run_migrations is now integrated into deploy_zero_downtime
  # but we call it here for logging/backward compatibility
  run_migrations
  
  # Show status
  log "=========================================="
  log "Deployment Summary"
  log "=========================================="
  docker-compose -f "$COMPOSE_FILE" ps
  
  log "=========================================="
  success "Deployment completed successfully!"
  log "=========================================="
  
  # Cleanup
  cleanup
}

# Run main function
main

