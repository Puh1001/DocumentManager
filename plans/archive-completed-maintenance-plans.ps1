# Archive completed maintenance and i18n plans
$plans = @(
    '20251223-1205-i18n-implementation',
    '20251223-1825-maintenance-notices',
    '20251224-0921-maintenance-department-edit-delete'
)

$archiveDir = "_archive"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
    Write-Host "Created archive directory: $archiveDir"
}

foreach ($plan in $plans) {
    $planPath = Join-Path "." $plan
    if (Test-Path $planPath) {
        $zipPath = Join-Path $archiveDir "$plan.zip"
        Compress-Archive -Path $planPath -DestinationPath $zipPath -Force
        Write-Host "Archived: $plan -> $zipPath"
        
        Remove-Item -Path $planPath -Recurse -Force
        Write-Host "Removed: $plan"
    } else {
        Write-Host "Not found: $plan (skipping)"
    }
}

Write-Host "`nArchive completed!"

