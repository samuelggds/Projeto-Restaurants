#!/usr/bin/env bash
set -euo pipefail
umask 077

# Copy only the public recovery recipient. Do not source either credentials file.
backup_env="${1:-/etc/gastronexa/backup.env}"
target_env="${2:-/opt/gastronexa/.env.production}"
[[ -f "$backup_env" && ! -L "$backup_env" && -r "$backup_env" ]]
[[ -f "$target_env" && ! -L "$target_env" && -r "$target_env" ]]
recipient=$(sed -n 's/^BACKUP_AGE_RECIPIENT=\(age1[a-z0-9]*\)$/\1/p' "$backup_env")
[[ "$recipient" =~ ^age1[a-z0-9]+$ ]] || { echo 'Destinatario publico ausente, duplicado ou fora do formato esperado.' >&2; exit 1; }
printf 'recipient-check' | age --recipient "$recipient" >/dev/null
before=$(sha256sum "$target_env")
temp=$(mktemp "${target_env}.recipient.XXXXXXXX")
trap 'rm -f -- "$temp"' EXIT
awk '!/^[[:space:]]*BACKUP_AGE_RECIPIENT[[:space:]]*=/' "$target_env" > "$temp"
printf '\nBACKUP_AGE_RECIPIENT=%s\n' "$recipient" >> "$temp"
chown --reference="$target_env" "$temp"
chmod 600 "$temp"
[[ "$before" == "$(sha256sum "$target_env")" ]] || { echo 'Arquivo alterado por outro processo; operacao abortada.' >&2; exit 1; }
mv -- "$temp" "$target_env"
echo 'Chave publica do backup configurada no deploy. Nenhuma outra credencial foi copiada.'
