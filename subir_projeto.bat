@echo off
echo.
echo ===================================================
echo     ASSISTENTE DE UPLOAD - SHEEPHOUSE (GITHUB)
echo ===================================================
echo.

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] O Git nao esta instalado ou nao foi encontrado!
    echo Por favor, instale o Git aqui: https://git-scm.com/download/win
    echo Apos instalar, feche e abra este script novamente.
    pause
    exit /b
)

echo Precisamos configurar sua identidade no Git (apenas para este projeto).
echo.
set /p GitName="Digite seu Nome (ex: Davi Carneiro): "
set /p GitEmail="Digite seu Email (ex: davi@email.com): "

echo.
echo [CONFIGURANDO IDENTIDADE]
git config user.name "%GitName%"
git config user.email "%GitEmail%"

echo.
echo [1/5] Inicializando repositorio...
git init

echo.
echo [2/5] Preparando arquivos...
git add .

echo.
echo [3/5] Salvando versao inicial...
git commit -m "Upload inicial SheepHouse - Assistente Antigravity"

echo.
echo [4/5] Configurando branch principal...
git branch -M main

echo.
echo ===================================================
echo AGORA E COM VOCE:
echo 1. Acesse https://github.com/new
echo 2. Crie um novo repositorio (Pode chamar de 'sheephouse-app')
echo 3. Copie o LINK do repositorio (algo como https://github.com/usuario/repo.git)
echo ===================================================
echo.
set /p RepoUrl="Cole o link do repositorio aqui e de ENTER: "

echo.
echo [5/5] Enviando para o GitHub...
git remote add origin %RepoUrl%
git push -u origin main

echo.
echo ===================================================
echo                 PROCESSO CONCLUIDO!
echo ===================================================
echo Se apareceram erros de login, siga as instrucoes na tela para se autenticar.
pause
