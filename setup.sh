#!/bin/bash
# =============================================================================
# setup.sh – Install Claude Pipeline Framework into a project
#
# Usage:
#   cd /path/to/your/project
#   /path/to/claude-pipeline/setup.sh
#
# What it does:
#   1. Copies agents → .claude/agents/
#   2. Copies commands → .claude/commands/
#   3. Copies pipeline runner → .pipeline/run.sh
#   4. Generates project.json from user input
#   5. Generates CLAUDE.md template
#   6. Creates .claude/settings.json (if missing)
# =============================================================================

set -euo pipefail

FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(pwd)"

echo ""
echo "================================================"
echo "  Claude Pipeline Framework — Setup"
echo "================================================"
echo ""
echo "Project directory: $PROJECT_DIR"
echo "Framework source:  $FRAMEWORK_DIR"
echo ""

# --- Prerequisites ---
echo "Checking prerequisites..."
MISSING=0

check_prereq() {
  if command -v "$1" &>/dev/null; then
    echo "  + $1"
    return 0
  else
    echo "  - $1 NOT FOUND"
    return 1
  fi
}

check_prereq "claude" || MISSING=1
check_prereq "git" || MISSING=1
check_prereq "gh" || MISSING=1
check_prereq "python3" || echo "  ~ python3 optional (for config parsing in run.sh)"

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Missing prerequisites. Please install and try again."
  exit 1
fi

echo ""

# --- Check if already initialized ---
if [ -f "project.json" ]; then
  echo "project.json already exists."
  read -p "Overwrite project.json? (y/N): " OVERWRITE_CONFIG
  OVERWRITE_CONFIG=${OVERWRITE_CONFIG:-N}
fi

# --- Interactive config ---
echo "Project configuration:"
echo ""

read -p "  Project name: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-myproject}

read -p "  Description: " PROJECT_DESC
PROJECT_DESC=${PROJECT_DESC:-""}

read -p "  Package manager (pnpm/npm/yarn/bun) [pnpm]: " PKG_MANAGER
PKG_MANAGER=${PKG_MANAGER:-pnpm}

read -p "  Build command (web) [${PKG_MANAGER} run build]: " BUILD_WEB
BUILD_WEB=${BUILD_WEB:-"${PKG_MANAGER} run build"}

read -p "  Test command [npx vitest run]: " BUILD_TEST
BUILD_TEST=${BUILD_TEST:-"npx vitest run"}

read -p "  Branch prefix [feature/]: " BRANCH_PREFIX
BRANCH_PREFIX=${BRANCH_PREFIX:-"feature/"}

echo ""
echo "Notion integration (leave empty to skip):"
read -p "  Tasks DB ID: " NOTION_TASKS_DB
read -p "  Data Source URL: " NOTION_DATA_SOURCE
read -p "  Project Page ID: " NOTION_PROJECT_PAGE
read -p "  Project filter name: " NOTION_PROJECT_FILTER

echo ""

# --- Copy agents ---
echo "Installing agents..."
mkdir -p "$PROJECT_DIR/.claude/agents"
cp "$FRAMEWORK_DIR/agents/"*.md "$PROJECT_DIR/.claude/agents/"
echo "  + $(ls "$FRAMEWORK_DIR/agents/"*.md | wc -l | tr -d ' ') agents installed"

# --- Copy commands ---
echo "Installing commands..."
mkdir -p "$PROJECT_DIR/.claude/commands"
cp "$FRAMEWORK_DIR/commands/"*.md "$PROJECT_DIR/.claude/commands/"
echo "  + $(ls "$FRAMEWORK_DIR/commands/"*.md | wc -l | tr -d ' ') commands installed"

# --- Copy pipeline runner ---
echo "Installing pipeline runner..."
mkdir -p "$PROJECT_DIR/.pipeline"
cp "$FRAMEWORK_DIR/pipeline/run.sh" "$PROJECT_DIR/.pipeline/run.sh"
chmod +x "$PROJECT_DIR/.pipeline/run.sh"
echo "  + .pipeline/run.sh"

# --- Generate project.json ---
if [ "${OVERWRITE_CONFIG:-Y}" != "N" ]; then
  echo "Generating project.json..."

  # Build notion block
  NOTION_BLOCK=""
  if [ -n "$NOTION_TASKS_DB" ]; then
    NOTION_BLOCK=$(cat <<NOTION_EOF
  "notion": {
    "tasks_db": "${NOTION_TASKS_DB}",
    "data_source": "${NOTION_DATA_SOURCE}",
    "project_page": "${NOTION_PROJECT_PAGE}",
    "project_filter": "${NOTION_PROJECT_FILTER}"
  },
NOTION_EOF
)
  fi

  cat > "$PROJECT_DIR/project.json" <<CONFIG_EOF
{
  "name": "${PROJECT_NAME}",
  "description": "${PROJECT_DESC}",
  "stack": {},
  "build": {
    "web": "${BUILD_WEB}",
    "test": "${BUILD_TEST}"
  },
  "paths": {},
  ${NOTION_BLOCK}
  "conventions": {
    "branch_prefix": "${BRANCH_PREFIX}",
    "commit_format": "conventional",
    "language": "de"
  }
}
CONFIG_EOF
  echo "  + project.json"
fi

# --- Generate settings.json (if missing) ---
if [ ! -f "$PROJECT_DIR/.claude/settings.json" ]; then
  echo "Generating .claude/settings.json..."
  cp "$FRAMEWORK_DIR/settings.json" "$PROJECT_DIR/.claude/settings.json"
  echo "  + .claude/settings.json"
else
  echo "  ~ .claude/settings.json already exists (skipped)"
fi

# --- Generate CLAUDE.md (if missing) ---
if [ ! -f "$PROJECT_DIR/CLAUDE.md" ]; then
  echo "Generating CLAUDE.md template..."
  sed "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$FRAMEWORK_DIR/templates/CLAUDE.md" > "$PROJECT_DIR/CLAUDE.md"
  echo "  + CLAUDE.md (edit this file with your project specifics)"
else
  echo "  ~ CLAUDE.md already exists (skipped)"
fi

echo ""
echo "================================================"
echo "  Setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md with your project architecture and conventions"
echo "  2. Edit project.json with stack details, paths, and Notion IDs"
echo "  3. Add project-specific skills in .claude/skills/ (optional)"
echo "  4. Test: claude then run /status"
echo ""
echo "Pipeline usage (VPS/CI):"
echo "  .pipeline/run.sh <TICKET_ID> <TICKET_TITLE> [DESCRIPTION]"
echo ""
