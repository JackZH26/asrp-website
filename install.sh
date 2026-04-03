#!/usr/bin/env bash
# ASRP — Agent Science Research Platform Installer
# Usage: curl -fsSL https://asrp.jzis.org/install.sh | bash
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

echo ""
echo -e "${GREEN}${BOLD}  ╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║     ASRP — Setup Installer v0.2      ║${NC}"
echo -e "${GREEN}${BOLD}  ║   Agent Science Research Platform     ║${NC}"
echo -e "${GREEN}${BOLD}  ╚═══════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS="unknown"
PM=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"; PM="brew"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v apt-get &>/dev/null; then OS="linux"; PM="apt"
    elif command -v yum &>/dev/null; then OS="linux"; PM="yum"
    fi
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

echo -e "${BLUE}Platform:${NC} $OS ($OSTYPE)"
echo ""

# Check dependencies
check_dep() {
    if command -v "$1" &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 $(command -v $1)"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 — not found"
        return 1
    fi
}

echo -e "${BOLD}Checking dependencies...${NC}"
NEED_INSTALL=""
check_dep node || NEED_INSTALL="$NEED_INSTALL node"
check_dep npm || NEED_INSTALL="$NEED_INSTALL npm"
check_dep python3 || NEED_INSTALL="$NEED_INSTALL python3"
check_dep git || NEED_INSTALL="$NEED_INSTALL git"
echo ""

# Install missing dependencies
if [ -n "$NEED_INSTALL" ]; then
    echo -e "${YELLOW}Installing missing:${NC}$NEED_INSTALL"
    if [ "$PM" = "brew" ]; then
        command -v brew &>/dev/null || { echo "Installing Homebrew..."; /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; }
        [[ "$NEED_INSTALL" == *"node"* ]] && brew install node
        [[ "$NEED_INSTALL" == *"python3"* ]] && brew install python
        [[ "$NEED_INSTALL" == *"git"* ]] && brew install git
    elif [ "$PM" = "apt" ]; then
        sudo apt-get update -qq
        [[ "$NEED_INSTALL" == *"node"* ]] && { curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>/dev/null; sudo apt-get install -y nodejs; }
        [[ "$NEED_INSTALL" == *"python3"* ]] && sudo apt-get install -y python3 python3-pip
        [[ "$NEED_INSTALL" == *"git"* ]] && sudo apt-get install -y git
    fi
    echo ""
fi

# Install OpenClaw
echo -e "${BOLD}Installing OpenClaw (AI Agent Platform)...${NC}"
if command -v openclaw &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} OpenClaw already installed"
else
    npm install -g openclaw 2>/dev/null || sudo npm install -g openclaw
    echo -e "  ${GREEN}✓${NC} OpenClaw installed"
fi
echo ""

# Choose workspace directory
DEFAULT_DIR="$HOME/asrp-workspace"
if [ "$OS" = "linux" ] && [ "$(whoami)" = "root" ]; then
    DEFAULT_DIR="/opt/asrp-workspace"
fi

echo -e "${BOLD}Where should ASRP be installed?${NC}"
echo -e "  Default: ${BLUE}$DEFAULT_DIR${NC}"
read -p "  Press Enter for default, or type a path: " WORKSPACE
WORKSPACE="${WORKSPACE:-$DEFAULT_DIR}"
WORKSPACE="${WORKSPACE/#\~/$HOME}"

mkdir -p "$WORKSPACE"
cd "$WORKSPACE"
echo -e "  ${GREEN}✓${NC} Workspace: $WORKSPACE"
echo ""

# Download ASRP template
echo -e "${BOLD}Downloading ASRP framework...${NC}"
if [ -d ".git" ]; then
    git pull -q
else
    git clone -q https://github.com/JackZH26/agent-science-research-platform.git .
fi
echo -e "  ${GREEN}✓${NC} Framework downloaded"

# Initialize workspace
echo -e "${BOLD}Initializing workspace...${NC}"
export PATH="$WORKSPACE/bin:$PATH"
if [ -f bin/asrp ]; then
    chmod +x bin/asrp
    bin/asrp-auto-setup . 2>/dev/null
fi
echo -e "  ${GREEN}✓${NC} Workspace initialized"
echo ""

# Provision trial key
echo -e "${BOLD}Getting trial API key...${NC}"
TRIAL_KEY=$(curl -sf -X POST https://asrp.jzis.org/api/key/provision -H "Content-Type: application/json" -d '{}' 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('key',''))" 2>/dev/null || echo "")

if [ -n "$TRIAL_KEY" ]; then
    # Write to .env
    echo "OPENROUTER_API_KEY=$TRIAL_KEY" >> .env
    MASKED="${TRIAL_KEY:0:12}...${TRIAL_KEY: -4}"
    echo -e "  ${GREEN}✓${NC} Trial key: $MASKED (7 days, limited quota)"
else
    echo -e "  ${YELLOW}!${NC} Could not get trial key. You'll need to provide your own."
fi
echo ""

# Summary
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ASRP installed successfully!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${NC}"
echo ""
echo -e "  Workspace: ${BLUE}$WORKSPACE${NC}"
echo -e "  CLI:       ${BLUE}$WORKSPACE/bin/asrp${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. cd $WORKSPACE"
echo -e "  2. openclaw start"
echo -e "     The Assistant Agent will guide you through the rest!"
echo ""
echo -e "  Or run manually:"
echo -e "  ${BLUE}bin/asrp status${NC}     — check workspace"
echo -e "  ${BLUE}bin/asrp register${NC}   — register first experiment"
echo ""
echo -e "Docs:    ${BLUE}https://asrp.jzis.org${NC}"
echo -e "Discord: ${BLUE}https://discord.gg/DFmwBkDTB${NC}"
echo ""
