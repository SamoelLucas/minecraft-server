import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ─── Configuração ─────────────────────────────────────────────────────────────
const HOST     = process.env.MC_HOST     || "Vanirruas.aternos.me"; // Muda aqui
const PORT     = Number(process.env.MC_PORT || 25565);
const USERNAME = process.env.MC_USERNAME || "AternosBot";           // Muda aqui
// Deixe em branco para detectar automático, ou force a versão: "1.21.1"
const VERSION  = process.env.MC_VERSION  || "";

const RECONNECT_DELAY = 15_000;   // ms entre tentativas
const ANTI_AFK_INTERVAL = 30_000; // ms entre movimentos anti-AFK
// ─────────────────────────────────────────────────────────────────────────────

const mineflayer = require("mineflayer");
const mc         = require("minecraft-protocol");

function log(msg, data = {}) {
  const time = new Date().toLocaleTimeString("pt-BR");
  const extra = Object.keys(data).length ? " " + JSON.stringify(data) : "";
  console.log(`[${time}] ${msg}${extra}`);
}

async function detectVersion() {
  if (VERSION) return VERSION;
  return new Promise((resolve) => {
    mc.ping({ host: HOST, port: PORT }, (err, result) => {
      if (err || !result) {
        log("⚠️  Ping falhou — usando 1.21.1 por padrão");
        return resolve("1.21.1");
      }
      const ver = result?.version?.name ?? "1.21.1";
      log(`🔍 Versão detectada: ${ver}`);
      resolve(ver);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let reconnectCount = 0;

async function createBot() {
  const version = await detectVersion();

  await sleep(2_000); // Aguarda antes de conectar

  log(`🔌 Conectando...`, { host: HOST, port: PORT, username: USERNAME, version });

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version,
    auth: "offline",
    checkTimeoutInterval: 60_000,
    hideErrors: false,
  });

  let afkTimer = null;
  let cleanedUp = false;

  bot.once("spawn", () => {
    log(`✅ Bot conectado e no servidor! Servidor vai manter-se ligado.`);

    afkTimer = setInterval(() => {
      if (!bot.entity) return;
      const moves = [
        () => { bot.setControlState("jump", true);    setTimeout(() => bot.setControlState("jump", false), 200); },
        () => { bot.setControlState("forward", true); setTimeout(() => bot.setControlState("forward", false), 500); },
        () => { bot.setControlState("back", true);    setTimeout(() => bot.setControlState("back", false), 500); },
        () => { bot.setControlState("left", true);    setTimeout(() => bot.setControlState("left", false), 500); },
        () => { bot.setControlState("right", true);   setTimeout(() => bot.setControlState("right", false), 500); },
      ];
      const move = moves[Math.floor(Math.random() * moves.length)];
      move();
      log("🕹️  Anti-AFK executado");
    }, ANTI_AFK_INTERVAL);
  });

  bot.on("chat", (username, message) => {
    if (username === USERNAME) return;
    log(`💬 [${username}] ${message}`);
  });

  bot.on("kicked", (reason) => {
    log(`⚠️  Kickado: ${JSON.stringify(reason)}`);
    cleanup();
  });

  bot.on("error", (err) => {
    log(`❌ Erro: ${err.message}`);
    cleanup();
  });

  bot.on("end", (reason) => {
    log(`🔴 Desconectado: ${reason}`);
    cleanup();
  });

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (afkTimer) { clearInterval(afkTimer); afkTimer = null; }
    reconnectCount++;
    log(`🔄 Tentativa #${reconnectCount} — reconectando em ${RECONNECT_DELAY / 1000}s...`);
    setTimeout(createBot, RECONNECT_DELAY);
  }
}

log("=".repeat(50));
log("🤖 Bot Keep-Alive para Aternos");
log(`📡 Servidor: ${HOST}:${PORT}`);
log(`👤 Username: ${USERNAME}`);
log("=".repeat(50));

createBot().catch(console.error);
