# filepath: start_aegis.py
"""
AEGIS-IoT Grand Finale 1-Click Launch Runner.
Concurrently launches:
- FastAPI Backend Orchestrator (http://127.0.0.1:8000)
- Vite React Workbench (http://127.0.0.1:5173)
"""

import subprocess
import sys
import os
import time

def main():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=================================================================")
    print("      AEGIS-IoT // Grand Finale Workbench Dev Server Launcher    ")
    print("                   Team SIGMOID SQUAD        ")
    print("=================================================================")
    print("Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=backend_dir,
    )

    time.sleep(1.5)

    print("Starting React Workbench on http://127.0.0.1:5173 ...")
    # On Windows npm is npm.cmd
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
        cwd=frontend_dir,
    )

    print("\n[READY] Workbench accessible at: http://127.0.0.1:5173")
    print("Press Ctrl+C to terminate both servers.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down AEGIS-IoT...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
