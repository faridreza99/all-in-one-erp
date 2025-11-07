#!/bin/sh
set -e

echo "📦 Building React frontend..."
cd frontend
yarn install --frozen-lockfile
yarn build
cd ..

echo "✅ Build complete!"
