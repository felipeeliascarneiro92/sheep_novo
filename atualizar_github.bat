@echo off
chcp 65001 > nul
color 0A
cls

echo ========================================
echo   ATUALIZAR PROJETO NO GITHUB - SHEEP
echo           sheep_novo Repository
echo ========================================
echo.

REM Verificar se Git está instalado
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git não está instalado!
    echo.
    echo Por favor, instale o Git em: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

REM Verificar se está em um repositório Git
if not exist ".git" (
    echo [ERRO] Este diretório não é um repositório Git!
    echo.
    pause
    exit /b 1
)

REM Verificar/configurar remote correto
echo [1/5] Verificando repositório remoto...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Configurando remote sheep_novo...
    git remote add origin https://github.com/felipeeliascarneiro92/sheep_novo.git
) else (
    REM Garantir que está apontando para sheep_novo
    git remote set-url origin https://github.com/felipeeliascarneiro92/sheep_novo.git
)
echo ✓ Remote configurado: https://github.com/felipeeliascarneiro92/sheep_novo.git
echo.

echo O que você quer fazer?
echo.
echo 1. Atualização rápida (mensagem automática com data/hora)
echo 2. Atualização com mensagem personalizada
echo 3. Ver status (arquivos alterados)
echo 4. Cancelar
echo.
set /p escolha="Escolha (1-4): "

if "%escolha%"=="1" goto rapida
if "%escolha%"=="2" goto personalizada
if "%escolha%"=="3" goto status
if "%escolha%"=="4" goto cancelar

echo.
echo [ERRO] Opção inválida!
pause
exit /b 1

:rapida
echo.
echo [2/5] Adicionando arquivos...
git add .
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar arquivos!
    pause
    exit /b 1
)

REM Gerar mensagem com data/hora
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set "data=%%a/%%b/%%c"
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "hora=%%a:%%b"
set "mensagem=Atualização automática - %data% %hora%"

echo ✓ Arquivos adicionados
echo.
echo [3/5] Criando commit...
git commit -m "%mensagem%"
if errorlevel 1 (
    echo.
    echo [AVISO] Nenhuma alteração para commitar ou commit falhou
    echo.
    pause
    exit /b 0
)
echo ✓ Commit criado: %mensagem%
goto push

:personalizada
echo.
set /p mensagem="Digite sua mensagem de commit: "
if "%mensagem%"=="" (
    echo [ERRO] Mensagem não pode ser vazia!
    pause
    exit /b 1
)

echo.
echo [2/5] Adicionando arquivos...
git add .
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar arquivos!
    pause
    exit /b 1
)
echo ✓ Arquivos adicionados
echo.
echo [3/5] Criando commit...
git commit -m "%mensagem%"
if errorlevel 1 (
    echo.
    echo [AVISO] Nenhuma alteração para commitar ou commit falhou
    echo.
    pause
    exit /b 0
)
echo ✓ Commit criado: %mensagem%
goto push

:status
echo.
echo [STATUS] Verificando alterações...
echo.
git status
echo.
echo ========================================
echo.
pause
exit /b 0

:cancelar
echo.
echo [CANCELADO] Nenhuma alteração foi feita.
echo.
pause
exit /b 0

:push
echo.
echo [4/5] Enviando para GitHub...
echo Repositório: https://github.com/felipeeliascarneiro92/sheep_novo.git
echo.
git push
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao enviar para o GitHub!
    echo.
    echo Possíveis causas:
    echo - Sem conexão com a internet
    echo - Credenciais inválidas
    echo - Conflitos no repositório
    echo.
    echo Tente:
    echo   git pull
    echo   git push
    echo.
    pause
    exit /b 1
)

echo ✓ Código enviado com sucesso!
echo.
echo [5/5] ATUALIZAÇÃO CONCLUÍDA!
echo.
echo ========================================
echo.
echo Seu projeto foi atualizado no GitHub!
echo Acesse: https://github.com/felipeeliascarneiro92/sheep_novo
echo.
echo ========================================
echo.
pause
