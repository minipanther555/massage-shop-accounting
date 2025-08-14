#!/bin/bash

# HTTPS Configuration Script for EIW Massage Shop
# This script configures SSL/TLS certificates and HTTPS

set -e  # Exit on any error

echo "🔒 Starting HTTPS configuration..."

# Configuration
APP_NAME="massage-shop"
APP_DIR="/opt/massage-shop"
DOMAIN="109.123.238.197"  # Replace with actual domain when available
EMAIL="admin@massage-shop.com"  # Replace with actual email

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
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root for HTTPS configuration"
    print_error "Please run: sudo ./scripts/configure-https.sh"
    exit 1
fi

print_status "Running as root - proceeding with HTTPS configuration..."

# Update system packages
print_status "Updating system packages..."
apt-get update

# Install Certbot and Nginx plugin
print_status "Installing Certbot and Nginx plugin..."
apt-get install -y certbot python3-certbot-nginx

# Check if Nginx is installed and running
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed. Please install Nginx first."
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    print_error "Nginx is not running. Please start Nginx first."
    exit 1
fi

print_status "Nginx is installed and running"

# Backup current Nginx configuration
print_status "Backing up current Nginx configuration..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Create new Nginx configuration for HTTPS
print_status "Creating new Nginx configuration for HTTPS..."

cat > /etc/nginx/sites-available/massage-shop-https << 'EOF'
# HTTPS Configuration for EIW Massage Shop
server {
    listen 80;
    server_name 109.123.238.197;  # Replace with actual domain when available
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 109.123.238.197;  # Replace with actual domain when available
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/109.123.238.197/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/109.123.238.197/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Frontend files
    location / {
        root /opt/massage-shop/web-app;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}
EOF

# Enable the new site
print_status "Enabling new Nginx site..."
ln -sf /etc/nginx/sites-available/massage-shop-https /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Reload Nginx
print_status "Reloading Nginx..."
systemctl reload nginx

# Create webroot for Let's Encrypt challenge
print_status "Creating webroot for Let's Encrypt challenge..."
mkdir -p /var/www/html/.well-known/acme-challenge

# Get SSL certificate using Certbot
print_status "Obtaining SSL certificate from Let's Encrypt..."
print_warning "Note: This will attempt to validate your domain. Make sure your domain points to this server."
print_warning "For IP-based access, you may need to use DNS validation or a different approach."

# Try to get certificate (this may fail for IP-based access)
if certbot certonly --webroot -w /var/www/html -d 109.123.238.197 --email $EMAIL --agree-tos --no-eff-email --force-renewal; then
    print_status "SSL certificate obtained successfully!"
    
    # Reload Nginx with new certificates
    print_status "Reloading Nginx with new SSL certificates..."
    systemctl reload nginx
    
    print_status "HTTPS configuration completed successfully!"
    print_status "Your application is now accessible via HTTPS at: https://109.123.238.197"
    
else
    print_warning "SSL certificate could not be obtained automatically."
    print_warning "This is common for IP-based access without a domain name."
    print_warning "You may need to:"
    print_warning "1. Set up a domain name pointing to this server"
    print_warning "2. Use DNS validation instead of webroot validation"
    print_warning "3. Use a self-signed certificate for testing"
    
    # Option to create self-signed certificate for testing
    read -p "Would you like to create a self-signed certificate for testing? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Creating self-signed certificate for testing..."
        
        # Create directory for self-signed certificate
        mkdir -p /etc/ssl/massage-shop
        
        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/massage-shop/privkey.pem \
            -out /etc/ssl/massage-shop/fullchain.pem \
            -subj "/C=TH/ST=Bangkok/L=Bangkok/O=EIW Massage Shop/CN=109.123.238.197"
        
        # Update Nginx configuration to use self-signed certificate
        sed -i 's|ssl_certificate /etc/letsencrypt/live/109.123.238.197/fullchain.pem;|ssl_certificate /etc/ssl/massage-shop/fullchain.pem;|' /etc/nginx/sites-available/massage-shop-https
        sed -i 's|ssl_certificate_key /etc/letsencrypt/live/109.123.238.197/privkey.pem;|ssl_certificate_key /etc/ssl/massage-shop/privkey.pem;|' /etc/nginx/sites-available/massage-shop-https
        
        # Test and reload Nginx
        nginx -t && systemctl reload nginx
        
        print_status "Self-signed certificate created and configured!"
        print_status "Your application is now accessible via HTTPS at: https://109.123.238.197"
        print_warning "Note: Browsers will show a security warning for self-signed certificates."
    fi
fi

# Set up automatic certificate renewal
print_status "Setting up automatic certificate renewal..."
if command -v crontab &> /dev/null; then
    # Add renewal command to crontab
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    print_status "Automatic certificate renewal scheduled for daily at 12:00 PM"
else
    print_warning "Crontab not available. Please set up manual certificate renewal."
fi

# Final status
print_status "HTTPS configuration script completed!"
print_status "Next steps:"
print_status "1. Test HTTPS access: https://109.123.238.197"
print_status "2. Update your application to use HTTPS URLs"
print_status "3. Consider setting up a domain name for production use"
print_status "4. Monitor certificate expiration and renewal"

echo "✅ HTTPS configuration completed successfully!"
