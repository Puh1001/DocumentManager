# ISO Docs - Remote Deployment Script (PowerShell)
# Deploys to remote server via SSH
# Usage: .\scripts\deploy-remote.ps1 -Host "user@192.168.1.100" [-SkipBackup] [-SkipMigration]

param(
    [Parameter(Mandatory=$true)]
    [string]$Host,
    
    [switch]$SkipBackup,
    [switch]$SkipMigration,
    
    [string]$RemoteDir = "~/documentsManager",
    [string]$SshKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting remote deployment to $Host" -ForegroundColor Blue

# Build SSH command
$sshCmd = "ssh"
if ($SshKey) {
    $sshCmd += " -i `"$SshKey`""
}
$sshCmd += " $Host"

# Check if git has uncommitted changes
if (Test-Path ".git") {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "⚠️  You have uncommitted changes. Commit them first?" -ForegroundColor Yellow
        $response = Read-Host "Continue anyway? (y/n)"
        if ($response -ne "y" -and $response -ne "Y") {
            exit 1
        }
    }
    
    # Push to remote
    Write-Host "📤 Pushing code to GitHub..." -ForegroundColor Blue
    $currentBranch = git branch --show-current
    git push origin $currentBranch 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Git push skipped" -ForegroundColor Yellow
    }
}

# Build remote command
$remoteCmd = "cd $RemoteDir && "
$remoteCmd += "chmod +x scripts/deploy.sh && "
$remoteCmd += "./scripts/deploy.sh"

if ($SkipBackup) {
    $remoteCmd += " --skip-backup"
}

if ($SkipMigration) {
    $remoteCmd += " --skip-migration"
}

# Execute remote deployment
Write-Host "🔌 Connecting to $Host..." -ForegroundColor Blue
Invoke-Expression "$sshCmd `"$remoteCmd`""

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Remote deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Remote deployment completed successfully!" -ForegroundColor Green

