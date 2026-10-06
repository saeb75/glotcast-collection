#!/bin/sh
# A throwaway local Postgres for development and the e2e tests: a cluster in ./.pgdata on port 54329
# (superuser `postgres`, trust auth, localhost only). Never point anything here at a shared database.
#
#   sh scripts/local-db.sh start | stop | status | reset
set -eu
cd "$(dirname "$0")/.."
PORT="${LOCAL_PG_PORT:-54329}"
DATA=".pgdata"
BIN="${PG_BIN:-/opt/homebrew/bin}"
export PATH="$BIN:$PATH"
# postgres refuses to start ("became multithreaded") without a valid LC_ALL on macOS.
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

init() {
  if [ ! -f "$DATA/PG_VERSION" ]; then
    initdb -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=en_US.UTF-8 >/dev/null
  fi
}

start() {
  init
  if pg_ctl -D "$DATA" status >/dev/null 2>&1; then echo "already running on :$PORT"; return; fi
  pg_ctl -D "$DATA" -l .pgdata.log -o "-p $PORT -k /tmp -c listen_addresses=localhost" -w start >/dev/null
  psql -h localhost -p "$PORT" -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'glotcast'" | grep -q 1 ||
    psql -h localhost -p "$PORT" -U postgres -c "CREATE DATABASE glotcast" >/dev/null
  echo "postgres running: postgresql://postgres@localhost:$PORT/glotcast"
}

case "${1:-start}" in
  start) start ;;
  stop) pg_ctl -D "$DATA" -w stop -m fast ;;
  status) pg_ctl -D "$DATA" status ;;
  reset)
    pg_ctl -D "$DATA" -w stop -m fast 2>/dev/null || true
    rm -rf "$DATA"
    start
    ;;
  *) echo "usage: $0 start|stop|status|reset" >&2; exit 2 ;;
esac
