"""Check that a production start loads .env and keeps the token stable.

The plan's finding 2.0a: `node build/index.js` did not read .env, so every
start generated a new APP_TOKEN and an old login cookie stopped working.

This script runs the built app twice in a throw-away folder that carries its
own .env (the real .env of the project is never touched):

  first start   banner appears, APP_TOKEN is generated and written to .env,
                a login with that token succeeds
  second start  no banner, APP_TOKEN and APP_SECRET in .env are unchanged,
                the cookie from the first start is still accepted
"""
import http.client
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

WURZEL = Path(__file__).resolve().parent
BAU = WURZEL / "build" / "index.js"
COOKIE = "app_zugang"
HARNESS_KEY = "probe-schluessel-2.0a"
VORGABE_PORT = int(os.environ.get("OPENMANATEE_PORT", "4390"))
NODE = shutil.which("node") or "node"


def freier_port(vorgabe: int) -> int:
    for kandidat in (vorgabe, 0):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", kandidat))
                return s.getsockname()[1]
            except OSError:
                continue
    raise SystemExit("no free port available")


class Harness(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def _antwort(self):
        roh = b'{"ok": true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(roh)))
        self.end_headers()
        self.wfile.write(roh)

    do_GET = _antwort
    do_POST = _antwort


def anfrage(port: int, methode: str, pfad: str, kopf=None, koerper=None):
    v = http.client.HTTPConnection("127.0.0.1", port, timeout=15)
    v.request(methode, pfad, body=koerper, headers=kopf or {})
    a = v.getresponse()
    daten = a.read().decode("utf-8", "replace")
    kopfzeilen = a.getheaders()
    status = a.status
    v.close()
    return status, kopfzeilen, daten


def warte_auf(port: int, sekunden: float = 25.0) -> bool:
    ende = time.time() + sekunden
    while time.time() < ende:
        try:
            anfrage(port, "GET", "/anmelden")
            return True
        except OSError:
            time.sleep(0.25)
    return False


def cookie_aus(kopfzeilen) -> str:
    for name, wert in kopfzeilen:
        if name.lower() == "set-cookie" and wert.startswith(f"{COOKIE}="):
            return wert.split(";", 1)[0]
    return ""


def env_lesen(pfad: Path) -> dict:
    werte = {}
    for zeile in pfad.read_text(encoding="utf-8").splitlines():
        if "=" in zeile and not zeile.strip().startswith("#"):
            name, wert = zeile.split("=", 1)
            werte[name.strip()] = wert.strip()
    return werte


def starten(scratch: Path, port: int, harness_port: int):
    umgebung = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": str(scratch / "home"),
        "PORT": str(port),
        "HOST": "127.0.0.1",
        "ORIGIN": f"http://127.0.0.1:{port}",
    }
    prozess = subprocess.Popen(
        [NODE, "--env-file=.env", str(scratch / "build" / "index.js")],
        cwd=scratch,
        env=umgebung,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if not warte_auf(port):
        prozess.kill()
        raise SystemExit("die gebaute App wurde nicht wach")
    return prozess


def stoppen(prozess) -> str:
    prozess.terminate()
    try:
        prozess.wait(timeout=10)
    except subprocess.TimeoutExpired:
        prozess.kill()
    if prozess.stdout is None:
        return ""
    return prozess.stdout.read().decode("utf-8", "replace")


def main() -> int:
    if not BAU.exists():
        print(f"FEHL build fehlt: {BAU} (erst bauen)")
        return 1

    scratch = Path(tempfile.mkdtemp(prefix="openmanatee-start-"))
    shutil.copytree(BAU.parent, scratch / "build")
    shutil.copy2(WURZEL / "package.json", scratch / "package.json")
    (scratch / "home").mkdir()

    harness_port = freier_port(8645)
    app_port = freier_port(VORGABE_PORT)
    harness = http.server.ThreadingHTTPServer(("127.0.0.1", harness_port), Harness)
    threading.Thread(target=harness.serve_forever, daemon=True).start()

    env_pfad = scratch / ".env"
    env_pfad.write_text(
        "APP_TOKEN=\n"
        "APP_SECRET=\n"
        f"HERMES_KEY={HARNESS_KEY}\n"
        f"HERMES_BASIS=http://127.0.0.1:{harness_port}\n",
        encoding="utf-8",
    )

    ergebnisse: list[tuple[str, bool, str]] = []
    try:
        print(f"scratch={scratch}")
        print(f"app auf 127.0.0.1:{app_port}, harness auf 127.0.0.1:{harness_port}")
        print(f".env vor dem ersten Start:\n{env_pfad.read_text(encoding='utf-8').strip()}")

        # ---- first start -------------------------------------------------
        p1 = starten(scratch, app_port, harness_port)
        nach_start1 = env_lesen(env_pfad)
        token1 = nach_start1.get("APP_TOKEN", "")
        secret1 = nach_start1.get("APP_SECRET", "")
        status, kopf, koerper = anfrage(
            app_port,
            "POST",
            "/anmelden",
            kopf={
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": f"http://127.0.0.1:{app_port}",
                "Accept": "text/html",
            },
            koerper=f"token={token1}",
        )
        cookie = cookie_aus(kopf)
        ausgabe1 = stoppen(p1)

        ergebnisse.append((
            "erster Start zeigt den Banner",
            "APP_TOKEN=" in ausgabe1 and "Anmelden unter /anmelden" in ausgabe1,
            "Banner gefunden" if "APP_TOKEN=" in ausgabe1 else "kein Banner",
        ))
        ergebnisse.append((
            "erster Start erzeugt APP_TOKEN in der .env",
            len(token1) == 64 and len(secret1) == 64,
            f"APP_TOKEN-Laenge {len(token1)}, APP_SECRET-Laenge {len(secret1)}",
        ))
        ergebnisse.append((
            "Startausgabe zeigt keinen Harness-Schluessel",
            HARNESS_KEY not in ausgabe1,
            "probe-schluessel nicht in der Ausgabe",
        ))
        ergebnisse.append((
            "Anmeldung aus dem ersten Lauf setzt ein Cookie",
            status in (302, 303) and cookie != "",
            f"{status} {cookie}",
        ))

        # ---- second start, same folder, same .env ------------------------
        p2 = starten(scratch, app_port, harness_port)
        nach_start2 = env_lesen(env_pfad)
        token2 = nach_start2.get("APP_TOKEN", "")
        secret2 = nach_start2.get("APP_SECRET", "")
        status_mit, _, koerper_mit = anfrage(
            app_port, "GET", "/api/hermes/api/status", kopf={"Cookie": cookie}
        )
        status_ohne, _, _ = anfrage(app_port, "GET", "/api/board")
        ausgabe2 = stoppen(p2)

        ergebnisse.append((
            "zweiter Start zeigt keinen Banner",
            "APP_TOKEN=" not in ausgabe2,
            "kein Banner in der zweiten Ausgabe",
        ))
        ergebnisse.append((
            "APP_TOKEN unveraendert",
            token1 == token2 and token1 != "",
            f"vorher {token1[:8]}...{token1[-8:]}, nachher {token2[:8]}...{token2[-8:]}",
        ))
        ergebnisse.append((
            "APP_SECRET unveraendert",
            secret1 == secret2 and secret1 != "",
            f"vorher {secret1[:8]}...{secret1[-8:]}, nachher {secret2[:8]}...{secret2[-8:]}",
        ))
        ergebnisse.append((
            "Cookie aus dem ersten Lauf bleibt gueltig",
            status_mit == 200,
            f"GET /api/hermes/api/status mit altem Cookie -> {status_mit}",
        ))
        ergebnisse.append((
            "Tuer bleibt aktiv, /api/board ohne Cookie 401",
            status_ohne == 401,
            f"{status_ohne}",
        ))
    finally:
        harness.shutdown()
        harness.server_close()
        shutil.rmtree(scratch, ignore_errors=True)

    print()
    for name, ok, beleg in ergebnisse:
        print(f"{'ok  ' if ok else 'FEHL'} {name}: {beleg}")
    return 0 if ergebnisse and all(ok for _, ok, _ in ergebnisse) else 1


if __name__ == "__main__":
    sys.exit(main())
