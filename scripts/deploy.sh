#!/bin/bash

###############################################################################
# Deployment Script for ClickView
#
# This script handles deployment of the ClickView application:
# - Build and test
# - Database migrations
# - Zero-downtime deployment
# - Health checks
# - Rollback capability
#
# Usage:
#   ./deploy.sh [staging|production] [--skip-tests] [--rollback]
#
# Environment variables:
#   - DEPLOY_ENV: staging or production
#   - SKIP_TESTS: Skip test execution (not recommended)
#   - ROLLBACK: Rollback to previous version
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${PROJECT_ROOT}/logs/deploy_${TIMESTAMP}.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Helper Functions
###############################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

confirm() {
    read -p "$1 (yes/no): " response
    if [ "$response" != "yes" ]; then
        log "Deployment cancelled by user."
        exit 0
    fi
}

###############################################################################
# Pre-deployment Checks
###############################################################################

check_prerequisites() {
    log "Checking prerequisites..."

    # Check if running from correct directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Must run from project root directory"
    fi

    # Check required commands
    local commands=("node" "npm" "docker" "docker-compose" "git")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is not installed"
        fi
    done

    # Check environment file
    if [ "$DEPLOY_ENV" == "production" ] && [ ! -f "$PROJECT_ROOT/.env.production" ]; then
        error ".env.production file not found"
    fi

    # Check git status
    if [ -n "$(git status --porcelain)" ]; then
        warn "Working directory has uncommitted changes"
        confirm "Continue with deployment?"
    fi

    log "Prerequisites check passed"
}

###############################################################################
# Version Management
###############################################################################

get_current_version() {
    if [ -f "$PROJECT_ROOT/VERSION" ]; then
        cat "$PROJECT_ROOT/VERSION"
    else
        echo "unknown"
    fi
}

save_version() {
    local version="$1"
    echo "$version" > "$PROJECT_ROOT/VERSION"
    log "Version saved: $version"
}

create_version_tag() {
    local version="$1"

    git tag -a "v$version" -m "Release version $version"
    git push origin "v$version"

    log "Created git tag: v$version"
}

###############################################################################
# Build Process
###############################################################################

build_backend() {
    log "Building backend..."

    cd "$PROJECT_ROOT/backend"

    npm ci --production=false
    npm run build

    if [ $? -eq 0 ]; then
        log "Backend build successful"
    else
        error "Backend build failed"
    fi

    cd "$PROJECT_ROOT"
}

build_frontend() {
    log "Building frontend..."

    cd "$PROJECT_ROOT/frontend"

    npm ci --production=false
    npm run build

    if [ $? -eq 0 ]; then
        log "Frontend build successful"
    else
        error "Frontend build failed"
    fi

    cd "$PROJECT_ROOT"
}

###############################################################################
# Testing
###############################################################################

run_tests() {
    if [ "${SKIP_TESTS:-false}" == "true" ]; then
        warn "Skipping tests (not recommended for production)"
        return
    fi

    log "Running tests..."

    # Backend tests
    log "Running backend tests..."
    cd "$PROJECT_ROOT/backend"
    npm test -- --ci --coverage --maxWorkers=2

    if [ $? -ne 0 ]; then
        error "Backend tests failed"
    fi

    # Frontend tests
    log "Running frontend tests..."
    cd "$PROJECT_ROOT/frontend"
    npm test -- --run --coverage

    if [ $? -ne 0 ]; then
        error "Frontend tests failed"
    fi

    cd "$PROJECT_ROOT"

    log "All tests passed"
}

###############################################################################
# Database Migrations
###############################################################################

run_migrations() {
    log "Running database migrations..."

    # Create backup before migrations
    "$SCRIPT_DIR/backup.sh" database

    # Run migrations
    cd "$PROJECT_ROOT/backend"

    npm run migrate:up

    if [ $? -eq 0 ]; then
        log "Database migrations completed successfully"
    else
        error "Database migrations failed"
    fi

    cd "$PROJECT_ROOT"
}

###############################################################################
# Docker Deployment
###############################################################################

deploy_docker() {
    log "Deploying with Docker Compose..."

    # Load environment-specific env file
    if [ -f "$PROJECT_ROOT/.env.$DEPLOY_ENV" ]; then
        export $(cat "$PROJECT_ROOT/.env.$DEPLOY_ENV" | grep -v '^#' | xargs)
    fi

    # Build Docker images
    log "Building Docker images..."
    docker-compose -f docker-compose.yml -f "docker-compose.$DEPLOY_ENV.yml" build

    if [ $? -ne 0 ]; then
        error "Docker build failed"
    fi

    # Pull latest images
    docker-compose -f docker-compose.yml -f "docker-compose.$DEPLOY_ENV.yml" pull

    # Start new containers (zero-downtime deployment)
    log "Starting new containers..."
    docker-compose -f docker-compose.yml -f "docker-compose.$DEPLOY_ENV.yml" up -d --remove-orphans

    if [ $? -eq 0 ]; then
        log "Containers started successfully"
    else
        error "Failed to start containers"
    fi

    # Remove old containers and images
    log "Cleaning up old containers..."
    docker system prune -f
}

###############################################################################
# Health Checks
###############################################################################

wait_for_health() {
    local max_attempts=30
    local attempt=0
    local health_url="${APP_URL:-http://localhost:3001}/health"

    log "Waiting for application to be healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log "Application is healthy"
            return 0
        fi

        attempt=$((attempt + 1))
        log "Health check attempt $attempt/$max_attempts..."
        sleep 5
    done

    error "Application failed to become healthy after $max_attempts attempts"
}

run_smoke_tests() {
    log "Running smoke tests..."

    local api_url="${APP_URL:-http://localhost:3001}"

    # Test health endpoint
    if ! curl -f -s "${api_url}/health" > /dev/null; then
        error "Health endpoint check failed"
    fi

    # Test ready endpoint
    if ! curl -f -s "${api_url}/health/ready" > /dev/null; then
        error "Ready endpoint check failed"
    fi

    # Test live endpoint
    if ! curl -f -s "${api_url}/health/live" > /dev/null; then
        error "Live endpoint check failed"
    fi

    log "Smoke tests passed"
}

###############################################################################
# Rollback
###############################################################################

rollback_deployment() {
    local previous_version="$1"

    log "Rolling back to version: $previous_version"

    # Checkout previous version
    git checkout "v$previous_version"

    # Rebuild and redeploy
    build_backend
    build_frontend
    deploy_docker

    # Wait for health
    wait_for_health

    log "Rollback completed successfully"
}

###############################################################################
# Notifications
###############################################################################

send_notification() {
    local status="$1"
    local message="$2"

    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"Deployment $status: $message\",
                \"username\": \"Deploy Bot\",
                \"icon_emoji\": \":rocket:\"
            }" > /dev/null 2>&1
    fi

    # Email notification (if configured)
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "$message" | mail -s "Deployment $status" "$NOTIFICATION_EMAIL"
    fi
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    log "===== ClickView Deployment Script ====="
    log "Environment: $DEPLOY_ENV"
    log "Timestamp: $TIMESTAMP"

    # Check if rollback requested
    if [ "${ROLLBACK:-false}" == "true" ]; then
        if [ -z "${ROLLBACK_VERSION:-}" ]; then
            error "ROLLBACK_VERSION must be set for rollback"
        fi

        rollback_deployment "$ROLLBACK_VERSION"
        exit 0
    fi

    # Validate environment
    if [ "$DEPLOY_ENV" != "staging" ] && [ "$DEPLOY_ENV" != "production" ]; then
        error "Invalid environment: $DEPLOY_ENV (must be staging or production)"
    fi

    # Production confirmation
    if [ "$DEPLOY_ENV" == "production" ]; then
        confirm "Deploy to PRODUCTION?"
    fi

    # Get current version
    local current_version=$(get_current_version)
    log "Current version: $current_version"

    # Pre-deployment checks
    check_prerequisites

    # Build
    build_backend
    build_frontend

    # Run tests
    run_tests

    # Run migrations
    run_migrations

    # Deploy
    deploy_docker

    # Health checks
    wait_for_health
    run_smoke_tests

    # Save new version
    local new_version="${current_version%.*}.$((${current_version##*.} + 1))"
    save_version "$new_version"

    # Create git tag (production only)
    if [ "$DEPLOY_ENV" == "production" ]; then
        create_version_tag "$new_version"
    fi

    # Send notifications
    send_notification "SUCCESS" "Successfully deployed version $new_version to $DEPLOY_ENV"

    log "===== Deployment completed successfully ====="
    log "New version: $new_version"
    log "Deployment log: $LOG_FILE"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            export SKIP_TESTS=true
            shift
            ;;
        --rollback)
            export ROLLBACK=true
            shift
            ;;
        --version)
            export ROLLBACK_VERSION="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Run main function
main
