@echo off
echo ====================================
echo   INICIANDO CINEMATCH COMO ADMIN
echo ====================================
echo.
echo IMPORTANTE: Este script debe ejecutarse como Administrador
echo.
pause

cd /d "%~dp0"

echo Limpiando procesos de Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Limpiando cache de Next.js...
if exist .next rmdir /s /q .next

echo.
echo Iniciando servidor de desarrollo...
echo.
npm run dev

pause
