#!/bin/bash

# Production Deployment Script for EIW Massage Shop
# This script helps deploy your application to a VPS

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Configuration
APP_NAME="massage-shop"
APP_DIR="/opt/massage-shop"
SERVICE_NAME="massage-shop"
USER_NAME="massage-shop"
LOG_DIR="/var/log/massage-shop"
DATA_DIR="/opt/massage-shop/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if we're on the production server
if [[ "$(hostname)" != *"your-vps-hostname"* ]]; then
    print_warning "This script is designed for production deployment"
    print_warning "Make sure you're on the correct VPS server"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_status "Setting up production environment..."

# Create application directory
sudo mkdir -p $APP_DIR
sudo mkdir -p $LOG_DIR
sudo mkdir -p $DATA_DIR

# Create system user for the application
if ! id "$USER_NAME" &>/dev/null; then
    print_status "Creating system user: $USER_NAME"
    sudo useradd -r -s /bin/false -d $APP_DIR $USER_NAME
else
    print_status "User $USER_NAME already exists"
fi

# Set ownership
sudo chown -R $USER_NAME:$USER_NAME $APP_DIR
sudo chown -R $USER_NAME:$USER_NAME $LOG_DIR
sudo chown -R $USER_NAME:$USER_NAME $DATA_DIR

# Set proper permissions
sudo chmod 755 $APP_DIR
sudo chmod 755 $LOG_DIR
sudo chmod 700 $DATA_DIR

print_status "Installing Node.js and npm..."

# Install Node.js (Ubuntu/Debian)
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_status "PM2 already installed: $(pm2 --version)"
fi

print_status "Setting up application files..."

# Copy application files (assuming you're running this from the project directory)
sudo cp -r . $APP_DIR/
sudo chown -R $USER_NAME:$USER_NAME $APP_DIR

# Install dependencies
print_status "Installing Node.js dependencies..."
cd $APP_DIR
sudo -u $USER_NAME npm install --production

print_status "Setting up environment configuration..."

# Create production .env file
sudo -u $USER_NAME tee $APP_DIR/.env > /dev/null <<EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_TYPE=sqlite
DB_FILENAME=$DATA_DIR/massage_shop.db

# Security Configuration
SESSION_SECRET=$(openssl rand -hex 32)
LOG_LEVEL=info

# CORS - Update with your actual domain
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_FILE=$LOG_DIR/app.log
ENABLE_FILE_LOGGING=true
ENABLE_CONSOLE_LOGGING=false

# Request Limits
MAX_BODY_SIZE=1mb
MAX_URL_LENGTH=2048
MAX_HEADERS_SIZE=16kb
REQUEST_TIMEOUT=15000

# CSRF Protection
CSRF_TOKEN_EXPIRY=86400000
EOF

print_status "Setting up systemd service..."

# Create systemd service file
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=EIW Massage Shop Bookkeeping System
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$APP_DIR $LOG_DIR $DATA_DIR

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

print_status "Setting up firewall..."

# Configure UFW firewall
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP (for reverse proxy)
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw --force enable
    print_status "Firewall configured and enabled"
else
    print_warning "UFW not found. Please configure firewall manually."
fi

print_status "Setting up Nginx reverse proxy..."

# Install Nginx
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/$SERVICE_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Update with your domain

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;  # Update with your domain

    # SSL configuration (you'll need to set up SSL certificates)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files (if you serve them through Nginx)
    location /static/ {
        alias $APP_DIR/web-app/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site

# Test Nginx configuration
sudo nginx -t

print_status "Setting up log rotation..."

# Create logrotate configuration
sudo tee /etc/logrotate.d/$SERVICE_NAME > /dev/null <<EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER_NAME $USER_NAME
    postrotate
        systemctl reload $SERVICE_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

print_status "Starting services..."

# Start the application service
sudo systemctl start $SERVICE_NAME
sudo systemctl status $SERVICE_NAME

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

print_status "Deployment completed successfully!"
echo
echo "Next steps:"
echo "1. Update the domain name in Nginx configuration"
echo "2. Set up SSL certificates with Let's Encrypt"
echo "3. Configure your domain's DNS to point to this server"
echo "4. Test the application at http://your-domain.com"
echo
echo "Useful commands:"
echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "  Restart app: sudo systemctl restart $SERVICE_NAME"
echo "  View app status: sudo systemctl status $SERVICE_NAME"
echo "  View Nginx logs: sudo tail -f /var/log/nginx/access.log"
echo
echo "The application is now running as a system service and will start automatically on boot."
