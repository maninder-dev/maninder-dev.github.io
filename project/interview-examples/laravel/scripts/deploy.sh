#!/usr/bin/env bash
# Topic 80 / 99: a typical deploy script (Forge / Envoyer / CI). Not run by the tests; the
# Topic080 test checks the order of the steps.
#
# For zero-downtime, build each release in a new folder (releases/<timestamp>) and switch a
# `current` symlink at the end instead of running `down`/`up`. Migrations must stay backward
# compatible with the code still running: add columns first, remove them in a later deploy.
set -euo pipefail

cd "${APP_DIR:-/var/www/app}"

git pull origin main

composer install --no-dev --optimize-autoloader --no-interaction

php artisan down --render="errors::503" --retry=60   # optional; skip for zero-downtime releases

php artisan migrate --force

php artisan optimize          # config, routes, views, events cached

npm ci && npm run build

php artisan queue:restart     # long-running workers otherwise keep the old code

php artisan up

# OPcache: opcache.validate_timestamps=0 in production, so reload PHP-FPM to pick up new code
sudo systemctl reload php8.3-fpm || true
