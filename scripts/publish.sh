#!/bin/bash

# Publish script - builds and pushes Docker images to Docker Hub
# Usage: ./scripts/publish.sh [tag]

set -e

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME}"
TAG="${1:-latest}"
FRONTEND_IMAGE="${DOCKER_USERNAME}/spreadsheet-docs"
BACKEND_IMAGE="${DOCKER_USERNAME}/spreadsheet-server"

echo "🚀 Building and publishing Docker images..."
echo "📦 Frontend: ${FRONTEND_IMAGE}:${TAG}"
echo "📦 Backend: ${BACKEND_IMAGE}:${TAG}"
echo ""

# Login to Docker Hub
echo "🔑 Logging in to Docker Hub..."
echo "${DOCKER_TOKEN}" | docker login -u "${DOCKER_USERNAME}" --password-stdin

# Build frontend
echo "🔨 Building frontend..."
docker build -t "${FRONTEND_IMAGE}:${TAG}" -f Dockerfile .

# Build backend
echo "🔨 Building backend..."
docker build -t "${BACKEND_IMAGE}:${TAG}" -f server/Dockerfile ./server

# Push to Docker Hub
echo "📤 Pushing to Docker Hub..."
docker push "${FRONTEND_IMAGE}:${TAG}"
docker push "${BACKEND_IMAGE}:${TAG}"

echo ""
echo "✅ Images published successfully!"
echo ""
echo "🔗 Images:"
echo "   Frontend: ${FRONTEND_IMAGE}:${TAG}"
echo "   Backend:  ${BACKEND_IMAGE}:${TAG}"
