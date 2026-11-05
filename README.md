# wolf-coin-connect

Milestone 1 for Wolf Coin: **X1 Wallet detection + connection only**, via the
official [Wallet Standard](https://github.com/wallet-standard/wallet-standard).

This is deliberately minimal. It does **not** mint, transfer, redeem, or touch the
Wolf Coin program, registry, collateral, or any on-chain state. It never asks a
wallet to sign anything.

## What the page does

1. Loads the maintained **`@wallet-standard/app`** library (`getWallets()`) as an ES
   module, first in `<head>`, so `wallet-standard:app-ready` is dispatched as early
   as possible; it also wires the registry's `register` / `unregister` events.
2. Lists **all** registered Wallet Standard wallets with their `name`, `version`,
   `chains`, and every advertised **feature** key (e.g. `standard:connect`,
   `standard:disconnect`, `standard:events`) — so you can see exactly what
   X1 Wallet advertises.
3. A **Connect** button calls `standard:connect` on the selected wallet and shows the
   connected account's **address (base58 public key)**; **Disconnect** calls
   `standard:disconnect`.
4. Prints a clear on-page **log** (detected wallets, selected wallet, connect
   result, and any errors).

Detection is automatic: install the X1 Wallet browser extension and reload the page.

## Files

```
index.html                       page + inline styles
main.js                          the ES module (detection + connect/disconnect)
demo/demo-wallet.js              TEST-ONLY standard wallet, loaded only with ?demo=1
vendor/wallet-standard-app/      @wallet-standard/app v1.1.1 (Apache-2.0), esm dist
vendor/wallet-standard-wallet/   @wallet-standard/wallet v1.1.1 (Apache-2.0), esm dist
.nojekyll                        disable Jekyll on GitHub Pages
```

## Run locally

```sh
python3 -m http.server 8137        # then open http://localhost:8137/
python3 -m http.server 8137        # demo: http://localhost:8137/?demo=1
```

## Testing note

Browser automation cannot load a wallet **extension**, so an automated/headless
browser sees **zero** wallets — that is expected, not a bug. To exercise the
connect/disconnect code path without an extension, append `?demo=1`; this registers
a standard-compliant *fake* wallet (no keys, signs nothing). Verifying the **real
X1 Wallet** requires installing the extension in a normal desktop browser.

## Vendored library

`vendor/` contains the unmodified ESM distribution of the maintained packages
`@wallet-standard/app@1.1.1` and `@wallet-standard/wallet@1.1.1` (both Apache-2.0,
authored by Solana Maintainers). `VERSION` files record provenance; `LICENSE` files
are included. Only the `sourceMappingURL` comments were stripped. The runtime ESM of
`@wallet-standard/app` has no runtime imports (its `@wallet-standard/base` dependency
is type-only), so it is self-contained.

## Licence

Our code in this repository: MIT. Vendored `@wallet-standard/*` code: Apache-2.0
(see the `LICENSE` files under `vendor/`).
