# Archive completed plans
$plans = @(
    '251219-refactor-storage-services',
    '251219-sync-orphaned-cleanup',
    '251225-github-actions-ci',
    '251225-gitlab-ci-completion',
    '251225-phase3-completion',
    '251225-refactor-folder-sync'
)

$archiveDir = "_archive"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
    Write-Host "Created archive directory: $archiveDir"
}

foreach ($plan in $plans) {
    if (Test-Path $plan) {
        $zipPath = Join-Path $archiveDir "$plan.zip"
        Compress-Archive -Path $plan -DestinationPath $zipPath -Force
        Write-Host "Archived: $plan -> $zipPath"
        
        Remove-Item -Path $plan -Recurse -Force
        Write-Host "Removed: $plan"
    } else {
        Write-Host "Not found: $plan (skipping)"
    }
}

Write-Host "`nArchive completed!"
