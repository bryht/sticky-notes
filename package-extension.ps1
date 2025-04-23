# PowerShell script to package the Chrome extension for publishing to the Chrome Web Store

# Create build directory
Write-Host "Creating build directory..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ".\build" | Out-Null

# Clean up any previous build
Write-Host "Cleaning up previous build..." -ForegroundColor Green
if (Test-Path ".\build\sticky-notes.zip") {
    Remove-Item ".\build\sticky-notes.zip" -Force
}

# Create temporary directory for flat file structure
Write-Host "Creating temporary directory for flat structure..." -ForegroundColor Green
$tempDir = Join-Path -Path $env:TEMP -ChildPath ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Create the zip file
Write-Host "Preparing files for packaging..." -ForegroundColor Green
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
# Set the root path to the directory containing the script file (project root)
$rootPath = $scriptPath
Set-Location $rootPath

# Copy necessary files to temp directory (flat structure for root files)
Copy-Item -Path "$rootPath\manifest.json", "$rootPath\background.js", "$rootPath\contentScript.js" -Destination $tempDir
# For icon folder, preserve just that one folder
Copy-Item -Path "$rootPath\icons" -Destination $tempDir -Recurse

# Create zip file
Write-Host "Creating extension package..." -ForegroundColor Green
$zipFilePath = Join-Path -Path $rootPath -ChildPath "build\sticky-notes.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFilePath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Clean up temp directory
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "`nPackage created: build\sticky-notes.zip" -ForegroundColor Green
Write-Host "You can now upload this package to the Chrome Web Store Developer Dashboard." -ForegroundColor Green
Write-Host "For complete instructions, see docs\PUBLISHING.md" -ForegroundColor Green