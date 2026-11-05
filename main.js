// Wolf Coin - Milestone 1: X1 Wallet detection + connection (Wallet Standard).
// Uses the maintained @wallet-standard/app getWallets() (vendored, v1.1.1).
// Scope: detection + connect/disconnect ONLY. No mint/transfer/redeem, no on-chain calls,
// no custom registry, no legacy globals.
import { getWallets } from './vendor/wallet-standard-app/index.js';

const $ = (s) => document.querySelector(s);
const listEl = $('#wallet-list');
const statusEl = $('#status');
const connectBtn = $('#connect');
const disconnectBtn = $('#disconnect');
const rescanBtn = $('#rescan');
const accountEl = $('#account');
const logEl = $('#log');
const queryEl = $('#query');

let selected = null;          // Wallet chosen in the list
let connectedWallet = null;   // Wallet we connected to
let unsubscribeEvents = null; // off() for standard:events

function ts() { return new Date().toLocaleTimeString(); }
function log(msg, kind = 'info') {
  const line = document.createElement('div');
  line.className = 'line ' + kind;
  line.textContent = `[${ts()}] ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
  (kind === 'error' ? console.error : kind === 'warn' ? console.warn : console.log)(`[wolf-coin-connect] ${msg}`);
}

// 1) Get the registry as early as possible.
//    The FIRST call dispatches `wallet-standard:app-ready` and installs the
//    `wallet-standard:register-wallet` listener, so wallets register regardless
//    of whether they loaded before or after this script.
const wallets = getWallets();
log('getWallets() called \u2014 dispatched wallet-standard:app-ready.');

// 2) Wire register / unregister events (required by the milestone).
wallets.on('register', (...ws) => {
  for (const w of ws) {
    log(`register: ${w.name} v${w.version || '?'} \u2014 features [${Object.keys(w.features || {}).join(', ')}]`, 'ok');
  }
  renderList();
});
wallets.on('unregister', (...ws) => {
  for (const w of ws) {
    if (selected === w) selected = null;
    if (connectedWallet === w) connectedWallet = null;
    log(`unregister: ${w.name}`, 'warn');
  }
  renderList();
});

// 3) Snapshot wallets that registered before our listeners were attached.
const initial = wallets.get();
log(`Initial snapshot: ${initial.length} wallet(s) already registered.`, initial.length ? 'ok' : 'info');
log('Listening for register / unregister events.');
renderList();

function renderList() {
  const all = wallets.get();
  listEl.textContent = '';
  if (!all.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No Wallet Standard wallets detected yet.';
    listEl.appendChild(p);
  } else {
    for (const w of all) listEl.appendChild(walletRow(w));
  }
  updateButtons();
}

function walletRow(w) {
  const row = document.createElement('label');
  row.className = 'wallet';

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'wallet';
  radio.checked = selected === w;
  radio.addEventListener('change', () => { selected = w; log(`Selected wallet: ${w.name}`); updateButtons(); });

  const info = document.createElement('div');
  info.className = 'wallet-info';
  const name = document.createElement('div');
  name.className = 'wallet-name';
  name.textContent = `${w.name}  v${w.version || '?'}`;
  const feats = document.createElement('div');
  feats.className = 'wallet-features';
  feats.textContent = 'features: ' + (Object.keys(w.features || {}).join(', ') || '(none)');
  const chains = document.createElement('div');
  chains.className = 'wallet-chains';
  chains.textContent = 'chains: ' + ((w.chains || []).join(', ') || '(none)');
  info.append(name, feats, chains);

  row.append(radio, info);
  return row;
}

function updateButtons() {
  const n = wallets.get().length;
  connectBtn.disabled = !selected;
  statusEl.textContent = selected
    ? `Selected: ${selected.name}`
    : (n ? `${n} wallet(s) \u2014 select one` : 'Waiting for a wallet\u2026');
}

rescanBtn.addEventListener('click', () => {
  log(`Re-scan: ${wallets.get().length} wallet(s).`);
  renderList();
});

// 4) Connect via standard:connect.
connectBtn.addEventListener('click', async () => {
  if (!selected) return;
  const feature = selected.features && selected.features['standard:connect'];
  if (!feature || typeof feature.connect !== 'function') {
    log(`"${selected.name}" does not advertise standard:connect.`, 'error');
    return;
  }
  connectBtn.disabled = true;
  log(`Connecting to "${selected.name}" via standard:connect \u2026`);
  try {
    const { accounts } = await feature.connect();
    const list = accounts || [];
    connectedWallet = selected;
    if (list.length) {
      log(`Connected to "${selected.name}": ${list.length} account(s).`, 'ok');
      log(`Address: ${list[0].address}`, 'ok');
      showAccount(list[0]);
      subscribeEvents(selected);
    } else {
      log('standard:connect returned 0 accounts (not connected).', 'warn');
    }
    disconnectBtn.disabled = false;
  } catch (err) {
    log(`standard:connect failed: ${(err && err.message) || String(err)}`, 'error');
  } finally {
    updateButtons();
  }
});

function showAccount(acc) {
  accountEl.textContent = '';
  const rows = [
    ['address (base58)', acc.address],
    ['publicKey', acc.publicKey ? `${acc.publicKey.length} bytes` : '(none)'],
    ['chains', (acc.chains || []).join(', ') || '(none)'],
  ];
  if (acc.label) rows.push(['label', acc.label]);
  for (const [k, v] of rows) {
    const div = document.createElement('div');
    const key = document.createElement('span');
    key.className = 'k';
    key.textContent = k + ': ';
    div.append(key, document.createTextNode(String(v)));
    accountEl.appendChild(div);
  }
  accountEl.hidden = false;
}

function subscribeEvents(w) {
  if (unsubscribeEvents) { try { unsubscribeEvents(); } catch { /* ignore */ } unsubscribeEvents = null; }
  const ev = w.features && w.features['standard:events'];
  if (!ev || typeof ev.on !== 'function') return;
  try {
    unsubscribeEvents = ev.on('change', ({ accounts }) => {
      const list = accounts || [];
      if (list.length) { showAccount(list[0]); log('standard:events: account updated.', 'ok'); }
      else { accountEl.hidden = true; log('standard:events: account removed / disconnected.', 'warn'); }
    });
  } catch (err) {
    log(`standard:events subscribe failed: ${(err && err.message) || String(err)}`, 'warn');
  }
}

// 5) Disconnect via standard:disconnect.
disconnectBtn.addEventListener('click', async () => {
  if (!connectedWallet) return;
  const name = connectedWallet.name;
  const feature = connectedWallet.features && connectedWallet.features['standard:disconnect'];
  if (!feature || typeof feature.disconnect !== 'function') {
    log(`"${name}" does not advertise standard:disconnect.`, 'error');
  } else {
    try {
      await feature.disconnect();
      log(`Disconnected from "${name}" via standard:disconnect.`, 'ok');
    } catch (err) {
      log(`standard:disconnect failed: ${(err && err.message) || String(err)}`, 'error');
    }
  }
  if (unsubscribeEvents) { try { unsubscribeEvents(); } catch { /* ignore */ } unsubscribeEvents = null; }
  connectedWallet = null;
  accountEl.hidden = true;
  disconnectBtn.disabled = true;
});

// Optional test hook: ?demo=1 registers a standard-compliant fake wallet (TEST ONLY).
const params = new URLSearchParams(location.search);
if (params.has('demo')) {
  queryEl.textContent = 'DEMO mode ?demo=1 \u2014 a Wallet Standard test wallet is registered (no real keys).';
  log('DEMO mode: loading Wallet Standard test wallet (?demo=1, test only).', 'warn');
  import('./demo/demo-wallet.js').catch((e) => log(`demo wallet load failed: ${(e && e.message) || e}`, 'error'));
}
