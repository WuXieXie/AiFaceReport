#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/app/data/medspa.db}"

node node_modules/prisma/build/index.js db push --skip-generate

if [ "${RUN_SEED:-true}" = "true" ]; then
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts
fi

exec node server.js
