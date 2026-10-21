#!/usr/bin/env bash
# FastSpring API check for support: shows exactly what we send (password masked) and what comes back.
set -u
cd "$(dirname "$0")/.."
U=$(grep -E '^FASTSPRING_API_USERNAME=' .env | cut -d= -f2 | awk '{print $1}')
P=$(grep -E '^FASTSPRING_API_PASSWORD=' .env | cut -d= -f2 | awk '{print $1}')
AUTH=$(printf '%s:%s' "$U" "$P" | base64)
UA="Kardza/1.0 (Build for Everyone hackathon)"
echo "FastSpring API check · $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Store: kardzaa_store (sandbox) · API user: $U · password: ${P:0:3}***${P: -2} (len ${#P})"
echo "Headers sent: Authorization: Basic <base64 user:pass> · User-Agent: $UA · Content-Type: application/json · Accept: application/json"
echo
run() {
  local method=$1 path=$2 body=${3:-}
  echo "▶ $method https://api.fastspring.com$path ${body:+ body: $body}"
  local args=(-s -i -X "$method" -H "Authorization: Basic $AUTH" -H "User-Agent: $UA" -H "Content-Type: application/json" -H "Accept: application/json")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}" "https://api.fastspring.com$path" | tr -d '\r' | awk 'NR==1{print "  status: "$0} tolower($0) ~ /^(x-fs-trace|x-amzn-requestid|date|content-length):/{print "  "$0} /^$/{body=1; next} body && NF{print "  body: "substr($0,1,200)}'
  echo
}
run GET /products
run GET /accounts
run POST /sessions '{"items":[{"product":"holo-binder-theme","quantity":1}]}'
