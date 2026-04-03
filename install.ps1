# ASRP — Agent Science Research Platform Installer (Windows)
# Usage: irm https://asrp.jzis.org/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║     ASRP — Setup Installer v0.2       ║" -ForegroundColor Green
Write-Host "  ║   Agent Science Research Platform      ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Platform: Windows ($env:OS)" -ForegroundColor Cyan
Write-Host ""

# Check dependencies
function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}

Write-Host "Checking dependencies..." -ForegroundColor White
$needInstall = @()

if (Test-Command "node") {
    $v = & node --version 2>$null
    Write-Host "  ✓ Node.js $v" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js — not found" -ForegroundColor Red
    $needInstall += "node"
}

if (Test-Command "python") {
    $v = & python --version 2>$null
    Write-Host "  ✓ $v" -ForegroundColor Green
} elseif (Test-Command "python3") {
    $v = & python3 --version 2>$null
    Write-Host "  ✓ $v" -ForegroundColor Green
} else {
    Write-Host "  ✗ Python — not found" -ForegroundColor Red
    $needInstall += "python"
}

if (Test-Command "git") {
    $v = & git --version 2>$null
    Write-Host "  ✓ $v" -ForegroundColor Green
} else {
    Write-Host "  ✗ Git — not found" -ForegroundColor Red
    $needInstall += "git"
}
Write-Host ""

# Install missing dependencies
if ($needInstall.Count -gt 0) {
    Write-Host "Installing missing: $($needInstall -join ', ')" -ForegroundColor Yellow
    
    # Check for winget
    $hasWinget = Test-Command "winget"
    # Check for choco
    $hasChoco = Test-Command "choco"
    
    if ($hasWinget) {
        if ($needInstall -contains "node") {
            Write-Host "  Installing Node.js via winget..." -ForegroundColor Cyan
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -s winget 2>$null
        }
        if ($needInstall -contains "python") {
            Write-Host "  Installing Python via winget..." -ForegroundColor Cyan
            winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements -s winget 2>$null
        }
        if ($needInstall -contains "git") {
            Write-Host "  Installing Git via winget..." -ForegroundColor Cyan
            winget install Git.Git --accept-package-agreements --accept-source-agreements -s winget 2>$null
        }
    } elseif ($hasChoco) {
        if ($needInstall -contains "node") { choco install nodejs-lts -y 2>$null }
        if ($needInstall -contains "python") { choco install python3 -y 2>$null }
        if ($needInstall -contains "git") { choco install git -y 2>$null }
    } else {
        Write-Host "  Neither winget nor chocolatey found. Please install manually:" -ForegroundColor Red
        Write-Host "    Node.js: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "    Python:  https://python.org/" -ForegroundColor Yellow
        Write-Host "    Git:     https://git-scm.com/" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  After installing, re-run this script." -ForegroundColor Yellow
        return
    }
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Host ""
}

# Install OpenClaw
Write-Host "Installing OpenClaw (AI Agent Platform)..." -ForegroundColor White
if (Test-Command "openclaw") {
    Write-Host "  ✓ OpenClaw already installed" -ForegroundColor Green
} else {
    npm install -g openclaw 2>$null
    Write-Host "  ✓ OpenClaw installed" -ForegroundColor Green
}
Write-Host ""

# Choose workspace
$defaultDir = Join-Path $env:USERPROFILE "asrp-workspace"
Write-Host "Where should ASRP be installed?" -ForegroundColor White
Write-Host "  Default: $defaultDir" -ForegroundColor Cyan
$workspace = Read-Host "  Press Enter for default, or type a path"
if ([string]::IsNullOrWhiteSpace($workspace)) { $workspace = $defaultDir }

New-Item -ItemType Directory -Force -Path $workspace | Out-Null
Set-Location $workspace
Write-Host "  ✓ Workspace: $workspace" -ForegroundColor Green
Write-Host ""

# Download ASRP
Write-Host "Downloading ASRP framework..." -ForegroundColor White
if (Test-Path ".git") {
    git pull -q 2>$null
} else {
    git clone -q https://github.com/JackZH26/agent-science-research-platform.git . 2>$null
}
Write-Host "  ✓ Framework downloaded" -ForegroundColor Green
Write-Host ""

# Provision trial key
Write-Host "Getting trial API key..." -ForegroundColor White
try {
    $response = Invoke-RestMethod -Uri "https://asrp.jzis.org/api/key/provision" -Method Post -ContentType "application/json" -Body "{}" -ErrorAction Stop
    $trialKey = $response.key
    if ($trialKey) {
        Add-Content -Path ".env" -Value "OPENROUTER_API_KEY=$trialKey"
        $masked = $trialKey.Substring(0, 12) + "..." + $trialKey.Substring($trialKey.Length - 4)
        Write-Host "  ✓ Trial key: $masked (7 days, limited quota)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ! Could not get trial key. You'll need to provide your own." -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  ASRP installed successfully!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Workspace: $workspace" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. cd $workspace" -ForegroundColor White
Write-Host "  2. openclaw start" -ForegroundColor White
Write-Host "     The Assistant Agent will guide you through the rest!" -ForegroundColor White
Write-Host ""
Write-Host "Docs:    https://asrp.jzis.org" -ForegroundColor Cyan
Write-Host "Discord: https://discord.gg/DFmwBkDTB" -ForegroundColor Cyan
Write-Host ""
