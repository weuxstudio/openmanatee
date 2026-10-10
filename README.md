# OpenManatee

<p align="center"><img src="static/manatee.svg" alt="OpenManatee, a manatee wearing a visor" width="170"></p>

A small self-hosted client for a Hermes harness. It chats with an agent that does not only send text
back: it can also shape the interface its answer appears in.

The app is a thin client. It does not compute anything itself, it asks the server and draws what
comes back. Credentials stay on the server. The visual style is fixed: light ground, white
surfaces, one yellow accent, agents drawn as figures with a visor and told apart by shape and
colour.

## What makes it different

**Answers are interfaces, not walls of text.** The model's answer is split into blocks and drawn by
shape: lists become rows with a hairline, tables become real tables, long paragraphs collapse
behind "show all".

**A component catalogue.** The model may additionally send one component and the app draws a whole
view from it. Eleven components are available: `liste`, `tabelle`, `kennzahl`, `zeitleiste`,
`schritte`, `kalender`, `ort`, `datei`, `verweis`, `fortschritt`, `frage`. Anything malformed falls
through validation and is shown as plain text, so a creative model cannot break the surface.

**Tool calls in plain language.** Only the current step is visible, in human words: "reads
werkzeug.ts", "waits a moment", "looks up date and time". The next step takes the same place. The
full history opens on click, with call, arguments and real output.

**The figure is alive.** It breathes, blinks and wakes up while work is running.

**Honest displays.** No invented progress: the server reports no percentage, so the session shows
elapsed time, the number of steps and an indeterminate bar.

## Five steps to a running copy

These steps assume Node.js 22 or newer and pnpm 11 or newer (the lockfile and the build approval in
`pnpm-workspace.yaml` are from pnpm 11).

    # 1. get the code
    git clone https://github.com/weuxstudio/openmanatee.git
    cd openmanatee

    # 2. create your settings file
    cp .env.example .env
    #    ORIGIN is preset to http://127.0.0.1:3000. It must match the address
    #    you open in the browser, otherwise the login form is rejected (403).

    # 3. create an access token and put it in .env
    openssl rand -hex 32
    #    open .env and paste the value into the APP_TOKEN= line

    # 4. install and build
    pnpm install
    pnpm build

    # 5. start it, then log in
    pnpm start
    #    open http://127.0.0.1:3000/anmelden and enter the token from step 3

`pnpm start` reads `.env` itself (`node --env-file=.env build/index.js`), so the token survives a
restart: a second start does not print the access banner again and old login cookies keep working.

`ORIGIN` is the address you type into the browser. On a different port, behind a proxy or in the
tailnet, set it to that exact address (scheme, host and port). If it does not match, the server
treats your login as a cross-site form post and answers HTTP 403.

For Docker, steps 4 and 5 become one:

    docker compose up --build -d     # then open http://127.0.0.1:3000/anmelden

Docker Compose passes the values from `.env` into the container, so the container command needs no
`--env-file`. See [docs/deployment.md](docs/deployment.md) for Docker, reverse proxy and Tailscale.

## Connect your Hermes

Without a harness the app runs on sample data, so you can look at every page first. To connect a
real harness, set two values in `.env`:

    HERMES_BASIS=http://127.0.0.1:8642
    HERMES_KEY=<the key from API_SERVER_KEY>

On the Hermes side, `~/.hermes/.env` must contain:

    API_SERVER_ENABLED=true
    API_SERVER_KEY=<the same key>

`HERMES_BASIS` must be reachable from the machine that runs this app, not from your browser: the
app talks to the harness, the browser only talks to the app. `HERMES_BIN` optionally points at the
`hermes` command line tool if it is not on `PATH`.

The key must never go into a `PUBLIC_` variable. Whoever reads it has the full tool set of the
harness, the terminal included. See [SECURITY.md](SECURITY.md).

## How the access token comes to be

The token is the only key to the app and is never sent to the browser. Three clearly separated
cases:

1. **`APP_TOKEN` set** - the door is active. Every API route needs a login cookie; without one the
   answer is HTTP 401. This is what you want on a network.
2. **`APP_TOKEN` empty, `HERMES_KEY` set** - the app generates a random token on the first start,
   writes it into `.env` (the old file is kept as `.env.bak`) and prints it exactly once on the
   startup output. The door is active afterwards; the value in `.env` always lets you back in.
3. **Both empty** - there is nothing to protect. The door stays off, no token is generated and the
   app answers with sample data everywhere, including `/api/board` and `/api/experten`.

`APP_SECRET` signs the login cookie. If it is empty, the app generates one and stores it in `.env`
the same way. The token itself never appears in the cookie.

To change the token later, edit `APP_TOKEN` in `.env` and restart. Existing cookies become invalid
at that moment, which is the point.

## Tests

The test scripts measure against a real run, not against the source:

    python pruefen_tuer.py        access door: 401 without cookie, 200 with, 401 when tampered, sample data without a door
    python pruefen_werkzeug.py    tool line, plain language, history, figure, run display
    python pruefen_antwort.py     list, table, collapsed paragraph
    python pruefen_bausteine.py   catalogue against the real model, fallback and foreign content
    python pruefen_board.py       tasks from the Kanban board
    python pruefen_agenten.py     agents from the profiles

They read the port from `OPENMANATEE_PORT` (default `4390`) and never touch a running dev server.

## Limits

This version is deliberately small. It is not there yet:

- no multi-user operation and no roles per person: one token opens everything
- no encryption of stored data: `.env` holds the secrets in plain text
- no push notifications
- no file uploads through this interface (images inline only)
- in Docker the pages for tasks and agents stay empty: `/api/board` and `/api/experten` read the local
  `hermes` CLI and the profile folder, which the image does not ship. Both answer with a clear message
  instead of failing silently; see [docs/deployment.md](docs/deployment.md)
- the harness key gives access to the harness tool set, a terminal included

Never expose the app to an open network without a token. See [SECURITY.md](SECURITY.md) and
[docs/deployment.md](docs/deployment.md).

## Repository layout

    src/lib/antwort.ts          split an answer into blocks
    src/lib/Antwort.svelte      draw blocks (list, table, paragraph, box)
    src/lib/bausteine.ts        catalogue with validation and model instructions
    src/lib/Baustein.svelte     draw a component
    src/lib/werkzeug.ts         turn tool calls and commands into sentences
    src/lib/sitzung.svelte.ts   state, event stream, reloading the history
    src/lib/api.ts              access to the Hermes server
    src/lib/werte.ts            roles, shapes, colours, actions
    src/lib/Figur.svelte        figure of a role, built from shape and colour
    src/lib/server/tuer.ts      access door: token check and signed cookie
    src/routes/api/...          the gate to the harness; the key lives here
    src/routes/anmelden/        login page
    src/routes/session/[id]/    session with run, components and approval
    Dockerfile                  multi-stage image, non-root runtime
    docker-compose.yml          one service, port 3000, values from .env

The previous German README is kept as [README.de.md](README.de.md).

## License

MIT, 2026, Marc Weidemueller. See [LICENSE](LICENSE).
