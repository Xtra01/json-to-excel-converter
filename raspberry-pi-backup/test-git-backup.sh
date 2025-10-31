#!/bin/bash

# Git Backup Test Script
# Windows ortamında Git backup sistemini test eder

echo "🧪 Git Backup System - Test Mode"
echo "================================="

# Test directory
TEST_DIR="./git-backup-test"
LOG_FILE="./git-test.log"

# Colors for Windows
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Test Git functionality
test_git_operations() {
    log "Testing Git operations..."
    
    # Clean up previous test
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    # Initialize Git repository
    log "Initializing Git repository..."
    git init
    git config user.name "Pi Backup Test"
    git config user.email "test@pi-backup.local"
    
    # Create test files
    echo "# Test Backup Repository" > README.md
    echo "Created: $(date)" >> README.md
    
    cat > SYSTEM_INFO.md << EOF
# System Information

**Generated:** $(date)
**Hostname:** $(hostname)
**User:** $(whoami)

## Test Data
- CPU: Test CPU
- Memory: 16GB
- Disk: 1TB SSD

## Software Versions
- Git: $(git --version)
- OS: Windows
EOF
    
    cat > .gitignore << 'EOF'
*.log
*.tmp
*~
.DS_Store
Thumbs.db
EOF
    
    # Stage and commit
    log "Creating initial commit..."
    git add .
    git commit -m "Initial commit: Test backup repository

System Changes:
- Created README.md
- Created SYSTEM_INFO.md
- Created .gitignore

System Status:
- Uptime: Test uptime
- Load: Test load
- Memory: Test memory usage
- Disk: Test disk usage"
    
    # Create version tag
    local version_tag="v$(date +'%Y.%m.%d-%H%M%S')"
    git tag -a "$version_tag" -m "Test backup version $(date +'%Y-%m-%d %H:%M:%S')

Backup includes:
- System configuration files
- Application source code
- Service definitions
- Monitoring scripts
- Deployment automation

System: Test (127.0.0.1)"

    log "Version tag created: $version_tag"
    
    # Show Git status
    echo ""
    log "Git repository status:"
    git log --oneline --decorate --graph -n 5
    echo ""
    git status
    echo ""
    
    cd ..
    
    log "✅ Git operations test completed successfully!"
}

# Test changelog generation
test_changelog() {
    log "Testing changelog generation..."
    
    cd "$TEST_DIR"
    
    cat > CHANGELOG.md << 'EOF'
# Backup Changelog

This file contains the version history of the Raspberry Pi backup.

## Version History

EOF
    
    # Add Git log
    git log --oneline --decorate --graph -n 20 >> CHANGELOG.md 2>/dev/null || true
    
    log "✅ Changelog generated successfully!"
    
    cd ..
}

# Test file operations
test_file_operations() {
    log "Testing file operations..."
    
    cd "$TEST_DIR"
    
    # Simulate file changes
    echo "" >> README.md
    echo "## Update" >> README.md
    echo "Last updated: $(date)" >> README.md
    
    # Check for changes
    if ! git diff --quiet; then
        log "Changes detected in test repository"
        
        # Stage changes
        git add .
        
        # Create commit
        git commit -m "Test update: $(date +'%Y-%m-%d %H:%M:%S')

File Changes:
- Updated README.md

System Status:
- Test update successful"
        
        log "✅ Changes committed successfully!"
    else
        log "No changes detected"
    fi
    
    cd ..
}

# Main test function
main() {
    log "Starting Git backup system test..."
    
    # Check Git availability
    if ! command -v git &> /dev/null; then
        error "Git is not installed or not in PATH"
        exit 1
    fi
    
    log "Git version: $(git --version)"
    
    # Run tests
    test_git_operations
    test_changelog
    test_file_operations
    
    # Show final status
    echo ""
    log "=== FINAL TEST RESULTS ==="
    
    cd "$TEST_DIR"
    echo "Repository location: $(pwd)"
    echo "Total commits: $(git rev-list --count HEAD)"
    echo "Latest commit: $(git log -1 --format="%h - %s (%cr)")"
    echo "Tags: $(git tag -l | tr '\n' ' ')"
    echo "Repository size: $(du -sh .git | cut -f1)"
    
    cd ..
    
    log "🎉 Git backup system test completed successfully!"
    log "💡 Test repository created in: $TEST_DIR"
    log "📝 Test log saved in: $LOG_FILE"
    
    echo ""
    echo "Next steps:"
    echo "1. Review test results in $TEST_DIR"
    echo "2. Check git log: cd $TEST_DIR && git log --oneline"
    echo "3. Configure real backup with: ./git-backup.sh init"
}

# Run main function
main "$@"