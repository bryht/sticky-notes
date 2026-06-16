<#
.SYNOPSIS
    Builds the Sticky Notes extension as an UNPACKED directory at frontend\build\latest.

.DESCRIPTION
    Mirrors frontend\build.js (esbuild-bundled contentScript.js + rewritten manifest/background),
    but writes the loose files into frontend\build\latest instead of zipping them.

    Load it in Chrome via chrome://extensions  ->  "Load unpacked"  ->  pick frontend\build\latest.
    Re-run this script and hit the reload icon on the extension card to pick up changes.
#>

$ErrorActionPreference = 'Stop'

$Root      = Join-Path $PSScriptRoot 'frontend'
$OutDir    = Join-Path $Root 'build\latest'

Write-Host "Building Sticky Notes (unpacked) -> $OutDir" -ForegroundColor Cyan

# Clean output
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

# 1. Bundle content.js -> contentScript.js (IIFE for MV3 content_scripts)
Write-Host "Bundling content.js -> contentScript.js with esbuild..."
$banner = '// Sticky Notes Extension - Bundled by esbuild for Chrome MV3 compatibility'
& npx --prefix $Root esbuild (Join-Path $Root 'content.js') `
    --bundle `
    --format=iife `
    --target=chrome88 `
    "--banner:js=$banner" `
    "--outfile=$(Join-Path $OutDir 'contentScript.js')"
if ($LASTEXITCODE -ne 0) { throw "esbuild failed (exit $LASTEXITCODE)" }

# 2. Copy plain files
$filesToCopy = 'background.js', 'styles.css', 'settings.html', 'settings.js'
foreach ($f in $filesToCopy) {
    Copy-Item (Join-Path $Root $f) (Join-Path $OutDir $f) -Force
}

# 3. Rewrite content.js -> contentScript.js reference in background.js
$bgPath = Join-Path $OutDir 'background.js'
$bgCode = Get-Content $bgPath -Raw
$bgCode = $bgCode.Replace("files: ['content.js']", "files: ['contentScript.js']")
Set-Content -Path $bgPath -Value $bgCode -NoNewline

# 4. Copy icons and modules directories
Copy-Item (Join-Path $Root 'icons')   (Join-Path $OutDir 'icons')   -Recurse -Force
Copy-Item (Join-Path $Root 'modules') (Join-Path $OutDir 'modules') -Recurse -Force

# 5. Update manifest: point content_scripts to the bundled contentScript.js
$manifest = Get-Content (Join-Path $Root 'manifest.json') -Raw | ConvertFrom-Json
$manifest.content_scripts[0].js = @('contentScript.js')
$manifest | ConvertTo-Json -Depth 20 | Set-Content -Path (Join-Path $OutDir 'manifest.json')

Write-Host ""
Write-Host "Build complete: $OutDir" -ForegroundColor Green
Write-Host "   Version: $($manifest.version)"
Write-Host "   In Chrome: chrome://extensions -> Load unpacked -> select the folder above."
