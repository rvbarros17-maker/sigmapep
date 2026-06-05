@echo off
echo ====================================
echo  SigmaPEP - Deploy para Vercel
echo ====================================

echo.
echo [1/3] Instalando dependencias...
call npm install

echo.
echo [2/3] Gerando build de producao...
call npm run build

echo.
echo [3/3] Fazendo deploy na Vercel...
call vercel --prod

echo.
echo ====================================
echo  Deploy concluido!
echo ====================================
pause
