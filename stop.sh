#!/usr/bin/env bash

# Envia /stop ao servidor via screen ou tmux (se estiver rodando numa sessão)
if command -v screen &>/dev/null && screen -list 2>/dev/null | grep -q "minecraft"; then
  screen -S minecraft -p 0 -X stuff "stop$(printf '\r')"
  echo "Comando /stop enviado via screen."
elif command -v tmux &>/dev/null && tmux has-session -t minecraft 2>/dev/null; then
  tmux send-keys -t minecraft "stop" Enter
  echo "Comando /stop enviado via tmux."
else
  echo "Sessão screen/tmux 'minecraft' não encontrada."
  echo "Se o servidor estiver rodando em foreground, use Ctrl+C ou digite 'stop' no console."
fi
