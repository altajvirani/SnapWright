# SnapWright Publishing Script
# This script helps publish the SnapWright extension to the VS Code Marketplace

Write-Host "SnapWright Publishing Helper" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if vsce is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

try {
    vsce --version | Out-Null
    Write-Host "vsce is installed" -ForegroundColor Green
} catch {
    Write-Host "vsce is not installed. Installing..." -ForegroundColor Red
    npm install -g vsce
}

# Compile the extension
Write-Host "Compiling TypeScript..." -ForegroundColor Yellow
npm run compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Compilation successful" -ForegroundColor Green

# Package the extension
Write-Host "Packaging extension..." -ForegroundColor Yellow
vsce package

if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Extension packaged successfully" -ForegroundColor Green

# Get the latest .vsix file
$vsixFile = Get-ChildItem -Path "." -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Write-Host "" -ForegroundColor White
Write-Host "Publishing Checklist:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "1. Extension compiled successfully" -ForegroundColor Green
Write-Host "2. Package created: $($vsixFile.Name)" -ForegroundColor Green
Write-Host "3. Ready for marketplace publishing" -ForegroundColor Yellow

Write-Host "" -ForegroundColor White
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "1. Test the extension locally:" -ForegroundColor White
Write-Host "   code --install-extension $($vsixFile.Name)" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "2. Publish to marketplace:" -ForegroundColor White
Write-Host "   vsce publish" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "3. Or publish specific version:" -ForegroundColor White
Write-Host "   vsce publish 1.3.0" -ForegroundColor Gray

Write-Host "" -ForegroundColor White
Write-Host "Useful Links:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "- VS Code Marketplace: https://marketplace.visualstudio.com/manage/publishers/altajvirani" -ForegroundColor Blue
Write-Host "- Publishing Guide: https://code.visualstudio.com/api/working-with-extensions/publishing-extension" -ForegroundColor Blue
Write-Host "- Extension Analytics: https://marketplace.visualstudio.com/manage/publishers/altajvirani/extensions/snapwright/hub" -ForegroundColor Blue

Write-Host "" -ForegroundColor White
Write-Host "Ready to publish SnapWright v1.3.0!" -ForegroundColor Green
