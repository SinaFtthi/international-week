const TOKEN = 'Pingfin9';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function get(path) {
  const res = await fetch(path, { headers });
  const json = await res.json();
  return json.data ?? json;
}

async function post(path, body = {}) {
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

export const api = {
  info:        () => get('/api/info/'),
  accounts:    () => get('/api/accounts/'),
  poNew:       () => get('/api/po_new/'),
  poOut:       () => get('/api/po_out/'),
  poIn:        () => get('/api/po_in/'),
  ackIn:       () => get('/api/ack_in/'),
  ackOut:      () => get('/api/ack_out/'),
  transactions:() => get('/api/transactions/'),
  logs:        () => get('/api/logs/'),

  createPayment:          (pos) => post('/api/create_payment/',          { data: pos }),
  sendPayments:           ()    => post('/api/send_payments/',            {}),
  receivePayment:         (pos) => post('/api/receive_payment/',          { data: pos }),
  sendAcknowledgements:   ()    => post('/api/send_acknowledgements/',    {}),
  receiveAcknowledgement: (acks)=> post('/api/receive_acknowledgement/',  { data: acks }),
};
