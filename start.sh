#!/bin/bash

# Transformer Attention Visualizer - Startup Script
# This script starts both the backend and frontend servers

echo "🚀 Starting Transformer Attention Visualizer..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please create it first:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "transformer-viz/node_modules" ]; then
    echo "❌ Node modules not found. Installing dependencies..."
    cd transformer-viz
    npm install
    cd ..
fi

# Start backend in background
echo "🔧 Starting backend server on http://localhost:8000..."
source venv/bin/activate
python backend.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
echo "✅ Backend is running!"

# Start frontend
echo "🎨 Starting frontend server on http://localhost:3000..."
cd transformer-viz
npm start &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All servers started successfully!"
echo ""
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
