#!/usr/bin/env bash
set -euo pipefail

NEOFORGE_VERSION="21.1.172"
INSTALLER_JAR="neoforge-${NEOFORGE_VERSION}-installer.jar"
DOWNLOAD_URL="https://maven.neoforged.net/releases/net/neoforged/neoforge/${NEOFORGE_VERSION}/${INSTALLER_JAR}"

echo "=============================="
echo " NeoForge 1.21.1 - Instalador"
echo "=============================="

if ! command -v java &>/dev/null; then
  echo "[ERRO] Java não encontrado. Instale o Java 21 (JDK) antes de continuar."
  exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
  echo "[ERRO] Java 21 ou superior é necessário. Versão atual: $JAVA_VERSION"
  exit 1
fi

echo "[1/4] Baixando NeoForge ${NEOFORGE_VERSION}..."
if command -v curl &>/dev/null; then
  curl -fL -o "${INSTALLER_JAR}" "${DOWNLOAD_URL}"
elif command -v wget &>/dev/null; then
  wget -q -O "${INSTALLER_JAR}" "${DOWNLOAD_URL}"
else
  echo "[ERRO] curl ou wget não encontrado."
  exit 1
fi

echo "[2/4] Aceitando o EULA do Minecraft..."
echo "eula=true" > eula.txt

echo "[3/4] Executando o instalador do NeoForge..."
java -jar "${INSTALLER_JAR}" --installServer

echo "[4/4] Limpando instalador..."
rm -f "${INSTALLER_JAR}"

echo ""
echo "Instalação concluída! Rode ./start.sh para iniciar o servidor."
