#!/bin/bash

# Production Monitoring Script for EIW Massage Shop
# This script monitors system health, application status, and performance

set -e

# Configuration
APP_NAME="massage-shop"
APP_DIR="/opt/massage-shop"
LOG_DIR="/var/log/massage-shop"
DATA_DIR="/opt/massage-shop/data"
DB_FILE="$DATA_DIR/massage_shop.db"
ALERT_EMAIL="admin@yourdomain.com"  # Update with your email

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check system resources
check_system_resources() {
    print_header "System Resources"
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "  CPU Usage: ${cpu_usage}%"
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        print_warning "High CPU usage detected: ${cpu_usage}%"
    fi
    
    # Memory usage
    local mem_info=$(free -m | grep Mem)
    local mem_total=$(echo $mem_info | awk '{print $2}')
    local mem_used=$(echo $mem_info | awk '{print $3}')
    local mem_usage=$((mem_used * 100 / mem_total))
    
    echo "  Memory Usage: ${mem_usage}% (${mem_used}MB / ${mem_total}MB)"
    
    if [ $mem_usage -gt 80 ]; then
        print_warning "High memory usage detected: ${mem_usage}%"
    fi
    
    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    echo "  Disk Usage: ${disk_usage}%"
    
    if [ $disk_usage -gt 80 ]; then
        print_warning "High disk usage detected: ${disk_usage}%"
    fi
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    echo "  Load Average: $load_avg"
    
    if (( $(echo "$load_avg > 2.0" | bc -l) )); then
        print_warning "High load average detected: $load_avg"
    fi
}

# Function to check application service
check_application_service() {
    print_header "Application Service"
    
    if sudo systemctl is-active --quiet $APP_NAME; then
        echo "  Status: Running"
        
        # Check service uptime
        local uptime=$(systemctl show $APP_NAME --property=ActiveEnterTimestamp | cut -d'=' -f2)
        echo "  Started: $uptime"
        
        # Check recent logs for errors
        local error_count=$(sudo journalctl -u $APP_NAME --since "1 hour ago" | grep -i "error\|exception\|failed" | wc -l)
        echo "  Errors in last hour: $error_count"
        
        if [ $error_count -gt 5 ]; then
            print_warning "High error rate detected: $error_count errors in last hour"
        fi
        
    else
        print_error "Application service is not running!"
        echo "  Status: Stopped"
        
        # Try to start the service
        print_status "Attempting to start the service..."
        sudo systemctl start $APP_NAME
        
        if sudo systemctl is-active --quiet $APP_NAME; then
            print_status "Service started successfully"
        else
            print_error "Failed to start service"
        fi
    fi
}

# Function to check database
check_database() {
    print_header "Database Status"
    
    if [ -f "$DB_FILE" ]; then
        local db_size=$(du -h "$DB_FILE" | cut -f1)
        local db_date=$(stat -c %y "$DB_FILE" | cut -d' ' -f1,2)
        echo "  File: $DB_FILE"
        echo "  Size: $db_size"
        echo "  Last Modified: $db_date"
        
        # Check if database is accessible
        if command -v sqlite3 &> /dev/null; then
            if sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master;" > /dev/null 2>&1; then
                echo "  Status: Accessible"
                
                # Check table counts
                local table_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
                echo "  Tables: $table_count"
                
                # Check recent transactions
                local recent_transactions=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM transactions WHERE date >= date('now', '-1 day');" 2>/dev/null || echo "0")
                echo "  Transactions today: $recent_transactions"
                
            else
                print_error "Database file exists but is not accessible"
            fi
        else
            echo "  Status: sqlite3 not available for detailed checks"
        fi
    else
        print_error "Database file not found: $DB_FILE"
    fi
}

# Function to check network connectivity
check_network() {
    print_header "Network Connectivity"
    
    # Check if application is listening on port 3000
    if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        echo "  Application Port: Listening on 3000"
    else
        print_warning "Application not listening on port 3000"
    fi
    
    # Check if Nginx is running
    if sudo systemctl is-active --quiet nginx; then
        echo "  Nginx: Running"
        
        # Check Nginx configuration
        if sudo nginx -t > /dev/null 2>&1; then
            echo "  Nginx Config: Valid"
        else
            print_error "Nginx configuration has errors"
        fi
    else
        print_warning "Nginx is not running"
    fi
    
    # Check firewall status
    if command -v ufw &> /dev/null; then
        local ufw_status=$(sudo ufw status | head -n1)
        echo "  Firewall: $ufw_status"
    else
        echo "  Firewall: UFW not found"
    fi
}

# Function to check logs
check_logs() {
    print_header "Application Logs"
    
    if [ -d "$LOG_DIR" ]; then
        local log_files=$(find "$LOG_DIR" -name "*.log" -type f)
        
        if [ -n "$log_files" ]; then
            echo "  Log directory: $LOG_DIR"
            
            for log_file in $log_files; do
                local filename=$(basename "$log_file")
                local size=$(du -h "$log_file" | cut -f1)
                local lines=$(wc -l < "$log_file")
                echo "    $filename: $size, $lines lines"
                
                # Check for recent errors
                local recent_errors=$(tail -100 "$log_file" | grep -i "error\|exception\|failed" | wc -l)
                if [ $recent_errors -gt 0 ]; then
                    echo "      Recent errors: $recent_errors"
                fi
            done
        else
            echo "  No log files found"
        fi
    else
        echo "  Log directory not found: $LOG_DIR"
    fi
    
    # Check systemd journal for application logs
    echo "  Systemd Journal (last 50 lines):"
    sudo journalctl -u $APP_NAME -n 50 --no-pager | tail -20
}

# Function to check security
check_security() {
    print_header "Security Status"
    
    # Check for failed login attempts
    local failed_logins=$(sudo journalctl -u $APP_NAME --since "1 hour ago" | grep -i "login failed\|authentication failed" | wc -l)
    echo "  Failed login attempts (1 hour): $failed_logins"
    
    if [ $failed_logins -gt 10 ]; then
        print_warning "High number of failed login attempts: $failed_logins"
    fi
    
    # Check for suspicious requests
    local suspicious_requests=$(sudo journalctl -u $APP_NAME --since "1 hour ago" | grep -i "rate limit\|forbidden\|unauthorized" | wc -l)
    echo "  Suspicious requests (1 hour): $suspicious_requests"
    
    # Check file permissions
    local app_perms=$(stat -c %a "$APP_DIR")
    local data_perms=$(stat -c %a "$DATA_DIR" 2>/dev/null || echo "N/A")
    
    echo "  App directory permissions: $app_perms"
    echo "  Data directory permissions: $data_perms"
    
    if [ "$app_perms" != "755" ]; then
        print_warning "App directory has non-standard permissions: $app_perms"
    fi
}

# Function to check performance
check_performance() {
    print_header "Performance Metrics"
    
    # Check response time (if curl is available)
    if command -v curl &> /dev/null; then
        local start_time=$(date +%s%N)
        local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        
        echo "  Health check response: HTTP $response in ${response_time}ms"
        
        if [ "$response" != "200" ]; then
            print_warning "Health check failed with status: $response"
        fi
        
        if [ $response_time -gt 1000 ]; then
            print_warning "Slow response time: ${response_time}ms"
        fi
    else
        echo "  Health check: curl not available"
    fi
    
    # Check active connections
    if command -v netstat &> /dev/null; then
        local active_connections=$(netstat -an | grep :3000 | grep ESTABLISHED | wc -l)
        echo "  Active connections: $active_connections"
    fi
    
    # Check process resources
    local app_pid=$(sudo systemctl show $APP_NAME --property=MainPID | cut -d'=' -f2)
    if [ -n "$app_pid" ] && [ "$app_pid" != "0" ]; then
        local process_memory=$(ps -o rss= -p $app_pid | awk '{print $1/1024}')
        echo "  Process memory usage: ${process_memory}MB"
        
        if (( $(echo "$process_memory > 500" | bc -l) )); then
            print_warning "High memory usage by application: ${process_memory}MB"
        fi
    fi
}

# Function to generate summary report
generate_summary() {
    print_header "Summary Report"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "  Generated: $timestamp"
    
    # Count warnings and errors
    local warning_count=$(echo "$MONITOR_OUTPUT" | grep -c "WARNING" || echo "0")
    local error_count=$(echo "$MONITOR_OUTPUT" | grep -c "ERROR" || echo "0")
    
    echo "  Warnings: $warning_count"
    echo "  Errors: $error_count"
    
    if [ $error_count -gt 0 ]; then
        print_error "System has $error_count errors that need attention!"
    elif [ $warning_count -gt 0 ]; then
        print_warning "System has $warning_count warnings to monitor"
    else
        print_status "System is healthy with no issues detected"
    fi
}

# Function to send alert email (if configured)
send_alert() {
    local subject="$1"
    local message="$2"
    
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        print_status "Alert email sent to $ALERT_EMAIL"
    fi
}

# Main monitoring function
run_monitoring() {
    echo "🔍 Starting system monitoring for $APP_NAME..."
    echo
    
    # Capture all output for summary
    MONITOR_OUTPUT=$(mktemp)
    
    {
        check_system_resources
        echo
        check_application_service
        echo
        check_database
        echo
        check_network
        echo
        check_logs
        echo
        check_security
        echo
        check_performance
        echo
    } 2>&1 | tee "$MONITOR_OUTPUT"
    
    # Generate summary
    generate_summary
    
    # Clean up
    rm "$MONITOR_OUTPUT"
}

# Function to run continuous monitoring
continuous_monitoring() {
    local interval=${1:-60}  # Default 60 seconds
    
    print_status "Starting continuous monitoring (every ${interval} seconds)"
    print_status "Press Ctrl+C to stop"
    
    while true; do
        clear
        run_monitoring
        echo
        print_status "Next check in ${interval} seconds..."
        sleep $interval
    done
}

# Main script logic
case "${1:-}" in
    "once")
        run_monitoring
        ;;
    "continuous")
        continuous_monitoring "${2:-60}"
        ;;
    "system")
        check_system_resources
        ;;
    "app")
        check_application_service
        ;;
    "db")
        check_database
        ;;
    "network")
        check_network
        ;;
    "logs")
        check_logs
        ;;
    "security")
        check_security
        ;;
    "performance")
        check_performance
        ;;
    *)
        echo "Usage: $0 {once|continuous|system|app|db|network|logs|security|performance}"
        echo
        echo "Commands:"
        echo "  once        - Run monitoring once and exit"
        echo "  continuous  - Run monitoring continuously (default: 60s interval)"
        echo "  system      - Check system resources only"
        echo "  app         - Check application service only"
        echo "  db          - Check database only"
        echo "  network     - Check network connectivity only"
        echo "  logs        - Check application logs only"
        echo "  security    - Check security status only"
        echo "  performance - Check performance metrics only"
        echo
        echo "Examples:"
        echo "  $0 once"
        echo "  $0 continuous 30"
        echo "  $0 system"
        echo "  $0 app"
        exit 1
        ;;
esac
