#!/usr/bin/env bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

UPSTREAM_URL="https://github.com/decolua/9router.git"
UPSTREAM_BRANCH="master"
TARGET_BRANCH="dev/dev"

echo -e "${CYAN}=== 9Router Upstream Sync Tool ===${NC}"

# 1. Check current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || true)
if [ -z "$CURRENT_BRANCH" ]; then
  echo -e "${RED}Error: Not in a git repository or in detached HEAD state.${NC}"
  exit 1
fi
echo -e "Current working branch: ${YELLOW}${CURRENT_BRANCH}${NC}"

# 2. Configure upstream remote if missing
if ! git remote get-url upstream &>/dev/null; then
  echo -e "Remote 'upstream' not found. Adding ${CYAN}${UPSTREAM_URL}${NC}..."
  git remote add upstream "$UPSTREAM_URL"
else
  EXISTING_URL=$(git remote get-url upstream)
  echo -e "Upstream remote found: ${CYAN}${EXISTING_URL}${NC}"
fi

# 3. Check for uncommitted changes and stash if necessary
STASHED=0
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}Working tree has uncommitted changes. Stashing temporarily...${NC}"
  STASH_TAG="auto-stash-before-sync-$(date +%s)"
  git stash push -u -m "$STASH_TAG"
  STASHED=1
fi

# 4. Fetch upstream master
echo -e "Fetching latest from upstream (${UPSTREAM_BRANCH})..."
git fetch upstream "$UPSTREAM_BRANCH"

# 5. Checkout or create target branch (dev/dev)
echo -e "Switching to target branch: ${YELLOW}${TARGET_BRANCH}${NC}..."
if git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
  git checkout "$TARGET_BRANCH"
elif git show-ref --verify --quiet "refs/remotes/origin/${TARGET_BRANCH}"; then
  echo -e "Tracking ${TARGET_BRANCH} from origin..."
  git checkout -b "$TARGET_BRANCH" "origin/${TARGET_BRANCH}"
else
  echo -e "Creating new branch ${TARGET_BRANCH}..."
  git checkout -b "$TARGET_BRANCH"
fi

# 6. Pull latest origin/dev/dev if it exists
if git show-ref --verify --quiet "refs/remotes/origin/${TARGET_BRANCH}"; then
  echo -e "Pulling latest changes from origin/${TARGET_BRANCH}..."
  git pull origin "$TARGET_BRANCH" --ff-only 2>/dev/null || true
fi

# 7. Merge upstream/master into dev/dev
echo -e "Merging upstream/${UPSTREAM_BRANCH} into ${TARGET_BRANCH}..."
BEFORE_COMMIT=$(git rev-parse HEAD)

if ! git merge "upstream/${UPSTREAM_BRANCH}" -m "chore(sync): merge upstream/${UPSTREAM_BRANCH} (9router) into ${TARGET_BRANCH}"; then
  echo -e "\n${RED}====================================================${NC}"
  echo -e "${RED}MERGE CONFLICT DETECTED in ${TARGET_BRANCH}!${NC}"
  echo -e "${RED}====================================================${NC}"
  echo -e "Conflicting files:"
  git diff --name-only --diff-filter=U | sed 's/^/  - /'
  echo -e "\n${YELLOW}Instructions:${NC}"
  echo -e "1. Resolve the conflicts above."
  echo -e "2. Stage the resolved files: ${CYAN}git add <file>${NC}"
  echo -e "3. Complete the merge: ${CYAN}git commit${NC}"
  echo -e "4. Switch back to your branch: ${CYAN}git checkout ${CURRENT_BRANCH}${NC}"
  if [ "$STASHED" -eq 1 ]; then
    echo -e "5. Restore your stashed changes: ${CYAN}git stash pop${NC}"
  fi
  echo -e "Or to abort the merge: ${CYAN}git merge --abort && git checkout ${CURRENT_BRANCH}${NC}"
  exit 1
fi

AFTER_COMMIT=$(git rev-parse HEAD)

# 8. Report merge summary
if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
  echo -e "${GREEN}Already up to date. No new changes from 9router.${NC}"
else
  echo -e "${GREEN}Successfully merged upstream changes into ${TARGET_BRANCH}!${NC}"
  echo -e "New commits merged:"
  git log "${BEFORE_COMMIT}..${AFTER_COMMIT}" --oneline --graph | sed 's/^/  /'
fi

# 9. Return to original working branch if different
if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
  echo -e "Returning to original branch: ${YELLOW}${CURRENT_BRANCH}${NC}..."
  git checkout "$CURRENT_BRANCH"
fi

# 10. Restore stashed changes if any
if [ "$STASHED" -eq 1 ]; then
  echo -e "${YELLOW}Restoring previously stashed changes...${NC}"
  git stash pop
fi

echo -e "\n${GREEN}✔ Sync completed successfully!${NC}"
