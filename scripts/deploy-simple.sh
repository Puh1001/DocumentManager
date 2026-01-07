#!/bin/bash

# ISO Docs - Simple Deployment Script (One-liner version)
# Usage: ./scripts/deploy-simple.sh

set -e

COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main || git pull origin master || echo "⚠️  Git pull skipped"

# Backup database (if postgres is running)
echo "💾 Backing up database..."
mkdir -p ./backups
docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U admin documents_db > "./backups/db_backup_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || echo "⚠️  Database backup skipped"

# Build and deploy
echo "🔨 Building and deploying..."
docker-compose -f "$COMPOSE_FILE" down
docker-compose -f "$COMPOSE_FILE" build --no-cache
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Run migrations
echo "🔄 Running migrations..."
docker-compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy || echo "⚠️  Migration skipped"

# Cleanup
echo "🧹 Cleaning up..."
docker image prune -f

echo "✅ Deployment completed!"
docker-compose -f "$COMPOSE_FILE" ps

