const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const mysql = require('mysql')
const db = mysql.createConnection ({
  user: "pingfinuser",
  host: "pingfin",
  password:"pingfinpass",
  database: "pingfin"
})

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Payment Orders
app.post('/payment-orders', (req, res) => {
  res.json({ message: 'Create PO endpoint' });
});

app.get('/payment-orders', (req, res) => {
  res.json({ message: 'Get all POs' });
});

app.post('/payment-orders/:id/validate', (req, res) => {
  res.json({ message: 'Validate PO' });
});

app.post('/payment-orders/:id/send', (req, res) => {
  res.json({ message: 'Send PO to CB' });
});

// ACK
app.get('/acknowledgements', (req, res) => {
  res.json({ message: 'Get ACKs' });
});

app.post('/acknowledgements/:id/process', (req, res) => {
  res.json({ message: 'Process ACK' });
});

// BB (incoming)
app.post('/po_in', (req, res) => {
  res.json({ message: 'Receive PO from CB' });
});

app.post('/ack_out', (req, res) => {
  res.json({ message: 'Send ACK to CB' });
});

// Accounts
app.get('/accounts', (req, res) => {
  res.json({ message: 'Get accounts' });
});

app.get('/accounts/:id', (req, res) => {
  res.json({ message: 'Get account by ID' });
});

// Transactions
app.get('/transactions', (req, res) => {
  res.json({ message: 'Get transactions' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
