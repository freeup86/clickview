#!/bin/bash

###############################################################################
# Backup and Disaster Recovery Script
#
# This script performs automated backups of:
# - PostgreSQL/TimescaleDB database
# - Redis data
# - Application files
# - Configuration files
#
# Usage:
#   ./backup.sh [full|incremental|database|redis|config]
#
# Environment variables (set in .env or pass directly):
#   - BACKUP_DIR: Directory to store backups (default: /var/backups/clickview)
#   - DB_HOST: PostgreSQL host
#   - DB_PORT: PostgreSQL port
#   - DB_NAME: Database name
#   - DB_USER: Database user
#   - REDIS_HOST: Redis host
#   - REDIS_PORT: Redis port
#   - RETENTION_DAYS: Number of days to keep backups (default: 30)
#   - S3_BUCKET: S3 bucket for remote backup (optional)
###############################################################################

set -euo pipefail

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/clickview}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-clickview}"
DB_USER="${DB_USER:-postgres}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

check_dependencies() {
    local deps=("pg_dump" "pg_restore" "redis-cli" "tar" "gzip")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep is not installed. Please install it and try again."
        fi
    done

    log "All dependencies are installed."
}

create_backup_dirs() {
    mkdir -p "$BACKUP_DIR"/{database,redis,files,config}
    log "Backup directories created: $BACKUP_DIR"
}

###############################################################################
# Database Backup
###############################################################################

backup_database() {
    log "Starting database backup..."

    local backup_file="${BACKUP_DIR}/database/db_${TIMESTAMP}.sql.gz"
    local backup_custom="${BACKUP_DIR}/database/db_${TIMESTAMP}.dump"

    # Plain SQL backup (compressed)
    log "Creating plain SQL backup..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-acl \
        | gzip > "$backup_file"

    if [ $? -eq 0 ]; then
        log "Plain SQL backup created: $backup_file ($(du -h "$backup_file" | cut -f1))"
    else
        error "Failed to create plain SQL backup"
    fi

    # Custom format backup (for pg_restore)
    log "Creating custom format backup..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --verbose \
        --no-owner \
        --no-acl \
        --file="$backup_custom"

    if [ $? -eq 0 ]; then
        log "Custom format backup created: $backup_custom ($(du -h "$backup_custom" | cut -f1))"
    else
        error "Failed to create custom format backup"
    fi

    # Verify backup
    if gzip -t "$backup_file" 2>/dev/null; then
        log "Backup verification: OK"
    else
        error "Backup verification failed"
    fi
}

backup_database_incremental() {
    log "Starting incremental database backup (WAL archiving)..."

    # This requires WAL archiving to be enabled in PostgreSQL
    # pg_basebackup can be used for incremental backups

    local backup_dir="${BACKUP_DIR}/database/incremental_${TIMESTAMP}"

    PGPASSWORD="$DB_PASSWORD" pg_basebackup \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -D "$backup_dir" \
        -Ft \
        -z \
        -P \
        --wal-method=fetch

    if [ $? -eq 0 ]; then
        log "Incremental backup created: $backup_dir"
    else
        warn "Incremental backup failed. Ensure WAL archiving is enabled."
    fi
}

###############################################################################
# Redis Backup
###############################################################################

backup_redis() {
    log "Starting Redis backup..."

    local backup_file="${BACKUP_DIR}/redis/redis_${TIMESTAMP}.rdb"

    # Trigger Redis save
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE

    if [ $? -eq 0 ]; then
        log "Redis BGSAVE initiated"

        # Wait for save to complete
        while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" == "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" ]; do
            sleep 1
        done

        # Copy RDB file
        local redis_dir=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir | tail -n 1)
        local rdb_file=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dbfilename | tail -n 1)

        if [ -f "${redis_dir}/${rdb_file}" ]; then
            cp "${redis_dir}/${rdb_file}" "$backup_file"
            gzip "$backup_file"
            log "Redis backup created: ${backup_file}.gz ($(du -h "${backup_file}.gz" | cut -f1))"
        else
            warn "Redis RDB file not found at ${redis_dir}/${rdb_file}"
        fi
    else
        error "Failed to trigger Redis BGSAVE"
    fi
}

###############################################################################
# File Backup
###############################################################################

backup_files() {
    log "Starting application files backup..."

    local backup_file="${BACKUP_DIR}/files/files_${TIMESTAMP}.tar.gz"

    # Backup application files (excluding node_modules, logs, etc.)
    tar -czf "$backup_file" \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='logs' \
        --exclude='.git' \
        --exclude='cypress/downloads' \
        --exclude='cypress/screenshots' \
        --exclude='cypress/videos' \
        -C "$(dirname "$(pwd)")" \
        "$(basename "$(pwd)")"

    if [ $? -eq 0 ]; then
        log "Files backup created: $backup_file ($(du -h "$backup_file" | cut -f1))"
    else
        error "Failed to create files backup"
    fi
}

###############################################################################
# Configuration Backup
###############################################################################

backup_config() {
    log "Starting configuration backup..."

    local backup_file="${BACKUP_DIR}/config/config_${TIMESTAMP}.tar.gz"

    # Backup configuration files
    tar -czf "$backup_file" \
        .env.production \
        .env.example \
        docker-compose.yml \
        docker-compose.prod.yml \
        nginx.conf \
        backend/tsconfig.json \
        frontend/tsconfig.json \
        2>/dev/null || true

    if [ -f "$backup_file" ]; then
        log "Config backup created: $backup_file ($(du -h "$backup_file" | cut -f1))"
    else
        warn "No configuration files found to backup"
    fi
}

###############################################################################
# Remote Backup (S3)
###############################################################################

upload_to_s3() {
    if [ -z "${S3_BUCKET:-}" ]; then
        log "S3_BUCKET not configured. Skipping remote backup."
        return
    fi

    log "Uploading backups to S3: s3://$S3_BUCKET/backups/$TIMESTAMP/"

    if command -v aws &> /dev/null; then
        aws s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET/backups/$TIMESTAMP/" \
            --exclude "*" \
            --include "database/*" \
            --include "redis/*" \
            --include "config/*"

        if [ $? -eq 0 ]; then
            log "Backup uploaded to S3 successfully"
        else
            error "Failed to upload backup to S3"
        fi
    else
        warn "AWS CLI not installed. Skipping S3 upload."
    fi
}

###############################################################################
# Cleanup Old Backups
###############################################################################

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

    local deleted_count=$(find "$BACKUP_DIR" -type d -empty -delete | wc -l)

    log "Cleanup completed. Removed $deleted_count old backups."
}

###############################################################################
# Restore Functions
###############################################################################

restore_database() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi

    log "Restoring database from: $backup_file"

    # Confirm restoration
    read -p "This will overwrite the current database. Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled."
        exit 0
    fi

    # Drop existing connections
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

    # Restore based on file extension
    if [[ "$backup_file" == *.dump ]]; then
        # Custom format restore
        PGPASSWORD="$DB_PASSWORD" pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --clean \
            --if-exists \
            --verbose \
            "$backup_file"
    elif [[ "$backup_file" == *.sql.gz ]]; then
        # Plain SQL restore
        gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME"
    else
        error "Unknown backup format: $backup_file"
    fi

    if [ $? -eq 0 ]; then
        log "Database restored successfully"
    else
        error "Database restoration failed"
    fi
}

restore_redis() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi

    log "Restoring Redis from: $backup_file"

    # Stop Redis (if running locally)
    systemctl stop redis 2>/dev/null || true

    # Copy RDB file
    gunzip -c "$backup_file" > /var/lib/redis/dump.rdb

    # Start Redis
    systemctl start redis 2>/dev/null || true

    log "Redis restored successfully"
}

###############################################################################
# Main Function
###############################################################################

main() {
    local backup_type="${1:-full}"

    log "===== ClickView Backup Script ====="
    log "Backup type: $backup_type"
    log "Timestamp: $TIMESTAMP"

    check_dependencies
    create_backup_dirs

    case "$backup_type" in
        full)
            backup_database
            backup_redis
            backup_files
            backup_config
            upload_to_s3
            cleanup_old_backups
            ;;
        incremental)
            backup_database_incremental
            ;;
        database)
            backup_database
            ;;
        redis)
            backup_redis
            ;;
        config)
            backup_config
            ;;
        restore-db)
            if [ -z "${2:-}" ]; then
                error "Usage: $0 restore-db <backup_file>"
            fi
            restore_database "$2"
            ;;
        restore-redis)
            if [ -z "${2:-}" ]; then
                error "Usage: $0 restore-redis <backup_file>"
            fi
            restore_redis "$2"
            ;;
        *)
            echo "Usage: $0 [full|incremental|database|redis|config|restore-db|restore-redis]"
            exit 1
            ;;
    esac

    log "===== Backup completed successfully ====="
}

main "$@"
