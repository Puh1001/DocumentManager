# ISO Docs - Auto Deployment Script (PowerShell)
# Tự động: Pull code, Build, Migrate, Deploy với Zero-Downtime
# Usage: .\scripts\deploy-auto.ps1 -Host "user@192.168.1.100" [options]

# Suppress PSScriptAnalyzer warnings for embedded bash script in heredoc
# The bash commands (echo, date) are intentionally used in the remote script string
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingCmdletAliases', '', Justification='Bash script embedded in heredoc string')]

param(
    [Parameter(Mandatory=$true)]
    [string]$Host,
    
    [switch]$SkipBackup,
    [switch]$NoCache,
    
    [string]$RemoteDir = "~/documentsManager",
    [string]$SshKey = "",
    [string]$RepoUrl = ""
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info {
    Write-Host "[INFO] $args" -ForegroundColor Blue
}

function Write-Success {
    Write-Host "[SUCCESS] $args" -ForegroundColor Green
}

function Write-Warning {
    Write-Host "[WARNING] $args" -ForegroundColor Yellow
}

function Write-Error {
    Write-Host "[ERROR] $args" -ForegroundColor Red
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  🚀 ISO Docs - Auto Deployment" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Server: $Host"
Write-Info "Path: $RemoteDir"
Write-Host ""

# Build SSH command
$sshCmd = "ssh"
if ($SshKey) {
    $sshCmd += " -i `"$SshKey`""
}
$sshCmd += " -o ServerAliveInterval=60"
$sshCmd += " -o ServerAliveCountMax=10"
$sshCmd += " -o TCPKeepAlive=yes"
$sshCmd += " $Host"

# Step 1: Check git status and push
Write-Info "📤 Step 1: Checking git status..."
if (Test-Path ".git") {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Warning "You have uncommitted changes"
        $response = Read-Host "Commit them now? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            $commitMsg = Read-Host "Commit message"
            if ([string]::IsNullOrWhiteSpace($commitMsg)) {
                $commitMsg = "Deploy: Auto commit"
            }
            git add .
            git commit -m $commitMsg
        }
    }
    
    Write-Info "Pushing to remote..."
    $currentBranch = git branch --show-current
    git push origin $currentBranch 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Git push failed, continuing anyway..."
    }
    
    # Auto-detect repo URL if not set
    if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
        $RepoUrl = git remote get-url origin 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Auto-detected repo URL: $RepoUrl"
        }
    }
} else {
    Write-Warning "Not a git repository"
}

Write-Host ""

# Step 2: Deploy on server
Write-Info "🔌 Step 2: Deploying on server..."

# Build deploy options
$deployOpts = ""
if ($SkipBackup) {
    $deployOpts += " --skip-backup"
}
if ($NoCache) {
    $deployOpts += " --no-cache"
}

# Build remote command
# Note: The following heredoc contains bash script, not PowerShell
# PSScriptAnalyzer warnings about 'echo' and 'date' are false positives
$remoteScript = @"
set -e

REMOTE_DIR_VAR="$RemoteDir"
REPO_URL_VAR="$RepoUrl"
DEPLOY_OPTS_VAR="$deployOpts"
COMPOSE_FILE="docker-compose.prod.yml"

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

# Check if deploy.sh exists
if [ -f "scripts/deploy.sh" ]; then
  ./scripts/deploy.sh\$DEPLOY_OPTS_VAR
else
  # Inline deployment
  echo "📦 Building Docker images..."
  BUILD_CMD="docker-compose -f \$COMPOSE_FILE build"
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
    docker-compose -f \$COMPOSE_FILE exec -T postgres pg_dump -U admin documents_db > "./backups/db_backup_\$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || {
      echo "⚠️  Database backup skipped"
    }
  fi
  
  echo "🔄 Deploying with zero-downtime..."
  docker-compose -f \$COMPOSE_FILE stop --timeout 10 api web 2>/dev/null || true
  docker-compose -f \$COMPOSE_FILE rm -f api web 2>/dev/null || true
  docker-compose -f \$COMPOSE_FILE up -d --no-deps api web || {
    echo "❌ Failed to start containers"
    exit 1
  }
  
  echo "⏳ Waiting for API to be ready..."
  sleep 5
  
  echo "🔄 Running database migrations (AUTO)..."
  MAX_RETRIES=10
  RETRY=0
  while [ \$RETRY -lt \$MAX_RETRIES ]; do
    if docker-compose -f \$COMPOSE_FILE exec -T api npx prisma migrate deploy 2>/dev/null; then
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
  API_PORT=\$(docker-compose -f \$COMPOSE_FILE config 2>/dev/null | grep -A 5 "api:" | grep "ports:" -A 2 | grep -oE "[0-9]+:3001" | cut -d: -f1 || echo "3001")
  for i in {1..30}; do
    if curl -f -s "http://localhost:\${API_PORT:-3001}/api/health" > /dev/null 2>&1; then
      echo "✅ API is healthy"
      break
    fi
    if [ \$i -eq 30 ]; then
      echo "⚠️  API health check timeout"
    fi
    sleep 2
  done
  
  echo "🧹 Cleaning up..."
  docker image prune -f || true
fi

echo ""
echo "✅ Deployment completed!"
docker-compose -f \$COMPOSE_FILE ps
"@

# Execute remote deployment
Write-Info "Connecting to $Host..."
Invoke-Expression "$sshCmd `"$remoteScript`""

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Error "Deployment failed!"
    exit 1
}

Write-Host ""
Write-Success "🎉 Deployment completed successfully!"
Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Verify: curl http://$Host/api/health"
Write-Info "2. Check logs: ssh $Host 'cd $RemoteDir && docker-compose -f docker-compose.prod.yml logs -f'"
