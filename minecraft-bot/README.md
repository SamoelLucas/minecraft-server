# Bot Keep-Alive para Aternos

Bot que entra no servidor Forge/NeoForge do Aternos e fica conectado para manter o servidor ligado.

> ⚠️ **IMPORTANTE:** Deve rodar no seu PC ou em um VPS com IP residencial.
> Plataformas de cloud (Replit, Railway, etc.) têm o IP bloqueado pelo Aternos.

## Requisitos

- Node.js 18 ou superior ([baixar](https://nodejs.org))
- npm (vem junto com o Node.js)

## Como usar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar (opcional)

Edite as linhas no topo do `bot.mjs`:

```js
const HOST     = "Vanirruas.aternos.me"; // Endereço do servidor
const PORT     = 25565;
const USERNAME = "AternosBot";            // Nome do bot (qualquer nome)
```

### 3. Rodar

```bash
npm start
```

### 4. Rodar em segundo plano (Windows)

Instale o `pm2`:
```bash
npm install -g pm2
pm2 start bot.mjs --name aternos-bot
pm2 save
pm2 startup   # Para iniciar automaticamente com o Windows
```

### 4. Rodar em segundo plano (Linux/Mac)

```bash
npm install -g pm2
pm2 start bot.mjs --name aternos-bot
pm2 save
pm2 startup
```

## O que o bot faz

- Conecta automaticamente ao servidor
- Detecta a versão do servidor automaticamente
- Faz movimentos aleatórios a cada 30s para evitar anti-AFK
- Reconecta automaticamente se cair
- Exibe mensagens do chat no terminal

## Por que não funciona no Replit/Railway

O Aternos bloqueia IPs de data centers para impedir bots keep-alive. 
Rodando no seu PC o IP é residencial e passa normalmente.
