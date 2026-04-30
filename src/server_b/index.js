const express = require('express');
const mysql   = require('mysql2/promise');
const crypto  = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ─────────────────────────────────────────────────────────────
// CONFIG  ← pas dit aan
// ─────────────────────────────────────────────────────────────
const BANK_BIC = 'DNIBBE21';
const BANK_NAME = 'Bank B';
const TOKEN     = 'Pingfin9';
const CB_TOKEN = 'oO5YVfXm8Yb3v941D0stAvmK0CK4uFAf';                             // ← jullie token van de echte CB
const CB_URL    = 'https://stevenop.be/pingfin/api/v2';   // ← echte clearing bank

// ─────────────────────────────────────────────────────────────
// DATABASE  (zelfde gegevens als jullie originele code)
// ─────────────────────────────────────────────────────────────
const db = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3307'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME     || 'bankb',
  waitForConnections: true,
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function now() {
  // MySQL datetime formaat: YYYY-MM-DD HH:MM:SS
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function ok(res, data = null, message = 'OK', code = 2000, status = 200) {
  return res.status(status).json({ ok: true, status, code, message, data });
}

function fail(res, message = 'Error', code = 4000, status = 400) {
  return res.status(status).json({ ok: false, status, code, message, data: null });
}

async function addLog(type, message, po = {}) {
  try {
    await db.query(
      `INSERT INTO log (datetime, type, message, po_id, po_amount, po_message, po_datetime,
        ob_id, oa_id, ob_code, ob_datetime, cb_code, cb_datetime, bb_id, ba_id, bb_code, bb_datetime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [now(), type, message,
      po.po_id ?? null, po.po_amount ?? null, po.po_message ?? null, po.po_datetime ?? null,
      po.ob_id ?? null, po.oa_id ?? null, po.ob_code ?? null, po.ob_datetime ?? null,
      po.cb_code ?? null, po.cb_datetime ?? null,
      po.bb_id ?? null, po.ba_id ?? null, po.bb_code ?? null, po.bb_datetime ?? null]
    );
  } catch (_) { } // log fouten mogen de flow niet breken
}

// ─────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE  (CB-facing: Bearer TOKEN)
// ─────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || header !== `Bearer ${TOKEN}`) {
    return fail(res, 'Unauthorized', 4010, 401);
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// SESSION AUTH  (UI-facing: X-Session-Token)
// ─────────────────────────────────────────────────────────────
const sessions    = new Map();
const SESSION_TTL = 30 * 60 * 1000;

function makeSessionToken() { return crypto.randomBytes(32).toString('hex'); }
function hashPw(pw)          { return crypto.createHash('sha256').update(pw).digest('hex'); }

setInterval(() => {
  const now = Date.now();
  for (const [t, s] of sessions) if (s.expiresAt < now) sessions.delete(t);
}, 60_000);

function sessionAuth(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token) return fail(res, 'Not logged in', 4011, 401);
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now())
    return fail(res, 'Session expired — log in again', 4012, 401);
  session.expiresAt = Date.now() + SESSION_TTL;
  req.session = session;
  next();
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'PingFin server is running!' });
});


// ─────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) return fail(res, 'username and password required', 4000, 400);
    const [[user]] = await db.query(
      'SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?',
      [username, hashPw(password)]
    );
    if (!user) return fail(res, 'Ongeldige inloggegevens', 4013, 401);
    const token = makeSessionToken();
    sessions.set(token, { userId: user.id, username: user.username, role: user.role, expiresAt: Date.now() + SESSION_TTL });
    ok(res, { token, username: user.username, role: user.role });
  } catch (err) { fail(res, err.message, 5000, 500); }
});

app.post('/api/auth/logout', sessionAuth, (req, res) => {
  sessions.delete(req.headers['x-session-token']);
  ok(res, null, 'Logged out');
});

app.get('/api/auth/me', sessionAuth, (req, res) => {
  ok(res, { username: req.session.username, role: req.session.role });
});

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT (admin only)
// ─────────────────────────────────────────────────────────────
app.get('/api/users/', sessionAuth, async (req, res) => {
  if (req.session.role !== 'admin') return fail(res, 'Forbidden', 4030, 403);
  const [rows] = await db.query('SELECT id, username, role, created_at FROM users ORDER BY id');
  ok(res, rows);
});

app.post('/api/users/', sessionAuth, async (req, res) => {
  if (req.session.role !== 'admin') return fail(res, 'Forbidden', 4030, 403);
  const { username, password, role = 'user' } = req.body ?? {};
  if (!username || !password) return fail(res, 'username and password required', 4000, 400);
  try {
    await db.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hashPw(password), role]);
    ok(res, null, 'User created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Username already exists', 4090, 409);
    fail(res, err.message, 5000, 500);
  }
});

app.delete('/api/users/:id', sessionAuth, async (req, res) => {
  if (req.session.role !== 'admin') return fail(res, 'Forbidden', 4030, 403);
  if (Number(req.params.id) === req.session.userId)
    return fail(res, 'Cannot delete yourself', 4031, 400);
  await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  ok(res, null, 'User deleted');
});

// ─────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS (verplicht door PingFin)
// ─────────────────────────────────────────────────────────────
app.get('/api/help/', (req, res) => {
  ok(res, {
    endpoints: [
      { url: '/api/help/', method: 'GET', auth: false },
      { url: '/api/info/', method: 'GET', auth: false },
      { url: '/api/accounts/', method: 'GET', auth: true },
      { url: '/api/create_payment/', method: 'POST', auth: true },
      { url: '/api/send_payments/', method: 'POST', auth: true },
      { url: '/api/receive_payment/', method: 'POST', auth: true },
      { url: '/api/send_acknowledgements/', method: 'POST', auth: true },
      { url: '/api/receive_acknowledgement/', method: 'POST', auth: true },
    ]
  });
});

app.get('/api/info/', (req, res) => {
  ok(res, { bank_bic: BANK_BIC, bank_name: BANK_NAME });
});

// accounts.id  (niet account_id!)
app.get('/api/accounts/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, balance FROM accounts');
    ok(res, rows);
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 1 — POST /api/create_payment/
// Nieuwe PO aanmaken → INSERT in po_new
// Let op: po_new heeft GEEN ob_datetime kolom!
// ─────────────────────────────────────────────────────────────
app.post('/api/create_payment/', auth, async (req, res) => {
  const pos = req.body?.data;
  if (!Array.isArray(pos) || pos.length === 0) {
    return fail(res, 'Body moet { data: [...POs] } zijn', 4020);
  }

  const added = [];
  const errors = [];

  for (const po of pos) {
    // Validatie
    if (!po.po_id || po.po_id.length > 50) {
      errors.push({ po_id: po.po_id, error: 'Ongeldige po_id (max 50 chars)' }); continue;
    }
    if (!po.po_amount || po.po_amount <= 0) {
      errors.push({ po_id: po.po_id, error: 'Bedrag moet positief zijn (4003)' }); continue;
    }
    if (po.po_amount > 500) {
      errors.push({ po_id: po.po_id, error: 'Max 500 euro (4002)' }); continue;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(String(po.po_amount))) {
      errors.push({ po_id: po.po_id, error: 'Max 2 decimalen' }); continue;
    }
    if (!po.oa_id || !po.bb_id || !po.ba_id) {
      errors.push({ po_id: po.po_id, error: 'oa_id, bb_id en ba_id zijn verplicht' }); continue;
    }

    try {
      // Check account bestaat (FK is op oa_id → accounts.id)
      const [[account]] = await db.query(
        'SELECT id, balance FROM accounts WHERE id = ?', [po.oa_id]
      );
      if (!account) {
        errors.push({ po_id: po.po_id, error: 'Onbekende oa_id (4004)' }); continue;
      }
      if (parseFloat(account.balance) < parseFloat(po.po_amount)) {
        errors.push({ po_id: po.po_id, error: 'Saldo onvoldoende (4005)' }); continue;
      }

      // po_new heeft geen ob_datetime kolom!
      await db.query(
        `INSERT INTO po_new
          (po_id, po_amount, po_message, po_datetime, ob_id, oa_id, ob_code, bb_id, ba_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [po.po_id, po.po_amount, po.po_message ?? null, po.po_datetime ?? now(),
          BANK_BIC, po.oa_id, 2000, po.bb_id, po.ba_id]
      );

      await addLog('po_new', 'PO aangemaakt', { ...po, ob_id: BANK_BIC, ob_code: 2000 });
      added.push(po);
    } catch (err) {
      errors.push({ po_id: po.po_id, error: err.message });
    }
  }

  ok(res, { added, errors }, `${added.length} POs aangemaakt, ${errors.length} fouten`);
});

// ─────────────────────────────────────────────────────────────
// STAP 2 — POST /api/send_payments/
// Verplaats POs van po_new naar po_out en stuur ze naar de CB
// ─────────────────────────────────────────────────────────────
app.post('/api/send_payments/', auth, async (req, res) => {
  try {
    const [pos] = await db.query('SELECT * FROM po_new');
    if (pos.length === 0) return ok(res, { sent: 0, internal: 0 }, 'Geen POs te verwerken');

    const ob_datetime = now();
    const normalize = s => (s ?? '').trim().toUpperCase();
    const internal = pos.filter(po => normalize(po.ob_id) === normalize(po.bb_id));
    const external = pos.filter(po => normalize(po.ob_id) !== normalize(po.bb_id));

    // Interne transacties: zelfde bank, rechtstreeks verwerken zonder CB
    for (const po of internal) {
      const baId = (po.ba_id ?? '').trim();
      const oaId = (po.oa_id ?? '').trim();
      const [rows] = await db.query('SELECT id FROM accounts WHERE id = ?', [baId]);
      const found = rows.length > 0;

      await db.query(
        `INSERT INTO transactions (amount, datetime, po_id, account_id, isvalid, iscomplete)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [po.po_amount, ob_datetime, po.po_id, oaId, found ? 1 : 0, 1]
      );

      if (found) {
        await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [po.po_amount, oaId]);
        await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [po.po_amount, baId]);
        await addLog('internal_tx', `Interne transactie geslaagd (2000)`, { po_id: po.po_id, bb_code: 2000 });
      } else {
        await addLog('internal_tx', `Interne transactie mislukt: begunstigde rekening ${baId} niet gevonden (4004) — geen geld afgetrokken`, { po_id: po.po_id, bb_code: 4004 });
      }

      await db.query('DELETE FROM po_new WHERE po_id = ?', [po.po_id]);
    }

    // Externe transacties: via CB
    let cbData = null;
    if (external.length > 0) {
      const posToSend = external.map(po => ({ ...po, ob_datetime }));

      for (const po of posToSend) {
        await db.query(
          `INSERT IGNORE INTO po_out
            (po_id, po_amount, po_message, po_datetime, ob_id, oa_id, ob_code, ob_datetime, bb_id, ba_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [po.po_id, po.po_amount, po.po_message ?? null, po.po_datetime ?? null,
           po.ob_id, po.oa_id, po.ob_code, ob_datetime, po.bb_id, po.ba_id]
        );
        // Maak een transactie-rij aan (iscomplete=0) zodat de ACK die later binnenkomt
        // deze rij kan updaten naar iscomplete=1
        await db.query(
          `INSERT IGNORE INTO transactions (amount, datetime, po_id, account_id, isvalid, iscomplete)
           VALUES (?, ?, ?, ?, 1, 0)`,
          [po.po_amount, ob_datetime, po.po_id, po.oa_id]
        );
      }

      let cbRes;
      try {
        cbRes = await fetch(`${CB_URL}/po_in`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CB_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: posToSend }),
        });
        try { cbData = await cbRes.json(); } catch (_) { cbData = { error: 'CB response was not valid JSON' }; }
      } catch (fetchErr) {
        cbData = { error: fetchErr.message };
      }

      for (const po of external) {
        await db.query('DELETE FROM po_new WHERE po_id = ?', [po.po_id]);
        await addLog('po_new_process', `PO doorgestuurd naar CB`, { ...po, ob_datetime });
      }
    }

    ok(res, { sent: external.length, internal: internal.length, cb_response: cbData });
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 2b — POST /api/poll_cb/
// Haal inkomende POs op bij de CB (GET CB/po_out/) en verwerk ze lokaal
// ─────────────────────────────────────────────────────────────
app.post('/api/poll_cb/', auth, async (req, res) => {
  const url = `${CB_URL}/po_out`;
  console.log(`\n📡 [POLL CB] GET ${url}`);
  console.log(`   Token: Bearer ${CB_TOKEN}`);

  try {
    let cbData;
    let cbStatus;
    try {
      const cbRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${CB_TOKEN}` },
      });
      cbStatus = cbRes.status;
      console.log(`   HTTP status: ${cbStatus}`);

      const rawText = await cbRes.text();
      console.log(`   Raw response:\n   ${rawText.slice(0, 400)}`);

      try {
        cbData = JSON.parse(rawText);
        console.log(`   ✅ JSON OK`);
      } catch (_) {
        console.error(`   ❌ Geen geldige JSON`);
        return fail(res, `CB antwoord geen JSON (HTTP ${cbStatus}): ${rawText.slice(0, 150)}`, 5001, 502);
      }
    } catch (fetchErr) {
      console.error(`   ❌ Fetch mislukt: ${fetchErr.message}`);
      return fail(res, `CB niet bereikbaar: ${fetchErr.message}`, 5002, 502);
    }

    const pos = cbData?.data ?? cbData;
    console.log(`   Items: ${Array.isArray(pos) ? pos.length : 'geen array → ' + typeof pos}`);

    if (!Array.isArray(pos) || pos.length === 0) {
      console.log(`   ℹ️  Geen POs`);
      return ok(res, { received: 0 }, 'Geen POs beschikbaar bij de CB');
    }

    const processed = [];
    const errors = [];

    for (const po of pos) {
      try {
        const bb_datetime = now();
        const [[account]] = await db.query('SELECT id FROM accounts WHERE id = ?', [po.ba_id]);
        const bb_code = account ? 2000 : 4004;
        const isvalid = account ? 1 : 0;

        await db.query(
          `INSERT IGNORE INTO po_in
            (po_id, po_amount, po_message, po_datetime,
             ob_id, oa_id, ob_code, ob_datetime,
             cb_code, cb_datetime,
             bb_id, ba_id, bb_code, bb_datetime)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [po.po_id, po.po_amount, po.po_message ?? null, po.po_datetime ?? null,
           po.ob_id ?? null, po.oa_id ?? null, po.ob_code ?? null, po.ob_datetime ?? null,
           po.cb_code ?? null, po.cb_datetime ?? null,
           po.bb_id ?? BANK_BIC, po.ba_id, bb_code, bb_datetime]
        );

        await db.query(
          `INSERT INTO transactions (amount, datetime, po_id, account_id, isvalid, iscomplete)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [po.po_amount, now(), po.po_id, bb_code === 2000 ? po.ba_id : null, isvalid, 1]
        );

        if (bb_code === 2000) {
          await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [po.po_amount, po.ba_id]);
        }

        await db.query(
          `INSERT IGNORE INTO ack_out
            (po_id, po_amount, po_message, po_datetime,
             ob_id, oa_id, ob_code, ob_datetime,
             cb_code, cb_datetime,
             bb_id, ba_id, bb_code, bb_datetime)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [po.po_id, po.po_amount, po.po_message ?? null, po.po_datetime ?? null,
           po.ob_id ?? null, po.oa_id ?? null, po.ob_code ?? null, po.ob_datetime ?? null,
           po.cb_code ?? null, po.cb_datetime ?? null,
           po.bb_id ?? BANK_BIC, po.ba_id, bb_code, bb_datetime]
        );

        // PO verwerkt → verwijder uit po_in (staat nu als transactie + ack_out)
        await db.query('DELETE FROM po_in WHERE po_id = ?', [po.po_id]);

        await addLog('poll_cb', `PO ontvangen via poll, bb_code=${bb_code}`, { ...po, bb_code, bb_datetime });
        processed.push(po.po_id);
      } catch (err) {
        errors.push({ po_id: po.po_id, error: err.message });
      }
    }

    ok(res, { received: processed.length, errors });
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 3 — POST /api/receive_payment/
// CB stuurt verwerkte POs naar ons (wij zijn de BB)
// → INSERT in po_in
// → INSERT in transactions (isvalid + iscomplete als bit)
// → UPDATE accounts.balance (saldo verhogen als succes)
// → INSERT in ack_out
// ─────────────────────────────────────────────────────────────
app.post('/api/po_in/', auth, async (req, res) => {
  const pos = req.body?.data;
  if (!Array.isArray(pos) || pos.length === 0) {
    return fail(res, 'Body moet { data: [...POs] } zijn', 4020);
  }

  const processed = [];
  const errors = [];

  for (const po of pos) {
    try {
      const bb_datetime = now();
      let bb_code;
      let isvalid = 0;
      const iscomplete = 1; // altijd complete: verwerking is klaar (pending = wachten op CB, hier niet van toepassing)

      // Check of het account bij ons bestaat (ba_id → accounts.id)
      const [[account]] = await db.query(
        'SELECT id, balance FROM accounts WHERE id = ?', [po.ba_id]
      );

      if (!account) {
        bb_code = 4004; // onbekend account
      } else {
        bb_code = 2000;
        isvalid = 1;
      }

      // 1. INSERT in po_in
      await db.query(
        `INSERT INTO po_in
          (po_id, po_amount, po_message, po_datetime,
           ob_id, oa_id, ob_code, ob_datetime,
           cb_code, cb_datetime,
           bb_id, ba_id, bb_code, bb_datetime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [po.po_id, po.po_amount, po.po_message ?? null, po.po_datetime ?? null,
        po.ob_id ?? null, po.oa_id ?? null, po.ob_code ?? null, po.ob_datetime ?? null,
        po.cb_code ?? null, po.cb_datetime ?? null,
        po.bb_id ?? BANK_BIC, po.ba_id, bb_code, bb_datetime]
      );

      // 2. INSERT in transactions (account_id = NULL als ba_id niet bestaat, FK staat NULL toe)
      await db.query(
        `INSERT INTO transactions (amount, datetime, po_id, account_id, isvalid, iscomplete)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [po.po_amount, now(), po.po_id, bb_code === 2000 ? po.ba_id : null, isvalid, iscomplete]
      );

      // 3. UPDATE accounts saldo (alleen als succes)
      if (bb_code === 2000) {
        await db.query(
          'UPDATE accounts SET balance = balance + ? WHERE id = ?',
          [po.po_amount, po.ba_id]
        );
      }

      // 4. INSERT in ack_out (CB haalt dit op via GET /api/ack_out/)
      await db.query(
        `INSERT INTO ack_out
          (po_id, po_amount, po_message, po_datetime,
           ob_id, oa_id, ob_code, ob_datetime,
           cb_code, cb_datetime,
           bb_id, ba_id, bb_code, bb_datetime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [po.po_id, po.po_amount, po.po_message ?? null, po.po_datetime ?? null,
        po.ob_id ?? null, po.oa_id ?? null, po.ob_code ?? null, po.ob_datetime ?? null,
        po.cb_code ?? null, po.cb_datetime ?? null,
        po.bb_id ?? BANK_BIC, po.ba_id, bb_code, bb_datetime]
      );

      await addLog('po_in', `PO ontvangen als BB, bb_code=${bb_code}`, { ...po, bb_code, bb_datetime });
      processed.push({ ...po, bb_code, bb_datetime });
    } catch (err) {
      errors.push({ po_id: po.po_id, error: err.message });
    }
  }

  ok(res, { processed, errors }, `${processed.length} verwerkt, ${errors.length} fouten`);
});

// ─────────────────────────────────────────────────────────────
// STAP 4 — POST /api/send_acknowledgements/
// Stuur onbevestigde ACKs uit ack_out naar de CB
// ─────────────────────────────────────────────────────────────
app.post('/api/send_acknowledgements/', auth, async (req, res) => {
  try {
    // Alleen ACKs die nog niet bevestigd zijn door CB (niet teruggekomen via ack_in)
    const [acks] = await db.query(`
      SELECT a.* FROM ack_out a
      LEFT JOIN ack_in ai ON a.po_id = ai.po_id
      WHERE ai.po_id IS NULL
    `);
    if (acks.length === 0) return ok(res, { sent: 0 }, 'Geen ACKs te verwerken');

    // POST naar CB
    const cbRes = await fetch(`${CB_URL}/ack_in`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: acks }),
    });
    const cbData = await cbRes.json();

    if (cbRes.ok) {
      for (const ack of acks) {
        await addLog('ack_out_process', `ACK doorgestuurd naar CB`, ack);
      }
    }

    ok(res, { sent: acks.length, cb_response: cbData });
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 4b — POST /api/poll_cb_acks/
// Haal inkomende ACKs op bij de CB (GET CB/ack_out) en verwerk ze lokaal
// ─────────────────────────────────────────────────────────────
app.post('/api/poll_cb_acks/', auth, async (req, res) => {
  const url = `${CB_URL}/ack_out`;
  console.log(`\n📡 [POLL CB ACKS] GET ${url}`);
  try {
    let cbData;
    try {
      const cbRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${CB_TOKEN}` },
      });
      console.log(`   HTTP status: ${cbRes.status}`);
      const rawText = await cbRes.text();
      console.log(`   Raw response:\n   ${rawText.slice(0, 300)}`);
      try { cbData = JSON.parse(rawText); }
      catch (_) { return fail(res, `CB antwoord geen JSON (HTTP ${cbRes.status}): ${rawText.slice(0, 150)}`, 5001, 502); }
    } catch (fetchErr) {
      return fail(res, `CB niet bereikbaar: ${fetchErr.message}`, 5002, 502);
    }

    const acks = cbData?.data ?? cbData;
    console.log(`   ACKs: ${Array.isArray(acks) ? acks.length : 'geen array'}`);
    if (!Array.isArray(acks) || acks.length === 0) {
      return ok(res, { received: 0 }, 'Geen ACKs beschikbaar bij de CB');
    }

    const processed = [];
    const errors = [];

    for (const ack of acks) {
      console.log(`   → ACK ${ack.po_id} | bb_code=${ack.bb_code} | oa_id=${ack.oa_id}`);
      try {
        const success = String(ack.bb_code) === '2000';

        await db.query(
          `INSERT IGNORE INTO ack_in
            (po_id, po_amount, po_message, po_datetime,
             ob_id, oa_id, ob_code, ob_datetime,
             cb_code, cb_datetime,
             bb_id, ba_id, bb_code, bb_datetime)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ack.po_id, ack.po_amount, ack.po_message ?? null, ack.po_datetime ?? null,
           ack.ob_id ?? null, ack.oa_id ?? null, ack.ob_code ?? null, ack.ob_datetime ?? null,
           ack.cb_code ?? null, ack.cb_datetime ?? null,
           ack.bb_id ?? null, ack.ba_id ?? null, ack.bb_code ?? null, ack.bb_datetime ?? null]
        );

        await db.query(
          'UPDATE transactions SET iscomplete = ? WHERE po_id = ?',
          [success ? 1 : 0, ack.po_id]
        );

        if (success && ack.oa_id) {
          await db.query(
            'UPDATE accounts SET balance = balance - ? WHERE id = ?',
            [ack.po_amount, ack.oa_id]
          );
          console.log(`     💸 Saldo van ${ack.oa_id} verlaagd met €${ack.po_amount}`);
        }

        // ACK verwerkt → verwijder uit ack_in (staat nu als transactie)
        await db.query('DELETE FROM ack_in WHERE po_id = ?', [ack.po_id]);

        await addLog('poll_cb_acks', `ACK ontvangen via poll, bb_code=${ack.bb_code}`, ack);
        processed.push(ack.po_id);
        console.log(`     ✅ Verwerkt, ack_in opgeruimd`);
      } catch (err) {
        console.error(`     ❌ Fout: ${err.message}`);
        errors.push({ po_id: ack.po_id, error: err.message });
      }
    }

    ok(res, { received: processed.length, errors });
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 5 — POST /api/receive_acknowledgement/
// CB stuurt bevestigde ACKs terug naar ons (wij zijn de OB)
// → INSERT in ack_in
// → UPDATE transactions (iscomplete)
// → UPDATE accounts.balance van OA (saldo verlagen)
// ─────────────────────────────────────────────────────────────
app.post('/api/ack_in/', auth, async (req, res) => {
  const acks = req.body?.data;
  if (!Array.isArray(acks) || acks.length === 0) {
    return fail(res, 'Body moet { data: [...ACKs] } zijn', 4020);
  }

  const processed = [];
  const errors = [];

  for (const ack of acks) {
    try {
      const success = String(ack.bb_code) === '2000';

      // 1. INSERT in ack_in
      await db.query(
        `INSERT INTO ack_in
          (po_id, po_amount, po_message, po_datetime,
           ob_id, oa_id, ob_code, ob_datetime,
           cb_code, cb_datetime,
           bb_id, ba_id, bb_code, bb_datetime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ack.po_id, ack.po_amount, ack.po_message ?? null, ack.po_datetime ?? null,
        ack.ob_id ?? null, ack.oa_id ?? null, ack.ob_code ?? null, ack.ob_datetime ?? null,
        ack.cb_code ?? null, ack.cb_datetime ?? null,
        ack.bb_id ?? null, ack.ba_id ?? null, ack.bb_code ?? null, ack.bb_datetime ?? null]
      );

      // 2. UPDATE transactions: iscomplete = 1 als succes, 0 als mislukt
      await db.query(
        'UPDATE transactions SET iscomplete = ? WHERE po_id = ?',
        [success ? 1 : 0, ack.po_id]
      );

      // 3. UPDATE accounts: saldo van OA verlagen (alleen als succes)
      if (success && ack.oa_id) {
        await db.query(
          'UPDATE accounts SET balance = balance - ? WHERE id = ?',
          [ack.po_amount, ack.oa_id]
        );
      }

      await addLog('ack_in', `ACK ontvangen, bb_code=${ack.bb_code}`, ack);
      processed.push(ack);
    } catch (err) {
      errors.push({ po_id: ack.po_id, error: err.message });
    }
  }

  ok(res, { processed, errors }, `${processed.length} ACKs verwerkt`);
});

// ─────────────────────────────────────────────────────────────
// EXTRA — GUI read endpoints
// ─────────────────────────────────────────────────────────────
app.get('/api/po_new/', auth, async (req, res) => {
  try { const [r] = await db.query('SELECT * FROM po_new'); ok(res, r); }
  catch (err) { fail(res, err.message, 5000, 500); }
});
app.get('/api/po_out/', auth, async (req, res) => {
  try { const [r] = await db.query('SELECT * FROM po_out ORDER BY ob_datetime DESC'); ok(res, r); }
  catch (err) { fail(res, err.message, 5000, 500); }
});
app.get('/api/po_in/', auth, async (req, res) => {
  try { const [r] = await db.query('SELECT * FROM po_in ORDER BY cb_datetime DESC'); ok(res, r); }
  catch (err) { fail(res, err.message, 5000, 500); }
});
app.get('/api/ack_in/', auth, async (req, res) => {
  try { const [r] = await db.query('SELECT * FROM ack_in'); ok(res, r); }
  catch (err) { fail(res, err.message, 5000, 500); }
});
app.get('/api/ack_out/', auth, async (req, res) => {
  try { const [r] = await db.query('SELECT * FROM ack_out'); ok(res, r); }
  catch (err) { fail(res, err.message, 5000, 500); }
});

app.get('/api/transactions/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        t.id, t.amount, t.datetime, t.po_id, t.account_id,
        CAST(t.isvalid AS UNSIGNED)    AS isvalid,
        CAST(t.iscomplete AS UNSIGNED) AS iscomplete,
        COALESCE(po.ob_id, pi.ob_id)         AS ob_id,
        COALESCE(po.oa_id, pi.oa_id)         AS oa_id,
        COALESCE(po.bb_id, pi.bb_id)         AS bb_id,
        COALESCE(po.ba_id, pi.ba_id)         AS ba_id,
        COALESCE(po.po_message, pi.po_message) AS po_message
      FROM transactions t
      LEFT JOIN po_out po ON po.po_id = t.po_id
      LEFT JOIN po_in  pi ON pi.po_id = t.po_id
      ORDER BY t.id DESC
    `);
    ok(res, rows);
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

app.get('/api/logs/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM log ORDER BY id DESC LIMIT 100');
    ok(res, rows);
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ PingFin draait op http://localhost:${PORT}`);
  console.log(`   BIC: ${BANK_BIC}`);
});

// ─────────────────────────────────────────────────────────────
// INSTALLATIE
//   npm install mysql2
// ─────────────────────────────────────────────────────────────