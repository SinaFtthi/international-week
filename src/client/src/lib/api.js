const TOKEN = 'Pingfin9';

function sessionToken() {
  return localStorage.getItem('session_token') ?? '';
}

function getHeaders() {
  return {
    'Authorization':    `Bearer ${TOKEN}`,
    'Content-Type':     'application/json',
    'X-Session-Token':  sessionToken(),
  };
}

async function get(path) {
  const res  = await fetch(path, { headers: getHeaders() });
  const json = await res.json();
  return json.data ?? json;
}

async function post(path, body = {}) {
  const res = await fetch(path, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
  return res.json();
}

async function del(path) {
  const res = await fetch(path, { method: 'DELETE', headers: getHeaders() });
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

  pollCb:                 ()    => post('/api/poll_cb/',                 {}),
  pollCbAcks:             ()    => post('/api/poll_cb_acks/',            {}),
  createPayment:          (pos) => post('/api/create_payment/',         { data: pos }),
  sendPayments:           ()    => post('/api/send_payments/',           {}),
  receivePayment:         (pos) => post('/api/po_in/',                  { data: pos }),
  sendAcknowledgements:   ()    => post('/api/send_acknowledgements/',   {}),
  receiveAcknowledgement: (acks)=> post('/api/ack_in/',                 { data: acks }),

  // Auth
  login:      (username, password) => post('/api/auth/login',  { username, password }),
  logout:     ()                   => post('/api/auth/logout', {}),
  me:         ()                   => get('/api/auth/me'),

  // User management (admin only)
  getUsers:   ()              => get('/api/users/'),
  createUser: (username, password, role) => post('/api/users/', { username, password, role }),
  deleteUser: (id)            => del(`/api/users/${id}`),
};
