const express = require('express');
const mysql = require('mysql2/promise');
const { generatePo } = require('./generators/poGenerator.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─────────────────────────────────────────────────────────────
// CONFIG  ← pas dit aan
// ─────────────────────────────────────────────────────────────
const BANK_BIC = 'BKCHBEBB';
const BANK_NAME = 'BestBank';
const TOKEN = 'Pingfin9';       // ← jullie token, geef dit aan de CB
const CB_TOKEN = 'token_van_cb';     // ← krijg je van de CB

// ─────────────────────────────────────────────────────────────
// DATABASE  (zelfde gegevens als jullie originele code)
// ─────────────────────────────────────────────────────────────
const db = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'root',
  database: 'pingfin',
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
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || header !== `Bearer ${TOKEN}`) {
    return fail(res, 'Unauthorized', 4010, 401);
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'PingFin server is running!' });
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
      { url: '/api/po_new/', method: 'POST', auth: true },
      { url: '/api/po_out/', method: 'GET', auth: true },
      { url: '/api/po_in/', method: 'POST', auth: true },
      { url: '/api/ack_out/', method: 'GET', auth: true },
      { url: '/api/ack_in/', method: 'POST', auth: true },
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

//STAP 0 GENERATE RANDOM PO//

app.get('/api/po_new_generate/', auth, (req, res) => {
  try {
    // hoeveel PO’s genereren (default = 3)
    const count = parseInt(req.query.count) || 3;

    const pos = [];

    for (let i = 0; i < count; i++) {
      const po = generatePo(BANK_BIC, "BBRUBEBB"); // ← later dynamisch maken
      pos.push(po);
    }

    ok(res, pos, `${pos.length} POs generated`);
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});


// ─────────────────────────────────────────────────────────────
// STAP 1 — POST /api/po_new/
// Nieuwe PO aanmaken → INSERT in po_new
// Let op: po_new heeft GEEN ob_datetime kolom!
// ─────────────────────────────────────────────────────────────
app.post('/api/po_new_add/', auth, async (req, res) => {
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
// STAP 2 — GET /api/po_out/
// CB leest wat er in po_out staat
// ─────────────────────────────────────────────────────────────
app.get('/api/po_out/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM po_out');
    ok(res, rows);
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 3 — POST /api/po_in/
// CB stuurt verwerkte POs naar ons (wij zijn de BB)
// → INSERT in po_in
// → INSERT in transactions (isvalid + iscomplete als bit)
// → UPDATE accounts.balance (saldo verhogen als succes)
// → INSERT in ack_out (zodat CB dat kan ophalen)
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
      let iscomplete = 0;

      // Check of het account bij ons bestaat (ba_id → accounts.id)
      const [[account]] = await db.query(
        'SELECT id, balance FROM accounts WHERE id = ?', [po.ba_id]
      );

      if (!account) {
        bb_code = 4004; // onbekend account
      } else {
        bb_code = 2000;
        isvalid = 1;
        iscomplete = 1;
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

      // 2. INSERT in transactions
      //    isvalid en iscomplete zijn BIT(1) in de DB → 0 of 1
      await db.query(
        `INSERT INTO transactions (amount, datetime, po_id, account_id, isvalid, iscomplete)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [po.po_amount, now(), po.po_id, po.ba_id, isvalid, iscomplete]
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
// STAP 4 — GET /api/ack_out/
// CB luistert hiernaar om te zien welke ACKs wij hebben klaarstaan
// ─────────────────────────────────────────────────────────────
app.get('/api/ack_out/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ack_out');
    ok(res, rows);
  } catch (err) {
    fail(res, err.message, 5000, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// STAP 5 — POST /api/ack_in/
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
// EXTRA
// ─────────────────────────────────────────────────────────────
app.get('/api/transactions/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM transactions');
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