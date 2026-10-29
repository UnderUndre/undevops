#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# caddy-add-site.sh — idempotent site registration in the running Caddy
# edge proxy (undevops Feature 008 layout: caddy:2.7 container on the
# `caddy` network, admin API loopback-only on 127.0.0.1:2019, JSON config).
#
# Registers (or updates) one reverse-proxy route for a set of hostnames,
# then hot-reloads Caddy via POST /load — zero downtime, no file juggling.
# Automatic HTTPS is on by default: Caddy provisions Let's Encrypt certs
# for any public host found in route matchers.
#
# Idempotency: any existing route whose host list intersects the new hosts
# is REPLACED in place (same @id), so re-runs are safe.
#
# Usage (run ON the server):
#   bash caddy-add-site.sh --name underundre-landing \
#        --domain underundre.com --domain www.underundre.com \
#        --upstream underundre-landing:3000
#
#   bash caddy-add-site.sh --list                 # show registered sites
#   bash caddy-add-site.sh --remove underundre-landing
#
# Requirements: curl, jq  (apt install -y jq)
# ─────────────────────────────────────────────────

set -euo pipefail

ADMIN_URL="http://127.0.0.1:2019"
SERVER_ID="srv0"
NAME=""
UPSTREAM=""
DOMAINS=()
REMOVE_NAME=""
LIST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --name)     NAME="$2"; shift 2 ;;
        --domain)   DOMAINS+=("$2"); shift 2 ;;
        --upstream) UPSTREAM="$2"; shift 2 ;;
        --remove)   REMOVE_NAME="$2"; shift 2 ;;
        --list)     LIST=true; shift ;;
        -h|--help)
            echo "Usage: caddy-add-site.sh --name <route-id> --domain <host> [--domain <host>...] --upstream <container:port>"
            echo "       caddy-add-site.sh --list"
            echo "       caddy-add-site.sh --remove <route-id>"
            exit 0 ;;
        *) echo "Unknown arg: $1"; exit 2 ;;
    esac
done

command -v jq >/dev/null 2>&1 || { echo "✖ jq is required: apt install -y jq"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "✖ curl is required"; exit 1; }

curl -fsS "$ADMIN_URL/config/" -o /tmp/caddy-config.$$.json 2>/dev/null || {
    echo "✖ Cannot reach Caddy admin at $ADMIN_URL — is the caddy container running?"
    exit 1
}

# ── --list: print route id + hosts + upstream ────────────────────────────
if [[ "$LIST" == "true" ]]; then
    jq -r '
      .apps.http.servers // {} | to_entries[] as $srv |
      ($srv.value.routes // [])[] |
      [ (.["@id"] // "(no-id)"),
        ((.match // [{}])[0].host // ["(catch-all)"]) | join(","),
        ([.. | .upstreams? // [] | .[]?.dial] | join(",")) ] |
      @tsv' /tmp/caddy-config.$$.json | column -t -s $'\t' 2>/dev/null \
      || jq '.apps.http.servers' /tmp/caddy-config.$$.json
    rm -f /tmp/caddy-config.$$.json
    exit 0
fi

# ── --remove: drop route by @id ──────────────────────────────────────────
if [[ -n "$REMOVE_NAME" ]]; then
    NEW_CONFIG=$(jq --arg id "$REMOVE_NAME" '
      (.apps.http.servers // {}) | to_entries | map(
        .value.routes = ((.value.routes // []) | map(select((.["@id"] // "") != $id)))
      ) | from_entries | . as $servers | {apps: {"http": {"servers": $servers}}}
    ' /tmp/caddy-config.$$.json)
    echo "$NEW_CONFIG" | curl -fsS -X POST "$ADMIN_URL/load" \
        -H "Content-Type: application/json" -d @- >/dev/null
    echo "✓ Route '$REMOVE_NAME' removed, Caddy reloaded"
    rm -f /tmp/caddy-config.$$.json
    exit 0
fi

# ── --add: validate args ─────────────────────────────────────────────────
[[ -n "$NAME" ]]     || { echo "✖ --name is required";     exit 2; }
[[ -n "$UPSTREAM" ]] || { echo "✖ --upstream is required (container:port)"; exit 2; }
[[ ${#DOMAINS[@]} -gt 0 ]] || { echo "✖ at least one --domain is required"; exit 2; }

# Build route: @id is the stable key used by idempotent replace.
ROUTE=$(jq -n \
    --arg id "$NAME" \
    --argjson hosts "$(printf '%s\n' "${DOMAINS[@]}" | jq -R . | jq -s .)" \
    --arg upstream "$UPSTREAM" \
    '{
      "@id": $id,
      "match": [ { "host": $hosts } ],
      "handle": [ {
        "handler": "reverse_proxy",
        "upstreams": [ { "dial": $upstream } ]
      } ],
      "terminal": true
    }')

# Merge: replace existing route with the same @id (or intersecting hosts),
# then append. Server srv0 is created on first use with :443 listener.
HOSTS_JSON=$(printf '%s\n' "${DOMAINS[@]}" | jq -R . | jq -s .)
NEW_CONFIG=$(jq \
    --arg sid "$SERVER_ID" \
    --argjson route "$ROUTE" \
    --argjson hosts "$HOSTS_JSON" \
    '
    (.apps.http.servers // {}) as $existing |
    ($existing[$sid] // { "listen": [":443"], "routes": [] }) as $srv |
    [ ($srv.routes // [])[] |
      select(
        ((.["@id"] // "") != $route["@id"]) and
        ( [ .match[]? | .host? // [] | .[] ] as $rh
          | [ $rh[] | select(. as $h | $hosts | index($h)) ] | length == 0 )
      )
    ] as $kept |
    { apps: { http: { servers: ( $existing + { ($sid): ($srv + { routes: ($kept + [$route]) }) } ) } } }
    ' /tmp/caddy-config.$$.json)

# Sanity: config must parse and contain our route
echo "$NEW_CONFIG" | jq -e --arg id "$NAME" \
    '.apps.http.servers.srv0.routes[] | select((.["@id"] // "") == $id)' >/dev/null || {
    echo "✖ Merge produced invalid config — aborting, Caddy untouched"
    rm -f /tmp/caddy-config.$$.json
    exit 1
}

# Validate against Caddy itself before committing (admin API adapts + dry-runs
# nothing; /load is atomic — on error Caddy keeps running the old config).
RESP=$(echo "$NEW_CONFIG" | curl -sS -o /dev/null -w "%{http_code}" \
    -X POST "$ADMIN_URL/load" -H "Content-Type: application/json" -d @-)

if [[ "$RESP" != "200" ]]; then
    echo "✖ Caddy rejected config (HTTP $RESP) — old config still active"
    rm -f /tmp/caddy-config.$$.json
    exit 1
fi

echo "✓ Site registered: ${DOMAINS[*]} → $UPSTREAM (route @id: $NAME)"
echo "  Cert provisioning: automatic (Let's Encrypt) — first hit may take a few seconds"
rm -f /tmp/caddy-config.$$.json
