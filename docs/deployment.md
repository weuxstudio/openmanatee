# Deployment

The app is one stateless Node.js process. It can read the local `hermes` command line tool and it
talks to the Hermes HTTP API, so it belongs next to the harness, not on a random web host.

## Docker Compose

Prerequisites: Docker with the Compose plugin.

    cp .env.example .env
    #   set APP_TOKEN (openssl rand -hex 32), and optionally HERMES_BASIS / HERMES_KEY
    #   ORIGIN is preset to http://127.0.0.1:3000; keep it in sync with the address
    #   you open in the browser, otherwise the login is rejected as cross-site (403)
    docker compose up --build -d

The app then listens on `http://127.0.0.1:3000`, login page `/anmelden`.

    docker compose logs --tail=50 app    # startup output, one-time access banner
    docker compose down                  # stop and remove the container

The image is built in two stages (pnpm build, then `node:24-alpine` as a non-root user). Values from
`.env` are passed as environment variables through `env_file`; nothing from `.env` is baked into the
image, and `.dockerignore` keeps `.env*` and `.hermes` out of the build context.

**Set `APP_TOKEN` explicitly for Docker.** Inside the container the start command gets its values
from the environment and does not read a `.env` file, so a token that the app generates at startup
(case 2) would be written to the container's own `/app/.env` and lost when the container is
recreated. A fixed `APP_TOKEN` from your `.env` survives every restart. No volume is needed.

**The image ships no harness.** `/api/board` runs the local `hermes` command line tool and
`/api/experten` reads the profile folder on the host. A plain container has neither, so those two
pages answer with a clear message and no data:

    {"aufgaben":[],"fehler":"hermes CLI nicht gefunden. HERMES_BIN setzen."}

Everything else - login, chat, sessions, components, approvals - works without the CLI. If you want
the two pages inside Docker, mount the tool and the profile folder into the container and point
`HERMES_BIN` at the mounted path.

To update:

    git pull
    docker compose up --build -d

## Reverse proxy

Put the app behind a TLS terminating proxy and let the proxy forward to `127.0.0.1:3000`. The proxy
must forward the original protocol and host, and the app needs to know its public address, otherwise
SvelteKit rejects form submissions (the login) as cross-site. Set in `.env`:

    ORIGIN=https://app.example.com
    PROTOCOL_HEADER=x-forwarded-proto
    HOST_HEADER=x-forwarded-host

`ORIGIN` is the public address in the browser. With `x-forwarded-proto: https` the login cookie gets
the `Secure` flag automatically.

nginx:

    server {
        listen 443 ssl;
        server_name app.example.com;

        ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

        location / {
            proxy_pass         http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header   Host              $host;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_set_header   X-Forwarded-Host  $host;
            # The chat uses a server-sent event stream; buffering would break it.
            proxy_buffering    off;
            proxy_read_timeout 1h;
        }
    }

Caddy:

    app.example.com {
        reverse_proxy 127.0.0.1:3000
    }

Caddy sets `X-Forwarded-Proto` and `X-Forwarded-Host` itself; `ORIGIN` still has to be set.

Never expose the proxy to the open internet without `APP_TOKEN`. The reverse proxy can add a second
lock (basic auth, mTLS, IP allow list), but the app's own token is not a substitute for TLS.

## Tailscale

Tailscale is the simplest way to reach the app from your own devices without opening a port.

    tailscale serve --bg 3000

Then set `ORIGIN` to the address Tailscale prints, for example
`https://your-machine.your-tailnet.ts.net`, and restart the app. `tailscale serve` keeps the app
inside the tailnet.

`tailscale funnel` would publish the same port to the public internet. Do not use Funnel unless
`APP_TOKEN` is set and you accept that the harness behind it owns a terminal. See
[../SECURITY.md](../SECURITY.md).

## Bare metal

    pnpm install
    pnpm build
    pnpm start          # node --env-file=.env build/index.js

Use a process manager (systemd, launchd, pm2) to keep it running and to restart it after a crash. The
process listens on `PORT` (default `3000`) and `HOST` (default `0.0.0.0` in the adapter; use
`HOST=127.0.0.1` when a local proxy is in front).

Example systemd unit:

    [Unit]
    Description=openmanatee
    After=network.target

    [Service]
    WorkingDirectory=/opt/openmanatee
    ExecStart=/usr/bin/pnpm start
    Restart=on-failure
    User=openmanatee

    [Install]
    WantedBy=multi-user.target
