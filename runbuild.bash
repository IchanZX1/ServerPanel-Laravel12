#!/usr/bin/env bash
set -euo pipefail

echo "==> Build production"
yarn build:production

echo "==> Bersihkan cache Laravel"
php artisan view:clear
php artisan cache:clear
php artisan config:clear
php artisan route:clear

chown -R www-data:www-data /var/www/pterodactyl
echo "==> Selesai. Hard refresh browser (Ctrl+Shift+R)."
