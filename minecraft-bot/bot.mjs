import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ─── Configuração ─────────────────────────────────────────────────────────────
const HOST     = process.env.MC_HOST     || "Vanirruas.aternos.me";
const PORT     = Number(process.env.MC_PORT || 25565);
const USERNAME = process.env.MC_USERNAME || "AternosBot";
// Deixe vazio para detectar automático, ou force ex: "1.20.1"
const VERSION  = process.env.MC_VERSION  || "";
// ─────────────────────────────────────────────────────────────────────────────

const mineflayer = require("mineflayer");
const mc         = require("minecraft-protocol");

function log(level, msg, data = {}) {
  const time  = new Date().toLocaleTimeString("pt-BR");
  const extra = Object.keys(data).length ? " | " + JSON.stringify(data) : "";
  const icons = { info: "ℹ️", warn: "⚠️", error: "❌", ok: "✅" };
  console.log(`[${time}] ${icons[level] ?? "•"} ${msg}${extra}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function detectVersion() {
  if (VERSION) return VERSION;
  return new Promise((resolve) => {
    mc.ping({ host: HOST, port: PORT }, (err, result) => {
      if (err || !result) {
        log("warn", "Ping falhou — usando 1.21.1");
        return resolve("1.21.1");
      }
      const ver = result?.version?.name ?? "1.21.1";
      log("info", `Versão detectada: ${ver}`);
      resolve(ver);
    });
  });
}

let reconnectCount = 0;

async function createBot() {
  const version = await detectVersion();
  await sleep(3_000);

  log("info", "Conectando...", { host: HOST, port: PORT, username: USERNAME, version });

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version,
    auth: "offline",

    // Suporte a servidores Forge: declara o canal FML para não ser kickado
    // O bot entra sem mods — funciona para keep-alive mesmo com mods no server
    checkTimeoutInterval: 60_000,
    hideErrors: false,
  });

  let afkTimer = null;
  let cleanedUp = false;

  // Responde ao handshake Forge para não ser kickado
  bot._client.on("login", () => {
    log("info", "Login recebido — handshake OK");
  });

  // Alguns servidores Forge pedem registro de canal FML
  bot._client.on("state", (newState) => {
    if (newState === "play") {
      // Registra canal FML para aceitar mensagens do servidor sem crash
      try {
        bot._client.registerChannel("FML|HS", ["string", []]);
      } catch (_) {}
      try {
        bot._client.registerChannel("FML", ["string", []]);
      } catch (_) {}
      try {
        bot._client.registerChannel("FORGE", ["string", []]);
      } catch (_) {}
    }
  });

  bot.once("spawn", () => {
    log("ok", `Bot entrou no servidor! Mantendo ligado...`);

    // Anti-AFK: movimento aleatório a cada 30s
    afkTimer = setInterval(() => {
      if (!bot.entity) return;
      const moves = [
        () => { bot.setControlState("jump",    true); setTimeout(() => bot.setControlState("jump",    false), 200); },
        () => { bot.setControlState("forward", true); setTimeout(() => bot.setControlState("forward", false), 500); },
        () => { bot.setControlState("back",    true); setTimeout(() => bot.setControlState("back",    false), 500); },
        () => { bot.setControlState("left",    true); setTimeout(() => bot.setControlState("left",    false), 500); },
        () => { bot.setControlState("right",   true); setTimeout(() => bot.setControlState("right",   false), 500); },
      ];
      moves[Math.floor(Math.random() * moves.length)]();
    }, 30_000);
  });

  // Bot silencioso — nunca fala no chat
  bot.chat = () => {};
  bot.whisper = () => {};

  bot.on("kicked", (reason) => {
    let msg = reason;
    try { msg = JSON.parse(reason)?.text ?? reason; } catch (_) {}
    log("warn", `Kickado: ${msg}`);
    cleanup();
  });

  bot.on("error", (err) => {
    log("error", `Erro: ${err.message}`);
    cleanup();
  });

  bot.on("end", (reason) => {
    log("warn", `Desconectado: ${reason}`);
    cleanup();
  });

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (afkTimer) { clearInterval(afkTimer); afkTimer = null; }
    reconnectCount++;
    const delay = Math.min(15_000 * reconnectCount, 60_000);
    log("info", `Reconectando em ${delay / 1000}s... (tentativa #${reconnectCount})`);
    setTimeout(createBot, delay);
  }
}

console.log("=".repeat(55));
console.log(`🤖  Bot Keep-Alive — Servidor Forge Aternos`);
console.log(`📡  ${HOST}:${PORT}  |  👤  ${USERNAME}`);
console.log("=".repeat(55));

createBot().catch(console.error);
