#!/usr/bin/env bash
set -euo pipefail

# ── Configuração ─────────────────────────────────────────────────────────────
MIN_RAM="2G"
MAX_RAM="4G"   # Ajuste conforme a RAM disponível na sua VPS

# ── Flags JVM otimizadas (Aikar's Flags + extras) ────────────────────────────
JVM_FLAGS=(
  "-Xms${MIN_RAM}"
  "-Xmx${MAX_RAM}"
  # GC: G1GC — melhor equilíbrio entre throughput e pausas
  "-XX:+UseG1GC"
  "-XX:+ParallelRefProcEnabled"
  "-XX:MaxGCPauseMillis=200"
  "-XX:+UnlockExperimentalVMOptions"
  "-XX:+DisableExplicitGC"
  "-XX:+AlwaysPreTouch"
  "-XX:G1NewSizePercent=30"
  "-XX:G1MaxNewSizePercent=40"
  "-XX:G1HeapRegionSize=8M"
  "-XX:G1ReservePercent=20"
  "-XX:G1HeapWastePercent=5"
  "-XX:G1MixedGCCountTarget=4"
  "-XX:InitiatingHeapOccupancyPercent=15"
  "-XX:G1MixedGCLiveThresholdPercent=90"
  "-XX:G1RSetUpdatingPauseTimePercent=5"
  "-XX:SurvivorRatio=32"
  "-XX:+PerfDisableSharedMem"
  "-XX:MaxTenuringThreshold=1"
  # Redução de overhead de logging interno do JVM
  "-Djava.util.logging.manager=io.papermc.paper.log.CustomLogManager"
  # Aceleração de rede
  "-Dusing.aikars.flags=https://mcflags.emc.gs"
  "-Daikars.new.flags=true"
)

# ── Localizar o JAR do NeoForge ───────────────────────────────────────────────
SERVER_JAR=$(find . -maxdepth 1 -name "neoforge-*-shim.jar" 2>/dev/null | head -n1)
if [ -z "$SERVER_JAR" ]; then
  SERVER_JAR=$(find . -name "neoforge-*-server.jar" 2>/dev/null | head -n1)
fi
if [ -z "$SERVER_JAR" ]; then
  SERVER_JAR=$(find . -name "neoforge-*.jar" ! -name "*installer*" 2>/dev/null | head -n1)
fi
if [ -z "$SERVER_JAR" ]; then
  echo "[ERRO] JAR do servidor não encontrado. Execute ./install.sh primeiro."
  exit 1
fi

echo "=============================="
echo " Iniciando servidor NeoForge"
echo " JAR: ${SERVER_JAR}"
echo " RAM: ${MIN_RAM} – ${MAX_RAM}"
echo "=============================="

# Loop de reinício automático em caso de crash
while true; do
  java "${JVM_FLAGS[@]}" -jar "${SERVER_JAR}" nogui
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Servidor encerrado normalmente."
    break
  else
    echo "[AVISO] Servidor encerrou com código ${EXIT_CODE}. Reiniciando em 10s..."
    sleep 10
  fi
done
