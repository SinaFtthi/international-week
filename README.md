# PingFin — Inter-bank Payment Simulation

Two fully independent banks (Bank A and Bank B) that communicate via a Central Bank (CB) API using the SEPA Payment Order (PO) pipeline.

---

## Quick Start

```bash
git clone <repo>
cd <worktree>
docker-compose up --build -d
```

| URL | What |
|-----|------|
| http://localhost:5173 | Bank A dashboard (login: `admin` / `admin`) |
| http://localhost:5174 | Bank B dashboard (login: `admin` / `admin`) |
| http://localhost:8080 | phpMyAdmin (root / root) |

---

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│      Bank A         │         │      Bank B         │
│   BIC: DNIBBE21     │         │   BIC: BKCHBEBB     │
│   DB:  pingfin      │         │   DB:  bankb        │
│   Port: 5173        │         │   Port: 5174        │
└────────┬────────────┘         └────────┬────────────┘
         │  Bearer K36JSzpQ...           │  Bearer HBUaYlV0...
         └──────────────┬────────────────┘
                        ▼
              ┌──────────────────┐
              │  Central Bank    │
              │  (CB) API        │
              │  stevenop.be/    │
              │  pingfin/api/v2  │
              └──────────────────┘
```

### Payment Flow (A → B)

```
1. create_payment    → po_new         (OB validates sender account + balance)
2. send_payments     → po_out + CB    (POST CB/po_in with Bearer token)
3. [Bank B] poll_cb  → po_in + bal    (GET CB/po_out, checks ba_id in bankb)
4. send_acks         → ack_out + CB   (POST CB/ack_in)
5. [Bank A] poll_acks → transaction   (GET CB/ack_out, updates isvalid/iscomplete)
```

Internal transfers (same BIC) skip CB entirely and are resolved in step 2.

---

## Services

| Container | Image | Port |
|-----------|-------|------|
| `pingfin-db` | mysql:8.0 | 3307 (host) |
| `pingfin-server-a` | node:20-alpine | 3000 (internal) |
| `pingfin-server-b` | node:20-alpine | 3001 (internal) |
| `pingfin-client-a` | nginx:alpine | 5173 |
| `pingfin-client-b` | nginx:alpine | 5174 |
| `pingfin-phpmyadmin` | phpmyadmin | 8080 |

---

## Configuration

All secrets live in `docker-compose.yml` environment blocks. The `.env` files are for **local development only** (excluded from Docker images via `.dockerignore`).

| Variable | Bank A | Bank B |
|----------|--------|--------|
| `BANK_BIC` | `DNIBBE21` | `BKCHBEBB` |
| `BANK_NAME` | `Best Bank` | `Bank B` |
| `CB_TOKEN` | `K36JSzpQ4jGwbbLOffEebiJ2dsQqfhHT` | `HBUaYlV0R8v6Oa9lhd8k2FbvEaPn1MgT` |
| `CB_URL` | `https://stevenop.be/pingfin/api/v2` | same |
| `TOKEN` | `Pingfin9` | `Pingfin9` |
| `DB_NAME` | `pingfin` | `bankb` |

> **Important:** Docker images must be rebuilt (`--no-cache`) after changing token values. The `.env` file is excluded from the image so docker-compose env vars always win.

---

## Database Schema

### Tables (same structure in both `pingfin` and `bankb`)

```
accounts      id (IBAN), balance
po_new        staging — POs created but not yet sent
po_out        POs sent to CB (waiting for ACK)
po_in         Incoming POs received from CB
ack_out       ACKs ready to send to CB
ack_in        ACKs received from CB
transactions  Final ledger — isvalid BIT, iscomplete BIT
log           Audit trail
users         Login credentials (SHA-256 hashed passwords)
```

### Foreign key constraints

| Table | FK column | References | Implication |
|-------|-----------|------------|-------------|
| `po_new` | `oa_id` | `accounts(id)` | Sender must be our own account |
| `po_out` | `oa_id` | `accounts(id)` | Sender must be our own account |
| `po_in` | `ba_id` | `accounts(id)` | Recipient must be our own account |
| `transactions` | `account_id` | `accounts(id)` | Nullable for failed payments |

### Seed accounts

**Bank A (pingfin)**

| IBAN | Balance |
|------|---------|
| BE00111111111111 | 5000.00 |
| BE00222222222222 | 5000.00 |
| BE00333333333333 | 5000.00 |

**Bank B (bankb)**

| IBAN | Balance |
|------|---------|
| BE10111111111111 | 5000.00 |
| BE10222222222222 | 5000.00 |
| BE10333333333333 | 5000.00 |

---

## API Reference

All endpoints require `Authorization: Bearer Pingfin9` unless marked public.
Responses follow `{ ok, status, code, message, data }`.

### Public

#### `GET /api/help/`
Returns list of all endpoints.

#### `GET /api/info/`
```json
{ "bank_bic": "DNIBBE21", "bank_name": "Best Bank" }
```

---

### Auth

#### `POST /api/auth/login`
```json
// Request
{ "username": "admin", "password": "admin" }

// Response
{ "token": "<session-token>", "username": "admin", "role": "admin" }
```
Store `token` in `localStorage`, send as `X-Session-Token` on subsequent calls.
Sessions expire after 30 minutes of inactivity.

#### `POST /api/auth/logout`
Invalidates the current session token.

#### `GET /api/auth/me`
Returns `{ username, role }` and resets the inactivity timer.

---

### Accounts

#### `GET /api/accounts/`
```json
[
  { "id": "BE00111111111111", "balance": "4990.00" }
]
```

---

### Payment Pipeline

#### Step 1 — `POST /api/create_payment/`
Validates and queues Payment Orders into `po_new`.

```json
// Request
{
  "data": [{
    "po_id":      "DNIBBE21_ABC123",
    "po_amount":  50.00,
    "po_message": "Invoice #42",
    "oa_id":      "BE00111111111111",
    "bb_id":      "BKCHBEBB",
    "ba_id":      "BE10111111111111"
  }]
}
```

| Field | Rule |
|-------|------|
| `po_id` | Unique, max 50 chars. Convention: `{OWN_BIC}_{timestamp}` |
| `po_amount` | `0 < amount ≤ 500`, max 2 decimals |
| `oa_id` | Must exist in **our** accounts with sufficient balance |
| `bb_id` | Destination bank BIC |
| `ba_id` | Destination account IBAN |

#### Step 2 — `POST /api/send_payments/`
Sends all `po_new` rows. External = via CB. Internal (same BIC) = direct.

```json
{ "sent": 1, "internal": 0, "cb_response": { "ok": true } }
```

#### Step 2b — `POST /api/poll_cb/`
Fetches incoming POs from `CB/po_out` and processes them.

- Checks `ba_id` against **our own** accounts table
- `2000` = account found, balance credited
- `4004` = account not found in this bank
- Creates `ack_out` entry regardless of result

```json
{ "received": 2, "errors": [] }
```

#### Step 3 — `POST /api/send_acknowledgements/`
POSTs pending `ack_out` entries to `CB/ack_in`. Deletes after successful send.

```json
{ "sent": 2 }
```

#### Step 4 — `POST /api/poll_cb_acks/`
Fetches ACKs from `CB/ack_out` and finalises transactions.

- `iscomplete = 1` always (processing is done)
- `isvalid = 1` (success) → deduct from `oa_id` balance
- `isvalid = 0` (failure) → refund to `oa_id` balance

---

### CB-facing endpoints (called by the Central Bank)

#### `POST /api/po_in/`
CB pushes an incoming PO directly. Same logic as `poll_cb`.

#### `POST /api/receive_acknowledgement/`
CB pushes an ACK directly. Same logic as `poll_cb_acks`.

---

### Users (admin only, requires `X-Session-Token`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/` | List all users |
| `POST` | `/api/users/` | Create user `{ username, password, role }` |
| `DELETE` | `/api/users/:id` | Delete user (cannot delete self) |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 2000 | Success |
| 4000 | Bad request / missing fields |
| 4002 | Amount exceeds 500 EUR |
| 4003 | Amount must be positive |
| 4004 | Unknown account (`ba_id` or `oa_id` not in this bank's DB) |
| 4005 | Insufficient balance |
| 4006 | Invalid BIC (trailing space or wrong format) |
| 4011 | Not logged in |
| 4012 | Session expired |
| 4013 | Invalid credentials |
| 4020 | Body must be `{ data: [...] }` |
| 4030 | Forbidden (not admin) |
| 5000 | Internal server error |
| 5001 | CB response was not valid JSON |
| 5002 | CB unreachable |

---

## Common Operations

### Rebuild servers after config change
```bash
docker-compose build --no-cache server_a server_b
docker stop pingfin-server-a pingfin-server-b
docker rm   pingfin-server-a pingfin-server-b
docker-compose up --no-deps -d server_a server_b
```

### Full restart (wipes DB)
```bash
docker-compose down -v
docker-compose up --build -d
```

### Verify running config
```bash
docker exec pingfin-server-a env | grep -E "BANK_BIC|CB_TOKEN"
# BANK_BIC=DNIBBE21
# CB_TOKEN=K36JSzpQ4jGwbbLOffEebiJ2dsQqfhHT

docker exec pingfin-server-b env | grep -E "BANK_BIC|CB_TOKEN"
# BANK_BIC=BKCHBEBB
# CB_TOKEN=HBUaYlV0R8v6Oa9lhd8k2FbvEaPn1MgT
```

### Manual end-to-end payment test (Bank B → Bank A)
```bash
# 1. Create PO
docker exec pingfin-server-b wget -qO- \
  --post-data='{"data":[{"po_id":"TEST_001","po_amount":10,"oa_id":"BE10111111111111","bb_id":"DNIBBE21","ba_id":"BE00111111111111"}]}' \
  --header='Authorization: Bearer Pingfin9' --header='Content-Type: application/json' \
  http://localhost:3001/api/create_payment/

# 2. Send to CB
docker exec pingfin-server-b wget -qO- --post-data='{}' \
  --header='Authorization: Bearer Pingfin9' --header='Content-Type: application/json' \
  http://localhost:3001/api/send_payments/
# Expected: {"sent":1,"internal":0,"cb_response":{"ok":true}}

# 3. Bank A receives
docker exec pingfin-server-a wget -qO- --post-data='{}' \
  --header='Authorization: Bearer Pingfin9' --header='Content-Type: application/json' \
  http://localhost:3000/api/poll_cb/
# Expected: {"received":1,"errors":[]}
```

---

## Troubleshooting

### `send_payments` returns `internal: 1` for external payments
Container has wrong `BANK_BIC`. Check env, then rebuild:
```bash
docker exec pingfin-server-a env | grep BANK_BIC   # must be DNIBBE21
docker exec pingfin-server-b env | grep BANK_BIC   # must be BKCHBEBB
```
If wrong → a stale `.env` was baked into the image. Ensure `.env` is in `.dockerignore`, then rebuild with `--no-cache`.

### External bank receives error 4004 when sending to us
The `ba_id` they specified does not exist in this bank's `accounts` table. Valid accounts:
- Send to `bb_id=DNIBBE21` → `ba_id` must be `BE00111111111111`, `BE00222222222222`, or `BE00333333333333`
- Send to `bb_id=BKCHBEBB` → `ba_id` must be `BE10111111111111`, `BE10222222222222`, or `BE10333333333333`

### CB rejects with 4006 (invalid BIC)
BIC has a trailing space. Check the `BANK_BIC` env var — it must be exactly 8 characters with no whitespace.

### Poll returns 0 items but payment was sent
- Confirm the correct `CB_TOKEN` is loaded: `docker exec pingfin-server-a env | grep CB_TOKEN`
- Check the sending bank used the correct `bb_id` (our BIC)
- Check CB server status at `GET https://stevenop.be/pingfin/api/v2/info`

---

## Project Structure

```
src/
├── server/           Bank A — Node.js/Express API (port 3000)
│   ├── index.js      All endpoints
│   ├── .env          Local dev config (gitignored, not in Docker image)
│   ├── .dockerignore excludes node_modules + .env
│   └── package.json
├── server_b/         Bank B — identical structure (port 3001)
├── client/           Bank A — React + Vite → built by nginx (port 5173)
├── client_b/         Bank B — React + Vite → built by nginx (port 5174)
└── db/
    ├── init.sql      Schema + seed for pingfin (Bank A)
    └── init_b.sql    Schema + seed for bankb (Bank B)
docker-compose.yml
```
