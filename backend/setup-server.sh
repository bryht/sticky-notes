#!/bin/bash

# Sticky Notes Server Setup Script
# Run this script on the server to set up the environment

set -e

echo "=== Sticky Notes Server Setup ==="

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install PostgreSQL
echo "Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Install nginx
echo "Installing nginx..."
apt install -y nginx

# Install Rust (for building backend)
echo "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Install certbot for HTTPS
echo "Installing certbot..."
apt install -y certbot python3-certbot-nginx

# Set up firewall
echo "Configuring firewall..."
SSH_PORT=$(grep -oP '(?<=Port )\d+' /etc/ssh/sshd_config || echo "22")
ufw allow ${SSH_PORT}/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create database and user
echo "Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE DATABASE sticky_notes;
CREATE USER sticky_notes_user WITH PASSWORD 'CHANGE_ME_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE sticky_notes TO sticky_notes_user;
\c sticky_notes
GRANT ALL ON SCHEMA public TO sticky_notes_user;
EOF

# Tune PostgreSQL for low memory
echo "Tuning PostgreSQL for low memory..."
cat >> /etc/postgresql/15/main/postgresql.conf <<EOF

# Sticky Notes - Low memory tuning
shared_buffers = 32MB
effective_cache_size = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
max_connections = 50
EOF

systemctl restart postgresql

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/sticky-notes
chown www-data:www-data /opt/sticky-notes

# Install systemd service
echo "Installing systemd service..."
cp backend/sticky-notes.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable sticky-notes

# Configure nginx
echo "Configuring nginx..."
cp nginx/stick-notes.conf /etc/nginx/sites-available/api.bryht.net
ln -sf /etc/nginx/sites-available/api.bryht.net /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update the database password in /etc/systemd/system/sticky-notes.service"
echo "2. Build the backend: cd backend && cargo build --release"
echo "3. Copy the binary: cp backend/target/release/sticky-notes-server /opt/sticky-notes/"
echo "4. Start the service: systemctl start sticky-notes"
echo "5. (Optional) Set up HTTPS: certbot --nginx -d api.bryht.net"
echo ""
