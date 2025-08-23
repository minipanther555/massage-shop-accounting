# Production Deployment Guide for EIW Massage Shop

## Overview
This guide covers deploying your massage shop bookkeeping system to a production VPS server. The system is designed to be secure, reliable, and easy to maintain.

## Prerequisites

### VPS Requirements
- **Operating System**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 2GB, recommended 4GB
- **Storage**: Minimum 20GB, recommended 50GB
- **CPU**: 2 cores minimum
- **Network**: Public IP address with ports 22, 80, 443 open

### Domain Name (Optional but Recommended)
- A domain name for your business
- DNS access to point domain to your VPS IP

## Local Development Environment Setup (NEW)

**Objective**: To ensure a consistent and reliable development environment that perfectly mirrors the production server, all local development **must** be done using Docker. This eliminates "it works on my machine" errors.

### Prerequisites
- Docker Desktop installed and running on your local machine.

### First-Time Setup
1.  **Get Production Data:** A snapshot of the production database has been included in `docker/data/massage_shop.db`.
2.  **Build and Start:** Run the following command from the project root. This will build the container image, download the correct dependencies, and start the application.
    ```bash
    docker-compose -f docker/docker-compose.yml up --build -d
    ```
3.  **Access Application:** The application will be available at `http://localhost:3000`.

### Daily Usage
- **Start the application:** `docker-compose -f docker/docker-compose.yml up -d`
- **Stop the application:** `docker-compose -f docker/docker-compose.yml down`
- **View logs:** `docker-compose -f docker/docker-compose.yml logs -f app`

For more details, see the `00-project-docs/docker/docker-system-documentation.md` file.

## Deployment Steps

### Step 1: Server Preparation

#### 1.1 Connect to Your VPS
```bash
ssh root@your-vps-ip-address
```

#### 1.2 Update System
```bash
apt update && apt upgrade -y
apt install -y curl wget git ufw
```

#### 1.3 Create Non-Root User
```bash
adduser massage-shop
usermod -aG sudo massage-shop
```

#### 1.4 Switch to New User
```bash
su - massage-shop
```

### Step 2: Application Deployment

#### 2.1 Clone Your Application
```bash
cd /opt
sudo git clone https://github.com/yourusername/eiw-massage-shop-bookkeeping.git massage-shop
sudo chown -R massage-shop:massage-shop massage-shop
cd massage-shop
```

#### 2.2 Run Deployment Script
```bash
cd backend
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**What the deployment script does:**
- Installs Node.js and npm
- Sets up systemd service
- Configures Nginx reverse proxy
- Sets up firewall rules
- Creates log rotation
- Sets proper file permissions

### Step 3: Configuration

#### 3.1 Update Domain in Nginx
```bash
sudo nano /etc/nginx/sites-available/massage-shop
```
Change `your-domain.com` to your actual domain.

#### 3.2 Set Up SSL (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 3.3 Update Environment Variables
```bash
sudo nano /opt/massage-shop/backend/.env
```
Update with your production values.

### Step 4: Testing

#### 4.1 Check Service Status
```bash
sudo systemctl status massage-shop
sudo systemctl status nginx
```

#### 4.2 Test Application
```bash
curl http://localhost:3000/health
curl https://your-domain.com/health
```

## Production Features

### Security Features
- **Rate Limiting**: Prevents brute force attacks
- **CSRF Protection**: Stops cross-site request forgery
- **Input Validation**: Prevents injection attacks
- **Security Headers**: Protects against XSS and clickjacking
- **Firewall**: UFW configured with minimal open ports

### Monitoring and Maintenance

#### 5.1 System Monitoring
```bash
cd /opt/massage-shop/backend
./scripts/monitor.sh once          # Check once
./scripts/monitor.sh continuous    # Monitor continuously
./scripts/monitor.sh system        # Check system resources only
./scripts/monitor.sh app           # Check application only
```

#### 5.2 Backup and Recovery
```bash
cd /opt/massage-shop/backend
./scripts/backup.sh create         # Create backup
./scripts/backup.sh list           # List backups
./scripts/backup.sh restore backup_file.tar.gz  # Restore from backup
./scripts/backup.sh cleanup        # Remove old backups
```

### Log Management
- **Application Logs**: `/var/log/massage-shop/`
- **System Logs**: `sudo journalctl -u massage-shop`
- **Nginx Logs**: `/var/log/nginx/`
- **Log Rotation**: Automatic daily rotation with 7-day retention

## Maintenance Tasks

### Daily
- Check service status: `sudo systemctl status massage-shop`
- Review error logs: `sudo journalctl -u massage-shop --since "1 day ago" | grep ERROR`

### Weekly
- Create backup: `./scripts/backup.sh create`
- Check disk usage: `df -h`
- Review security logs: `./scripts/monitor.sh security`

### Monthly
- Update system packages: `sudo apt update && sudo apt upgrade`
- Review and clean old backups: `./scripts/backup.sh cleanup`
- Check SSL certificate expiration: `sudo certbot certificates`

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status massage-shop

# Check logs
sudo journalctl -u massage-shop -f

# Check configuration
sudo nginx -t
```

#### Database Issues
```bash
# Check database file
ls -la /opt/massage-shop/data/

# Check database permissions
sudo chown massage-shop:massage-shop /opt/massage-shop/data/massage_shop.db
```

#### Performance Issues
```bash
# Check system resources
./scripts/monitor.sh system

# Check application performance
./scripts/monitor.sh performance

# Check for memory leaks
ps aux | grep node
```

### Emergency Recovery

#### Complete System Restore
```bash
# Stop services
sudo systemctl stop massage-shop nginx

# Restore from backup
./scripts/backup.sh restore latest_backup.tar.gz

# Start services
sudo systemctl start massage-shop nginx
```

#### Database Recovery
```bash
# Stop application
sudo systemctl stop massage-shop

# Copy backup database
sudo cp /opt/backups/massage-shop/latest_backup/database.db /opt/massage-shop/data/

# Fix permissions
sudo chown massage-shop:massage-shop /opt/massage-shop/data/massage_shop.db

# Start application
sudo systemctl start massage-shop
```

## Security Best Practices

### Firewall Configuration
- Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) are open
- SSH key authentication recommended
- Fail2ban can be added for additional SSH protection

### File Permissions
- Application files: 755 (readable by all, writable by owner)
- Data directory: 700 (only owner can access)
- Log files: 644 (readable by all, writable by owner)

### User Management
- Application runs as dedicated `massage-shop` user
- No shell access for application user
- Minimal sudo privileges

## Scaling Considerations

### Current Architecture
- Single Node.js process
- SQLite database
- Nginx reverse proxy
- In-memory session storage

### Future Scaling Options
- **Database**: Migrate to PostgreSQL/MySQL for multi-user access
- **Load Balancing**: Add multiple application instances behind Nginx
- **Session Storage**: Use Redis for shared session storage
- **Monitoring**: Add Prometheus/Grafana for advanced metrics

## Backup Strategy

### Automated Backups
- **Frequency**: Daily at 2 AM
- **Retention**: 30 days
- **Location**: `/opt/backups/massage-shop/`
- **Content**: Database, configuration, recent logs

### Manual Backups
```bash
# Create immediate backup
./scripts/backup.sh create

# List available backups
./scripts/backup.sh list

# Restore specific backup
./scripts/backup.sh restore backup_20250101_120000.tar.gz
```

### Off-Site Backup (Recommended)
- Copy backup files to external storage
- Use rsync or scp for automated transfer
- Consider cloud storage (AWS S3, Google Cloud Storage)

## Performance Optimization

### Current Optimizations
- **Request Timeout**: 15 seconds
- **Body Size Limit**: 1MB
- **Rate Limiting**: 100 requests per 15 minutes
- **Log Rotation**: Prevents disk space issues

### Monitoring Performance
```bash
# Check response times
./scripts/monitor.sh performance

# Monitor system resources
./scripts/monitor.sh system

# Check application logs
./scripts/monitor.sh logs
```

## SSL/TLS Configuration

### Let's Encrypt Setup
- Automatic certificate renewal
- HTTP to HTTPS redirect
- Modern SSL configuration
- Security headers enabled

### SSL Configuration
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled
- OCSP stapling

## Support and Maintenance

### Log Locations
- **Application**: `/var/log/massage-shop/app.log`
- **System**: `sudo journalctl -u massage-shop`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

### Useful Commands
```bash
# View real-time logs
sudo journalctl -u massage-shop -f

# Check service status
sudo systemctl status massage-shop

# Restart services
sudo systemctl restart massage-shop
sudo systemctl restart nginx

# Check configuration
sudo nginx -t
```

### Emergency Contacts
- **System Administrator**: Your contact information
- **Hosting Provider**: VPS provider support
- **Domain Registrar**: Domain management support

---

## Quick Reference

### Service Management
```bash
sudo systemctl start massage-shop    # Start application
sudo systemctl stop massage-shop     # Stop application
sudo systemctl restart massage-shop  # Restart application
sudo systemctl status massage-shop   # Check status
```

### Monitoring
```bash
./scripts/monitor.sh once            # Quick health check
./scripts/monitor.sh continuous      # Continuous monitoring
./scripts/monitor.sh security        # Security check
```

### Backup
```bash
./scripts/backup.sh create           # Create backup
./scripts/backup.sh list             # List backups
./scripts/backup.sh restore file.tar.gz  # Restore
```

### Logs
```bash
sudo journalctl -u massage-shop -f   # Follow logs
sudo journalctl -u massage-shop --since "1 hour ago"  # Recent logs
tail -f /var/log/massage-shop/app.log  # Application logs
```

---

*Last Updated: August 12, 2025*
*Status: Production Ready*
*Maintainer: AI Assistant*
