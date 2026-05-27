import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ─── Configuração ─────────────────────────────────────────────────────────────
const HOST    = process.env.MC_HOST || "Vanirruas.aternos.me";
const PORT    = Number(process.env.MC_PORT || 25565);
const VERSION = process.env.MC_VERSION || "";

// Usernames que parecem jogadores reais (não "Bot" no nome)
const PLAYER_NAMES = [
  "Vitorhugo_21", "Brunao_gamer", "Lucas_craft",
  "Pedrocraft01",  "Gui_survival", "Felipe_pvp",
  "Thiago_mine",   "Rafinha2024",  "Joao_builds",
  "Kaue_Gamer",
];
const USERNAME = process.env.MC_USERNAME
  || PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
// ─────────────────────────────────────────────────────────────────────────────

const mineflayer = require("mineflayer");
const mc         = require("minecraft-protocol");

function log(level, msg, data = {}) {
  const time  = new Date().toLocaleTimeString("pt-BR");
  const extra = Object.keys(data).length ? " | " + JSON.stringify(data) : "";
  const icons = { info: "ℹ️ ", warn: "⚠️ ", error: "❌", ok: "✅" };
  console.log(`[${time}] ${icons[level] ?? "•"} ${msg}${extra}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Jitter aleatório para parecer conexão humana
function jitter(base, variance = 0.3) {
  return base + (Math.random() * 2 - 1) * base * variance;
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

// Escreve string com prefixo de tamanho (formato Minecraft)
function mcString(str) {
  const encoded = Buffer.from(str, "utf8");
  const len     = Buffer.alloc(1);
  len.writeUInt8(encoded.length, 0);
  return Buffer.concat([len, encoded]);
}

let reconnectCount = 0;

async function createBot() {
  const version = await detectVersion();

  // Delay com jitter para parecer conexão humana (2–5s)
  await sleep(jitter(3_500, 0.4));

  log("info", `Conectando como ${USERNAME}...`, { host: HOST, port: PORT, version });

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    version,
    auth: "offline",
    checkTimeoutInterval: 60_000,
    hideErrors: false,
  });

  let afkTimer  = null;
  let cleanedUp = false;

  // ── Disfarce: envia brand "vanilla" sobrescrevendo o "mineflayer" padrão ──
  bot._client.once("login", () => {
    // Pequeno delay antes de enviar o brand (parece cliente real)
    setTimeout(() => {
      try {
        bot._client.write("custom_payload", {
          channel: "minecraft:brand",
          data:    mcString("vanilla"),
        });
        log("info", 'Brand enviado: "vanilla"');
      } catch (_) {}
    }, jitter(200, 0.5));
  });

  // ── FML3 / NeoForge handshake ─────────────────────────────────────────────
  const FML_PREFIXES = ["fml", "neoforge", "forge"];

  bot._client.on("custom_payload", (packet) => {
    const { channel, data } = packet;

    if (channel !== "minecraft:brand") {
      log("info", `Pacote: ${channel} (${data?.length ?? 0}b)`);
    }

    const prefix = channel.split(":")[0];
    if (!FML_PREFIXES.includes(prefix)) return;
    if (!data || data.length === 0) return;

    const disc = data.readUInt8(0);

    // S2CModList → C2SModListReply (lista vazia)
    if (disc === 1) {
      setTimeout(() => {
        bot._client.write("custom_payload", { channel, data: Buffer.from([2, 0]) });
        log("info", "FML: ModListReply(vazio) enviado");
      }, jitter(150, 0.5));
    }

    // S2CRegistry / outros → ACK
    if (disc === 3 || disc === 5) {
      setTimeout(() => {
        bot._client.write("custom_payload", { channel, data: Buffer.from([4]) });
        log("info", `FML: ACK (disc=${disc}) enviado`);
      }, jitter(100, 0.5));
    }
  });

  // ── Spawn ─────────────────────────────────────────────────────────────────
  bot.once("spawn", () => {
    log("ok", `Entrou no servidor como ${USERNAME}! Mantendo ligado...`);

    // Bot silencioso
    bot.chat    = () => {};
    bot.whisper = () => {};

    // Anti-AFK: movimentos + agachamento + rotação aleatória
    afkTimer = setInterval(() => {
      if (!bot.entity) return;

      const action = Math.floor(Math.random() * 8);

      if (action === 0) {
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), jitter(200, 0.3));
      } else if (action === 1) {
        bot.setControlState("forward", true);
        setTimeout(() => bot.setControlState("forward", false), jitter(600, 0.4));
      } else if (action === 2) {
        bot.setControlState("back", true);
        setTimeout(() => bot.setControlState("back", false), jitter(600, 0.4));
      } else if (action === 3) {
        bot.setControlState("left", true);
        setTimeout(() => bot.setControlState("left", false), jitter(400, 0.4));
      } else if (action === 4) {
        bot.setControlState("right", true);
        setTimeout(() => bot.setControlState("right", false), jitter(400, 0.4));
      } else if (action === 5) {
        // Agachar por um momento
        bot.setControlState("sneak", true);
        setTimeout(() => bot.setControlState("sneak", false), jitter(800, 0.3));
      } else if (action === 6) {
        // Rotação aleatória da câmera
        const yaw   = (Math.random() - 0.5) * Math.PI;
        const pitch = (Math.random() - 0.5) * 0.5;
        bot.look(bot.entity.yaw + yaw, bot.entity.pitch + pitch, false);
      }
      // action === 7: não faz nada (pausa natural)
    }, jitter(25_000, 0.4)); // Entre ~15s e ~35s
  });

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
    const delay = Math.min(jitter(15_000) * reconnectCount, 60_000);
    log("info", `Reconectando em ${(delay / 1000).toFixed(0)}s... (#${reconnectCount})`);
    setTimeout(createBot, delay);
  }
}

console.log("=".repeat(55));
console.log(`🤖  Bot Keep-Alive — Servidor Forge Aternos`);
console.log(`📡  ${HOST}:${PORT}  |  👤  ${USERNAME}`);
console.log("=".repeat(55));

createBot().catch(console.error);
