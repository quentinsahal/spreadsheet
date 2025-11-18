#!/bin/bash

# Generate Let's Encrypt certificate for *.qshop.space using HTTP-01 challenge
# This script uses a standalone certbot server for automated certificate generation

set -e

# Determine project directory (either /root/spreadsheet or current dir)
PROJECT_DIR="${1:-/root/spreadsheet}"
DOMAIN="qshop.space"

echo "🔒 Generating Let's Encrypt certificate for $DOMAIN and subdomains"
echo "📂 Project directory: $PROJECT_DIR"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt update
    apt install -y certbot
fi

# Create certs directory
mkdir -p "$PROJECT_DIR/certs"

# Check if certificates already exist and are valid
if [ -f "$PROJECT_DIR/certs/fullchain.pem" ]; then
    # Check if cert is still valid for at least 30 days
    if openssl x509 -checkend 2592000 -noout -in "$PROJECT_DIR/certs/fullchain.pem" 2>/dev/null; then
        echo "✅ Valid certificates already exist at $PROJECT_DIR/certs/"
        echo "   Certificate is valid for at least 30 more days."
        echo "   Skipping generation. Use 'certbot renew' to update."
        exit 0
    else
        echo "⚠️  Existing certificate expires soon, regenerating..."
    fi
fi

# Stop nginx/docker if running on port 80 (needed for standalone mode)
if command -v docker &> /dev/null; then
    echo "🛑 Stopping Docker containers on port 80..."
    docker compose -f "$PROJECT_DIR/compose.yml" down 2>/dev/null || true
fi

echo "📝 Starting certificate generation using HTTP-01 challenge..."
echo "⏳ This is automated, no manual DNS records needed!"
echo ""

# Generate certificate using standalone mode
# Note: HTTP-01 doesn't support wildcards, so we list each subdomain
certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email admin@qshop.space \
  --no-eff-email \
  -d "docs.$DOMAIN" \
  -d "api.$DOMAIN" \
  -d "admin.$DOMAIN" \
  --preferred-challenges http

# Copy certificates to project directory
echo ""
echo "📋 Copying certificates to $PROJECT_DIR/certs/"
cp /etc/letsencrypt/live/docs.$DOMAIN/fullchain.pem "$PROJECT_DIR/certs/"
cp /etc/letsencrypt/live/docs.$DOMAIN/privkey.pem "$PROJECT_DIR/certs/"
chmod 644 "$PROJECT_DIR/certs/fullchain.pem"
chmod 600 "$PROJECT_DIR/certs/privkey.pem"

echo ""
echo "✅ Certificates generated and copied to $PROJECT_DIR/certs/"
echo ""
echo "📅 Certificate expires in 90 days"
echo "🔄 Renewal command: "
echo "   docker compose down && certbot renew && cp /etc/letsencrypt/live/$DOMAIN/*.pem $PROJECT_DIR/certs/ && docker compose up -d"
echo ""
echo "💡 Tip: Add this to crontab for auto-renewal:"
echo "   0 0 1 * * cd $PROJECT_DIR && docker compose down && certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem $PROJECT_DIR/certs/ && docker compose up -d"
echo ""
echo "🎉 Ready for deployment!"
