#!/bin/bash

# Deploy script for Spreadsheet application
# This script copies files to production server and starts Docker Compose

set -e  # Exit on error

# Configuration
PROD_SERVER="${SSH_USER:-root}@${SSH_HOST:-2001:bc8:710:eefe:dc00:ff:fed2:5935}"
REMOTE_DIR="/root/spreadsheet"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Deploying Spreadsheet to production..."
echo "📍 Server: $PROD_SERVER"
echo "📂 Remote directory: $REMOTE_DIR"
echo ""

# Generate SSL certificates on production server
echo "🔒 Generating SSL certificates on production server..."
scp "$LOCAL_DIR/scripts/generate-letsencrypt-cert.sh" "$PROD_SERVER:/tmp/"
ssh "$PROD_SERVER" "chmod +x /tmp/generate-letsencrypt-cert.sh && /tmp/generate-letsencrypt-cert.sh $REMOTE_DIR"

# Create remote directory
echo "📁 Creating remote directory..."
ssh "$PROD_SERVER" "mkdir -p $REMOTE_DIR"

# Copy essential files
echo "📤 Copying files to server..."

# Backend, frontend source, and public
echo "  → Application files"
scp -r "$LOCAL_DIR/server" \
       "$LOCAL_DIR/src" \
       "$LOCAL_DIR/public" \
       "$PROD_SERVER:$REMOTE_DIR/"

# Configuration files (all at once)
echo "  → Configuration files"
scp "$LOCAL_DIR/package.json" \
    "$LOCAL_DIR/package-lock.json" \
    "$LOCAL_DIR/tsconfig.json" \
    "$LOCAL_DIR/tsconfig.app.json" \
    "$LOCAL_DIR/tsconfig.node.json" \
    "$LOCAL_DIR/vite.config.ts" \
    "$LOCAL_DIR/index.html" \
    "$LOCAL_DIR/redis.conf" \
    "$LOCAL_DIR/.env" \
    "$PROD_SERVER:$REMOTE_DIR/"

# Docker files
echo "  → Docker files"
scp "$LOCAL_DIR/compose.yml" \
    "$LOCAL_DIR/Dockerfile" \
    "$LOCAL_DIR/.dockerignore" \
    "$PROD_SERVER:$REMOTE_DIR/"

# Deployment configs
echo "  → Deployment configs"
scp -r "$LOCAL_DIR/deployment" "$PROD_SERVER:$REMOTE_DIR/"

echo ""
echo "✅ Files copied successfully!"
echo ""

# Start Docker Compose on remote server
echo "🐳 Starting Docker Compose on production server..."
ssh "$PROD_SERVER" "cd /root/spreadsheet && \
  docker compose pull redis redisinsight nginx 2>/dev/null || true && \
  docker compose up -d --build"

# Show status
ssh "$PROD_SERVER" << 'ENDSSH'
cd /root/spreadsheet

# Show status
echo ""
echo "📊 Service status:"
docker compose ps

# Show logs
echo ""
echo "📝 Recent logs:"
docker compose logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:  https://docs.qshop.space"
echo "   API:       https://api.qshop.space"
echo "   Admin:     https://admin.qshop.space"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker compose logs -f"
echo "   Restart:       docker compose restart"
echo "   Stop:          docker compose down"
echo "   Rebuild:       docker compose up -d --build"
ENDSSH

echo ""
echo "🎉 Deployment finished!"
echo ""
echo "💡 To view logs:"
echo "   ssh $PROD_SERVER 'cd $REMOTE_DIR && docker compose logs -f'"
