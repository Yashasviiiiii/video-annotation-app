#!/bin/bash
echo "Starting Video Annotation App..."

echo "Starting backend..."
cd backend || exit
pip install -r requirements.txt
python run.py &
BACKEND_PID=$!
cd ..

echo "Starting frontend..."
cd frontend || exit
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo "========================================="
echo "Both servers are running in the background."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."
echo "========================================="

# Trap Ctrl+C (SIGINT) and kill background processes
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
