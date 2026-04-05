@echo off
cd /d %~dp0
echo Starting at %date% %time% > dev.log
npm.cmd run dev -- --host --port 5314 >> dev.log 2>&1

