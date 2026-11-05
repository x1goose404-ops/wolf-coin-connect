// TEST-ONLY Wallet Standard wallet, used with ?demo=1 to exercise detection +
// connect/disconnect in browsers that cannot load a wallet extension.
//
// It implements the standard through the official @wallet-standard/wallet
// registerWallet() handshake (vendored, v1.1.1). It is NOT a real wallet:
// it holds no keys, signs nothing, and touches no network.
import { registerWallet } from '../vendor/wallet-standard-wallet/index.js';

const CHAIN = 'x1:demo';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58(bytes) {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b === 0) out = '1' + out; else break; }
  return out || '1';
}

const listeners = new Set();
let current = null;

function newAccount() {
  const publicKey = crypto.getRandomValues(new Uint8Array(32));
  return { address: bs58(publicKey), publicKey, chains: [CHAIN], features: [], label: 'Demo account' };
}

const wallet = {
  version: '1.0.0',
  name: 'Demo Wallet (test only)',
  icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTQiIGZpbGw9IiNmMGI0MjkiLz48L3N2Zz4=',
  chains: [CHAIN],
  get accounts() { return current ? [current] : []; },
  features: {
    'standard:connect': {
      version: '1.0.0',
      async connect() {
        current = current || newAccount();
        for (const l of listeners) l({ accounts: [current] });
        return { accounts: [current] };
      },
    },
    'standard:disconnect': {
      version: '1.0.0',
      async disconnect() {
        current = null;
        for (const l of listeners) l({ accounts: [] });
      },
    },
    'standard:events': {
      version: '1.0.0',
      on(_event, listener) { listeners.add(listener); return () => listeners.delete(listener); },
    },
  },
};

registerWallet(wallet);
