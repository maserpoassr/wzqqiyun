#!/bin/bash

# Gomoku AI Docker Build Script
# This script builds the application and creates a Docker image

set -e

echo "=== Gomoku AI Docker Build ==="
echo ""

# Step 1: Install dependencies
echo "[1/3] Installing dependencies..."
npm ci

# Step 2: Build the application
echo "[2/3] Building application..."
npm run build

# Step 3: Build Docker image
echo "[3/3] Building Docker image..."
docker build -t gomoku-ai:latest .

echo ""
echo "=== Build Complete ==="
echo ""
echo "To run the container:"
echo "  docker run -p 8080:80 gomoku-ai:latest"
echo ""
echo "Then open http://localhost:8080 in your browser"
