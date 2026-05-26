# Servidor Minecraft NeoForge 1.21.1

Servidor pirata (offline mode) com NeoForge 1.21.1, otimizado para usar poucos recursos.

## Requisitos

| Item | Mínimo | Recomendado |
|------|--------|-------------|
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 3 GB | 6 GB |
| Disco | 10 GB | 20 GB |
| Java | 21 (JDK) | 21 (JDK) |
| SO | Linux (Ubuntu/Debian) | Ubuntu 22.04+ |

## Instalação rápida

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd minecraft-server

# 2. Torne os scripts executáveis
chmod +x install.sh start.sh stop.sh

# 3. Instale o Java 21 (se não tiver)
sudo apt update && sudo apt install -y openjdk-21-jdk-headless screen

# 4. Instale o NeoForge
./install.sh

# 5. Inicie o servidor
./start.sh
```

## Rodar 24/7 com systemd

```bash
# Criar usuário dedicado
sudo useradd -r -m -d /opt/minecraft minecraft

# Copiar arquivos
sudo cp -r . /opt/minecraft/
sudo chown -R minecraft:minecraft /opt/minecraft/

# Instalar serviço
sudo cp systemd/minecraft.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable minecraft
sudo systemctl start minecraft

# Ver logs ao vivo
sudo journalctl -u minecraft -f
# ou entrar no console
sudo -u minecraft screen -r minecraft
```

## Rodar com screen (alternativa simples)

```bash
screen -S minecraft ./start.sh
# Para sair sem fechar: Ctrl+A, D
# Para voltar: screen -r minecraft
```

## Configuração

- **`server.properties`** — configurações principais (porta, jogadores, view-distance, etc.)
- **`start.sh`** — ajuste `MAX_RAM` conforme a RAM da sua VPS
- **`online-mode=false`** — já configurado para servidor pirata

## Adicionar mods de otimização recomendados

Coloque os JARs na pasta `mods/` após a instalação:

| Mod | Função |
|-----|--------|
| [Embeddium](https://modrinth.com/mod/embeddium) | Renderização otimizada |
| [FerriteCore](https://modrinth.com/mod/ferrite-core) | Reduz uso de RAM |
| [Krypton](https://modrinth.com/mod/krypton) | Otimiza rede |
| [Lithium](https://modrinth.com/mod/lithium) | Otimiza lógica do servidor |
| [Noisium](https://modrinth.com/mod/noisium) | Geração de chunks mais rápida |

## Atualizar versão do NeoForge

Edite a variável `NEOFORGE_VERSION` no `install.sh` com a versão desejada.  
Versões disponíveis: https://maven.neoforged.net/releases/net/neoforged/neoforge/

## Portas para liberar no firewall

```bash
sudo ufw allow 25565/tcp   # Minecraft
sudo ufw allow 22/tcp      # SSH (não esqueça!)
```
