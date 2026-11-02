<#
.SYNOPSIS
    Fueld release: bump version (native/package.json + sw.js cache), commit, tag vX.Y.Z, push branch + tag.
    The tag triggers the Android and iOS store workflows in .github/workflows.
    ASCII-only on purpose so Windows PowerShell 5.1 reads it correctly.
#>
param([ValidateSet('patch', 'minor', 'major')][string]$Bump = 'patch')
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repo
$env:FD_NO_PAUSE = '1'

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\fd-push.ps1') -Quiet
if ($LASTEXITCODE -ne 0) { Write-Host 'Push/test step failed - release cancelled. See logs\push.log' -ForegroundColor Red; Read-Host 'Press Enter'; exit 1 }

$pkgPath = Join-Path $repo 'native\package.json'
$json = Get-Content $pkgPath -Raw
$m = [regex]::Match($json, '"version"\s*:\s*"(\d+)\.(\d+)\.(\d+)"')
if (-not $m.Success) { Write-Host 'Could not read version from native\package.json' -ForegroundColor Red; Read-Host 'Press Enter'; exit 1 }
$maj = [int]$m.Groups[1].Value; $min = [int]$m.Groups[2].Value; $pat = [int]$m.Groups[3].Value
switch ($Bump) { 'major' { $maj++; $min = 0; $pat = 0 } 'minor' { $min++; $pat = 0 } default { $pat++ } }
$new = "$maj.$min.$pat"
$json = $json -replace '"version"\s*:\s*"\d+\.\d+\.\d+"', ('"version": "' + $new + '"')
[System.IO.File]::WriteAllText($pkgPath, $json, (New-Object System.Text.UTF8Encoding($false)))

$sw = Join-Path $repo 'sw.js'
if (Test-Path $sw) { $t = Get-Content $sw -Raw; $t = $t -replace "fueld-shell-v[0-9A-Za-z.]+", ("fueld-shell-v" + $new); [System.IO.File]::WriteAllText($sw, $t, (New-Object System.Text.UTF8Encoding($false))) }

& git add -A
& git commit -m "Release v$new"
if ($LASTEXITCODE -ne 0) { Write-Host 'Commit failed.' -ForegroundColor Red; Read-Host 'Press Enter'; exit 1 }
& git tag "v$new"
$branch = ((& git rev-parse --abbrev-ref HEAD) | Out-String).Trim()
& git push origin $branch
& git push origin "v$new"
if ($LASTEXITCODE -ne 0) { Write-Host ("Push failed - the tag exists locally. Fix and run: git push origin v" + $new) -ForegroundColor Red; Read-Host 'Press Enter'; exit 1 }
Write-Host "Released v$new. GitHub Actions is now building Android + iOS: https://github.com/JacobDSiler/AthleticTracker/actions" -ForegroundColor Green
Read-Host 'Press Enter to close'
