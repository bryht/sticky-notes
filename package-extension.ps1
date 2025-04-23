# PowerShell script to package the Chrome extension for publishing to the Chrome Web Store

# Create build directory
Write-Host "Creating build directory..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path ".\build" | Out-Null

# Clean up any previous build
Write-Host "Cleaning up previous build..." -ForegroundColor Green
if (Test-Path ".\build\sticky-notes.zip") {
    Remove-Item ".\build\sticky-notes.zip" -Force
}

# Create the zip file
Write-Host "Creating extension package..." -ForegroundColor Green
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = (Get-Item $scriptPath).Parent.FullName
Set-Location $rootPath

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipFilePath = Join-Path -Path $rootPath -ChildPath "build\sticky-notes.zip"

# Get all files excluding the ones we don't want to package
$filesToInclude = Get-ChildItem -Path $rootPath -Recurse -File | 
    Where-Object { 
        $relativePath = $_.FullName.Substring($rootPath.Length + 1)
        -not ($relativePath -like ".git*" -or 
              $relativePath -like "docs\*" -or 
              $relativePath -like "tool\*" -or 
              $relativePath -like "build\*" -or 
              $relativePath -like "*.ps1")
    }

# Create a new zip file
$zip = [System.IO.Compression.ZipFile]::Open($zipFilePath, [System.IO.Compression.ZipArchiveMode]::Create)

foreach ($file in $filesToInclude) {
    $relativePath = $file.FullName.Substring($rootPath.Length + 1)
    Write-Host "Adding: $relativePath"
    
    $zipEntry = $zip.CreateEntry($relativePath)
    $zipStream = $zipEntry.Open()
    $fileStream = [System.IO.File]::OpenRead($file.FullName)
    $fileStream.CopyTo($zipStream)
    $zipStream.Close()
    $fileStream.Close()
}

$zip.Dispose()

Write-Host "`nPackage created: build\sticky-notes.zip" -ForegroundColor Green
Write-Host "You can now upload this package to the Chrome Web Store Developer Dashboard." -ForegroundColor Green
Write-Host "For complete instructions, see docs\PUBLISHING.md" -ForegroundColor Green