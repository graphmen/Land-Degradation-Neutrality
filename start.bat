@echo off
echo Starting Zimbabwe LDN and Soil Dashboard...
echo.

:: ---- Backend ----
echo [1/2] Starting FastAPI backend on http://localhost:8000
cd /d "%~dp0backend"
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate
    echo Installing backend dependencies...
    pip install -r requirements.txt -q
)
start "OAU-Backend" cmd /k "call .venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: ---- Frontend ----
echo [2/2] Starting Next.js frontend on http://localhost:3001
cd /d "%~dp0"
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)
start "OAU-Frontend" cmd /k "npm run dev -- -p 3001"

echo.
echo Dashboard launching...
echo   Frontend: http://localhost:3001
echo   API:      http://localhost:8000
echo   API Docs: http://localhost:8000/docs
ping 127.0.0.1 -n 6 > nul
start http://localhost:3001

