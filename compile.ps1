# compile.ps1 - Bundler script for GradeInsights V5
$Cwd = $PSScriptRoot
if (-not $Cwd) { $Cwd = Get-Location }

$srcDir = Join-Path $Cwd "src"

# 1. Define paths
$cssPath = Join-Path $srcDir "styles.css"
$appJsPath = Join-Path $srcDir "app.js"
$htmlPath = Join-Path $srcDir "index.html"
$gsPath = Join-Path $srcDir "Code.gs"

# Verify files
if (-not (Test-Path $cssPath)) { Write-Error "styles.css not found in src/"; exit }
if (-not (Test-Path $appJsPath)) { Write-Error "app.js not found in src/"; exit }
if (-not (Test-Path $htmlPath)) { Write-Error "index.html not found in src/"; exit }
if (-not (Test-Path $gsPath)) { Write-Error "Code.gs not found in src/"; exit }

Write-Host "Compiling files from src/ into root directory..." -ForegroundColor Cyan

# 2. Get contents (UTF-8 encoding)
$css = Get-Content -Raw -Path $cssPath -Encoding utf8
$appJs = Get-Content -Raw -Path $appJsPath -Encoding utf8
$html = Get-Content -Raw -Path $htmlPath -Encoding utf8

# 3. Inline CSS and JS
Write-Host "Inlining CSS and JS into index.html..." -ForegroundColor Yellow

$styleBlock = "<style>`n" + $css + "`n</style>"
$html = $html.Replace('<link rel="stylesheet" href="styles.css">', $styleBlock)

$scriptBlock = "<script>`n" + $appJs + "`n</script>"
$html = $html.Replace('<script src="app.js"></script>', $scriptBlock)

# 4. Save compiled index.html to root
$outputPath = Join-Path $Cwd "index.html"
[System.IO.File]::WriteAllText($outputPath, $html, [System.Text.Encoding]::UTF8)
Write-Host "Compiled successfully: $outputPath" -ForegroundColor Green

# 5. Copy Code.gs to รหัส.js
$outputGsPath = Join-Path $Cwd "รหัส.js"
Copy-Item -Path $gsPath -Destination $outputGsPath -Force
Write-Host "Copied server script: $outputGsPath" -ForegroundColor Green

Write-Host "Compile process finished! Ready for clasp push." -ForegroundColor Green
