#!/bin/bash

# Backup and Recovery Script for EIW Massage Shop
# This script creates automated backups of your database and application

set -e

# Configuration
APP_NAME="massage-shop"
APP_DIR="/opt/massage-shop"
BACKUP_DIR="/opt/backups/massage-shop"
DATA_DIR="/opt/massage-shop/data"
DB_FILE="$DATA_DIR/massage_shop.db"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to create backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="${APP_NAME}_backup_${timestamp}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_status "Creating backup: $backup_name"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Stop the application to ensure data consistency
    print_status "Stopping application service..."
    sudo systemctl stop $APP_NAME || true
    
    # Wait a moment for the service to stop
    sleep 2
    
    # Backup database
    if [ -f "$DB_FILE" ]; then
        print_status "Backing up database..."
        cp "$DB_FILE" "$backup_path/database.db"
        print_status "Database backup completed"
    else
        print_warning "Database file not found: $DB_FILE"
    fi
    
    # Backup configuration files
    print_status "Backing up configuration files..."
    cp "$APP_DIR/.env" "$backup_path/" 2>/dev/null || print_warning "No .env file found"
    cp "$APP_DIR/package.json" "$backup_path/" 2>/dev/null || print_warning "No package.json found"
    
    # Backup logs (last 7 days)
    print_status "Backing up recent logs..."
    if [ -d "$APP_DIR/logs" ]; then
        find "$APP_DIR/logs" -name "*.log" -mtime -7 -exec cp {} "$backup_path/" \;
    fi
    
    # Create backup manifest
    cat > "$backup_path/manifest.txt" <<EOF
Backup created: $(date)
Application: $APP_NAME
Database: $(basename $DB_FILE)
Configuration files: .env, package.json
Logs: Recent log files
EOF
    
    # Create compressed archive
    print_status "Creating compressed archive..."
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"
    
    print_status "Backup completed: ${backup_name}.tar.gz"
    
    # Restart the application
    print_status "Restarting application service..."
    sudo systemctl start $APP_NAME
    
    # Verify service is running
    if sudo systemctl is-active --quiet $APP_NAME; then
        print_status "Application service restarted successfully"
    else
        print_error "Failed to restart application service"
        exit 1
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify a backup file to restore from"
        echo "Usage: $0 restore <backup_file.tar.gz>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will overwrite your current database and configuration!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring from backup: $backup_file"
    
    # Stop the application
    print_status "Stopping application service..."
    sudo systemctl stop $APP_NAME
    
    # Create restore directory
    local restore_dir="$BACKUP_DIR/restore_temp"
    mkdir -p "$restore_dir"
    
    # Extract backup
    print_status "Extracting backup..."
    tar -xzf "$backup_file" -C "$restore_dir"
    
    # Find the extracted directory
    local extracted_dir=$(find "$restore_dir" -maxdepth 1 -type d | tail -n 1)
    
    if [ -z "$extracted_dir" ]; then
        print_error "Failed to extract backup"
        exit 1
    fi
    
    # Restore database
    if [ -f "$extracted_dir/database.db" ]; then
        print_status "Restoring database..."
        cp "$extracted_dir/database.db" "$DB_FILE"
        sudo chown $APP_NAME:$APP_NAME "$DB_FILE"
        print_status "Database restored successfully"
    else
        print_warning "No database file found in backup"
    fi
    
    # Restore configuration (optional)
    if [ -f "$extracted_dir/.env" ]; then
        print_status "Restoring .env file..."
        cp "$extracted_dir/.env" "$APP_DIR/.env"
        sudo chown $APP_NAME:$APP_NAME "$APP_DIR/.env"
    fi
    
    # Clean up
    rm -rf "$restore_dir"
    
    # Restart the application
    print_status "Restarting application service..."
    sudo systemctl start $APP_NAME
    
    # Verify service is running
    if sudo systemctl is-active --quiet $APP_NAME; then
        print_status "Restore completed successfully"
    else
        print_error "Failed to restart application service after restore"
        exit 1
    fi
}

# Function to list available backups
list_backups() {
    print_status "Available backups:"
    echo
    
    if [ ! "$(ls -A $BACKUP_DIR)" ]; then
        print_warning "No backups found"
        return
    fi
    
    for backup in "$BACKUP_DIR"/*.tar.gz; do
        if [ -f "$backup" ]; then
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d' ' -f1)
            echo "  $filename ($size) - $date"
        fi
    done
}

# Function to clean old backups
cleanup_backups() {
    print_status "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    for backup in "$BACKUP_DIR"/*.tar.gz; do
        if [ -f "$backup" ]; then
            local file_age=$(( ($(date +%s) - $(stat -c %Y "$backup")) / 86400 ))
            if [ $file_age -gt $RETENTION_DAYS ]; then
                rm "$backup"
                deleted_count=$((deleted_count + 1))
                print_status "Deleted old backup: $(basename $backup)"
            fi
        fi
    done
    
    if [ $deleted_count -eq 0 ]; then
        print_status "No old backups to clean up"
    else
        print_status "Cleaned up $deleted_count old backups"
    fi
}

# Function to show backup status
show_status() {
    print_status "Backup Status:"
    echo
    
    # Check if backup directory exists
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
        echo "  Backup directory: $BACKUP_DIR"
        echo "  Total backups: $backup_count"
        echo "  Retention period: $RETENTION_DAYS days"
        
        if [ $backup_count -gt 0 ]; then
            local latest_backup=$(ls -t "$BACKUP_DIR"/*.tar.gz | head -n1)
            local latest_date=$(stat -c %y "$latest_backup" | cut -d' ' -f1,2)
            echo "  Latest backup: $(basename $latest_backup) - $latest_date"
        fi
    else
        echo "  Backup directory: Not found"
    fi
    
    echo
    
    # Check application service status
    if sudo systemctl is-active --quiet $APP_NAME; then
        echo "  Application service: Running"
    else
        echo "  Application service: Stopped"
    fi
    
    # Check database file
    if [ -f "$DB_FILE" ]; then
        local db_size=$(du -h "$DB_FILE" | cut -f1)
        local db_date=$(stat -c %y "$DB_FILE" | cut -d' ' -f1,2)
        echo "  Database: $DB_FILE ($db_size) - $db_date"
    else
        echo "  Database: Not found"
    fi
}

# Main script logic
case "${1:-}" in
    "create")
        create_backup
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "list")
        list_backups
        ;;
    "cleanup")
        cleanup_backups
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 {create|restore|list|cleanup|status}"
        echo
        echo "Commands:"
        echo "  create    - Create a new backup"
        echo "  restore   - Restore from a backup file"
        echo "  list      - List available backups"
        echo "  cleanup   - Remove old backups"
        echo "  status    - Show backup and system status"
        echo
        echo "Examples:"
        echo "  $0 create"
        echo "  $0 restore backup_20250101_120000.tar.gz"
        echo "  $0 list"
        echo "  $0 cleanup"
        echo "  $0 status"
        exit 1
        ;;
esac
