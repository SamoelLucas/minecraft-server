import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// ─── Configuração ─────────────────────────────────────────────────────────────
const HOST    = process.env.MC_HOST || "Vanirruas.aternos.me";
const PORT    = Number(process.env.MC_PORT || 25565);
const VERSION = process.env.MC_VERSION || "";

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
  const icons = { info: "ℹ️ ", warn: "⚠️ ", error: "❌", ok: "✅", wait: "⏳" };
  console.log(`[${time}] ${icons[level] ?? "•"} ${msg}${extra}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(base, variance = 0.3) {
  return Math.max(500, base + (Math.random() * 2 - 1) * base * variance);
}

function mcString(str) {
  const encoded = Buffer.from(str, "utf8");
  const len     = Buffer.alloc(1);
  len.writeUInt8(encoded.length, 0);
  return Buffer.concat([len, encoded]);
}

// ── Aguarda o servidor Aternos ficar online antes de conectar ──────────────
// Aternos demora até ~3min para iniciar. Em vez de spammar conexões,
// faz pings leves (sem abrir sessão) até o servidor responder.
async function waitForServer() {
  let attempt = 0;
  const PING_INTERVAL = 20_000; // 20s entre pings enquanto offline
  const MAX_WAIT_MS   = 10 * 60 * 1000; // desiste após 10min sem resposta
  const started       = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    attempt++;
    const online = await pingServer();

    if (online) {
      log("ok", `Servidor online! Conectando...`);
      await sleep(jitter(2_000, 0.4)); // Pequena pausa antes de entrar
      return true;
    }

    const waited = Math.round((Date.now() - started) / 1000);
    log("wait", `Servidor offline — aguardando... (${waited}s)`, { tentativa: attempt });
    await sleep(PING_INTERVAL);
  }

  log("error", "Servidor não ficou online em 10 minutos — reiniciando ciclo");
  return false;
}

// Ping leve: só verifica se o servidor responde, sem autenticar
function pingServer() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 8_000);
    mc.ping({ host: HOST, port: PORT, closeTimeout: 7_000 }, (err, result) => {
      clearTimeout(timer);
      if (err || !result) return resolve(false);
      // Aternos às vezes responde com MOTD especial enquanto ainda carrega
      const motd = result?.description?.text ?? result?.description ?? "";
      const isBooting = typeof motd === "string" &&
        (motd.includes("Starting") || motd.includes("Loading") || motd.includes("Iniciando"));
      resolve(!isBooting);
    });
  });
}

async function detectVersion() {
  if (VERSION) return VERSION;
  return new Promise((resolve) => {
    mc.ping({ host: HOST, port: PORT }, (err, result) => {
      if (err || !result) return resolve("1.21.1");
      resolve(result?.version?.name ?? "1.21.1");
    });
  });
}

// ── Estado global ──────────────────────────────────────────────────────────
let reconnectCount  = 0;
let totalUptime     = 0;   // ms acumulado dentro do servidor
let lastJoinTime    = null;

// ── Loop principal ─────────────────────────────────────────────────────────
async function mainLoop() {
  while (true) {
    const online = await waitForServer();
    if (!online) continue;

    const version = await detectVersion();
    log("info", `Versão: ${version} | Usuário: ${USERNAME}`);

    await runBot(version);

    // Após desconectar: backoff com jitter antes de voltar a checar
    reconnectCount++;
    const delay = Math.min(jitter(12_000) * Math.sqrt(reconnectCount), 60_000);
    log("info", `Reconectando em ${(delay / 1000).toFixed(0)}s... (#${reconnectCount}) | Uptime total: ${(totalUptime / 60000).toFixed(1)}min`);
    await sleep(delay);
  }
}

// ── Instância do bot ───────────────────────────────────────────────────────
function runBot(version) {
  return new Promise((resolve) => {
    let afkTimer  = null;
    let cleanedUp = false;

    const bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: USERNAME,
      version,
      auth: "offline",
      checkTimeoutInterval: 60_000,
      hideErrors: false,
    });

    // Disfarce: sobrescreve brand "mineflayer" → "vanilla"
    bot._client.once("login", () => {
      setTimeout(() => {
        try {
          bot._client.write("custom_payload", {
            channel: "minecraft:brand",
            data:    mcString("vanilla"),
          });
        } catch (_) {}
      }, jitter(200, 0.5));
    });

    // FML3 / NeoForge handshake
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

      if (disc === 1) {
        setTimeout(() => {
          bot._client.write("custom_payload", { channel, data: Buffer.from([2, 0]) });
          log("info", "FML: ModListReply(vazio) enviado");
        }, jitter(150, 0.5));
      }

      if (disc === 3 || disc === 5) {
        setTimeout(() => {
          bot._client.write("custom_payload", { channel, data: Buffer.from([4]) });
          log("info", `FML: ACK (disc=${disc}) enviado`);
        }, jitter(100, 0.5));
      }
    });

    bot.once("spawn", () => {
      lastJoinTime = Date.now();
      log("ok", `Entrou no servidor como ${USERNAME}! Mantendo ligado...`);

      bot.chat    = () => {};
      bot.whisper = () => {};

      // Anti-AFK: movimentos + agachamento + rotação
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
          bot.setControlState("sneak", true);
          setTimeout(() => bot.setControlState("sneak", false), jitter(800, 0.3));
        } else if (action === 6) {
          const yaw   = (Math.random() - 0.5) * Math.PI;
          const pitch = (Math.random() - 0.5) * 0.5;
          bot.look(bot.entity.yaw + yaw, bot.entity.pitch + pitch, false);
        }
        // action === 7: pausa natural
      }, jitter(25_000, 0.4));
    });

    function cleanup(reason) {
      if (cleanedUp) return;
      cleanedUp = true;
      if (afkTimer) { clearInterval(afkTimer); afkTimer = null; }
      if (lastJoinTime) {
        totalUptime += Date.now() - lastJoinTime;
        lastJoinTime = null;
      }
      log("warn", `Desconectado: ${reason}`);
      resolve();
    }

    bot.on("kicked", (reason) => {
      let msg = reason;
      try { msg = JSON.parse(reason)?.text ?? reason; } catch (_) {}
      cleanup(`kicked: ${msg}`);
    });

    bot.on("error", (err) => cleanup(`erro: ${err.message}`));
    bot.on("end",   (reason) => cleanup(reason ?? "end"));
  });
}

console.log("=".repeat(55));
console.log(`🤖  Bot Keep-Alive — Servidor Forge Aternos`);
console.log(`📡  ${HOST}:${PORT}  |  👤  ${USERNAME}`);
console.log("=".repeat(55));

mainLoop().catch(console.error);
