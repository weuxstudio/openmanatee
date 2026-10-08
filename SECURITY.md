# Security

## Trust model in plain sentences

The app is a remote control for one Hermes harness. Whoever holds the access token holds the tool
set of that harness, the terminal included. There is nothing in between: no per-tool permissions, no
read-only mode, no approval that the app itself enforces. Approvals shown in the chat are decisions
the harness offers, not a security boundary of this app.

- **One token, one operator.** The token is the only credential. Anyone who has it can chat, start
  runs, read files through the harness and let commands run. Treat it like an SSH key.
- **Login cookies are signed, not encrypted.** After a correct login the browser gets an
  `HttpOnly`, `SameSite=Lax` cookie with an expiry date and an HMAC-SHA256 signature made with
  `APP_SECRET`. The token itself is never in the cookie. The signature proves that the app issued
  the cookie; it does not hide anything.
- **`Secure` only over HTTPS.** The cookie gets the `Secure` flag when the request arrives over
  HTTPS (also behind a reverse proxy that sets `X-Forwarded-Proto`). Over plain HTTP on a LAN the
  cookie travels in clear text.
- **The harness key stays on the server.** `HERMES_KEY` is only read by the server routes and is
  never sent to the browser. The same is true for `APP_TOKEN` and `APP_SECRET`.
- **Nothing is encrypted at rest.** `.env` holds the token, the cookie secret and the harness key in
  plain text. File permissions are the only protection: keep `.env` at mode `0600`, outside version
  control.
- **Sample data has no host access.** While the door is inactive (no `APP_TOKEN`, no `HERMES_KEY`),
  `/api/board` and `/api/experten` answer built-in examples and read nothing from the machine.

## What this version does not do

- **No multi-user operation.** There is one token and one role. No accounts, no roles per person, no
  audit log that tells who did what.
- **No permissions per tool.** The token unlocks the whole harness surface.
- **No encryption of stored data.** No database, no secrets vault.
- **No push notifications.** The app only shows what the open browser polls or streams.
- **No file uploads** through this interface (images inline only).

## Rules of thumb

1. **Never run it without `APP_TOKEN` on a reachable address.** Without a token the door is open;
   with a harness key present the app generates one at startup instead, but the best state is a
   token you set yourself.
2. **Run it behind TLS** (reverse proxy or Tailscale) before it leaves localhost.
3. **Keep the port on localhost or in the tailnet.** Use `tailscale serve`, not `tailscale funnel`,
   unless you know why.
4. **Rotate the token** if it may have leaked: change `APP_TOKEN` in `.env` and restart. All old
   cookies become invalid at once.
5. **Do not reuse the harness key anywhere else.** It belongs in `HERMES_KEY` on the server and in
   `API_SERVER_KEY` on the Hermes side.

## Reporting a problem

Open an issue in the repository. Do not paste real tokens or keys into an issue, a log or a
screenshot.
