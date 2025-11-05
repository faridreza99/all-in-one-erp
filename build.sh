#!/bin/sh
set -e

echo "📦 Building React frontend..."
cd frontend
npm ci --legacy-peer-deps
npm run build
cd ..

echo "✅ Build complete!"
