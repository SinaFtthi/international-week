import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { PaymentOrders } from './pages/PaymentOrders';
import { Acknowledgements } from './pages/Acknowledgements';
import { Transactions } from './pages/Transactions';
import { Log } from './pages/Log';
import { PoDrawer } from './drawers/PoDrawer';
import { TxDrawer } from './drawers/TxDrawer';
import { NewPoModal } from './drawers/NewPoModal';

function useToasts() {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems(s => [...s, { id, msg, kind }]);
    setTimeout(() => setItems(s => s.filter(i => i.id !== id)), 3000);
  }, []);
  return { push, items };
}

export default function App() {
  const [route, setRoute]           = useState('dashboard');
  const [bankInfo, setBankInfo]     = useState(null);
  const [accounts, setAccounts]     = useState([]);
  const [poNew, setPoNew]           = useState([]);
  const [poOut, setPoOut]           = useState([]);
  const [poIn, setPoIn]             = useState([]);
  const [ackIn, setAckIn]           = useState([]);
  const [ackOut, setAckOut]         = useState([]);
  const [txs, setTxs]               = useState([]);
  const [logs, setLogs]             = useState([]);
  const [openPo, setOpenPo]         = useState(null);
  const [openTx, setOpenTx]         = useState(null);
  const [showNew, setShowNew]       = useState(false);
  const [busy, setBusy]             = useState(false);
  const [autoLastRun, setAutoLastRun] = useState(null);
  const busyRef                     = useRef(false);
  const { push, items: toastItems } = useToasts();

  const setAllBusy = (v) => { busyRef.current = v; setBusy(v); };

  const refresh = useCallback(async () => {
    try {
      const [info, accs, pn, po, pi, ai, ao, t, l] = await Promise.all([
        api.info(), api.accounts(),
        api.poNew(), api.poOut(), api.poIn(),
        api.ackIn(), api.ackOut(),
        api.transactions(), api.logs(),
      ]);
      if (info?.bank_bic) setBankInfo(info);
      if (Array.isArray(accs)) setAccounts(accs);
      if (Array.isArray(pn))   setPoNew(pn);
      if (Array.isArray(po))   setPoOut(po);
      if (Array.isArray(pi))   setPoIn(pi);
      if (Array.isArray(ai))   setAckIn(ai);
      if (Array.isArray(ao))   setAckOut(ao);
      if (Array.isArray(t))    setTxs(t);
      if (Array.isArray(l))    setLogs(l);
    } catch (_) { /* ignore */ }
  }, []);

  // Data refresh every 5 s
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // ── Auto-processing cycle (every 15 s) ──────────────────────
  useEffect(() => {
    const run = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await api.pollCb();
        await api.sendAcknowledgements();
        await api.pollCbAcks();
        await api.sendPayments();
        setAutoLastRun(new Date());
        refresh();
      } catch (_) { /* silent */ }
      finally { busyRef.current = false; setBusy(false); }
    };
    const id = setInterval(run, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  // ── Handmatige handlers voor PaymentOrders pagina ───────────
  const handlePollCb = async () => {
    if (busyRef.current) return;
    setAllBusy(true);
    try {
      const res = await api.pollCb();
      if (res?.ok) {
        const n = res.data?.received ?? 0;
        push(n > 0 ? `${n} POs ontvangen van CB` : 'Geen nieuwe POs bij CB', 'ok');
        if (n > 0) refresh();
      } else {
        push(res?.message ?? 'Fout bij pollen CB', 'err');
      }
    } finally { setAllBusy(false); }
  };

  const handleCreate = async (po) => {
    const res = await api.createPayment([po]);
    if (res?.ok) {
      const errs = res.data?.errors ?? [];
      if (errs.length > 0) {
        push(errs[0].error, 'err');
      } else {
        push('PO created and added to PO_NEW', 'ok');
        refresh();
      }
    } else {
      push(res?.message ?? 'Error creating PO', 'err');
    }
  };

  const handleProcess = async () => {
    if (busyRef.current) return;
    if (poNew.length === 0) { push('PO_NEW is empty — nothing to process', 'ok'); return; }
    setAllBusy(true);
    try {
      const res = await api.sendPayments();
      if (res?.ok) {
        const ext  = res.data?.sent     ?? 0;
        const int_ = res.data?.internal ?? 0;
        const parts = [];
        if (ext  > 0) parts.push(`${ext} sent to clearing bank`);
        if (int_ > 0) parts.push(`${int_} internal`);
        push(parts.length ? parts.join(', ') : 'No POs processed', 'ok');
      } else {
        push(res?.message ?? 'Error sending payments', 'err');
      }
      refresh();
    } finally { setAllBusy(false); }
  };

  const handlePollCbAcks = async () => {
    if (busyRef.current) return;
    setAllBusy(true);
    try {
      const res = await api.pollCbAcks();
      if (res?.ok) {
        const n = res.data?.received ?? 0;
        push(n > 0 ? `${n} ACKs ontvangen van CB` : 'Geen nieuwe ACKs bij CB', 'ok');
        if (n > 0) refresh();
      } else {
        push(res?.message ?? 'Fout bij pollen ACKs', 'err');
      }
    } finally { setAllBusy(false); }
  };

  const counts = {
    accounts: accounts.length,
    po:       poNew.length + poOut.length + poIn.length,
    ack:      ackIn.length + ackOut.length,
    tx:       txs.length,
    log:      logs.length,
  };

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} counts={counts} bankInfo={bankInfo} />

      <div className="main">
        <Topbar route={route} onNew={() => setShowNew(true)} bankInfo={bankInfo} />

        {route === 'dashboard' && (
          <Dashboard
            poNew={poNew} poOut={poOut} poIn={poIn} txs={txs} accounts={accounts}
            bankInfo={bankInfo}
            autoLastRun={autoLastRun}
            busy={busy}
            onOpenPo={(po, kind) => setOpenPo({ po, kind })}
          />
        )}
        {route === 'accounts' && <Accounts accounts={accounts} />}
        {route === 'po' && (
          <PaymentOrders
            poNew={poNew} poOut={poOut} poIn={poIn}
            onOpenPo={(po, kind) => setOpenPo({ po, kind })}
            onNew={() => setShowNew(true)}
            onProcess={handleProcess}
            onPollCb={handlePollCb}
            onPollCbAcks={handlePollCbAcks}
            busy={busy}
          />
        )}
        {route === 'ack' && <Acknowledgements ackIn={ackIn} ackOut={ackOut} />}
        {route === 'tx'  && <Transactions txs={txs} onOpenTx={tx => setOpenTx(tx)} />}
        {route === 'log' && <Log logs={logs} />}
      </div>

      {openPo && (
        <PoDrawer po={openPo.po} kind={openPo.kind} onClose={() => setOpenPo(null)} />
      )}
      {openTx && (
        <TxDrawer tx={openTx} onClose={() => setOpenTx(null)} />
      )}
      {showNew && (
        <NewPoModal
          accounts={accounts}
          bankInfo={bankInfo}
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="toasts">
        {toastItems.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
