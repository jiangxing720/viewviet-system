#!/bin/bash
set -e

cat > /tmp/register.json <<'JSON'
{"username":"localadmin","email":"admin@local.test","password":"Password123!","displayName":"Local Admin"}
JSON

cat > /tmp/login.json <<'JSON'
{"email":"admin@local.test","password":"Password123!"}
JSON

echo '== REGISTER =='
curl -i -s -X POST 'http://localhost:8080/api/auth/register' -H 'Content-Type: application/json' -d @/tmp/register.json -c /tmp/viewviet_cookies.txt -w '\nHTTP_STATUS:%{http_code}\n'

echo -e "\n== LOGIN =="
curl -i -s -X POST 'http://localhost:8080/api/auth/login' -H 'Content-Type: application/json' -d @/tmp/login.json -c /tmp/viewviet_cookies.txt -b /tmp/viewviet_cookies.txt -w '\nHTTP_STATUS:%{http_code}\n'

echo -e "\n== ME =="
curl -i -s -X GET 'http://localhost:8080/api/auth/me' -H 'Content-Type: application/json' -b /tmp/viewviet_cookies.txt -w '\nHTTP_STATUS:%{http_code}\n'
