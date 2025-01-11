@echo off
start cmd /k "node ."
start cmd /k "python server.py"
start msedge --kiosk http://localhost:3000