"""Check the access door of the built app without a browser.

The app always runs in a throw-away folder, so a real .env in the project is
never read or written. Three clearly separated cases from the plan:

  case 1/2 - the door is active (APP_TOKEN set, or generated because a harness
    key is present)
      GET /api/hermes/api/status without a cookie       -> 401
      login with the token                              -> 303 plus cookie
      same GET with the cookie                          -> 200
      tampered cookie                                   -> 401
      GET /api/board and /api/experten without a cookie -> 401
      GET /anmelden                                     -> 200
      /api/status without a cookie                      -> basis: null
      /api/status with the cookie                       -> basis set

  case 3 - no door at all (no APP_TOKEN, no HERMES_KEY)
      GET /api/board without a cookie                   -> 200 with sample tasks
      GET /api/experten without a cookie                -> 200 with sample profiles
      and neither route reads anything from the host: a decoy profile folder
      and a decoy `hermes` binary in PATH must stay untouched.

The script never touches port 5173 and stops every server it starts.
"""
import http.client
import http.server
import json
import os
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

WURZEL = Path(__file__).resolve().parent
BAU = WURZEL / "build" / "index.js"
COOKIE = "app_zugang"
TOKEN = "probe-token"
SECRET = "probe-geheim"
HARNESS_KEY = "probe-schluessel"
VORGABE_PORT = int(os.environ.get("OPENMANATEE_PORT", "4390"))
NODE = shutil.which("node") or "node"


def freier_port(vorgabe: int) -> int:
    """Use the suggested port, otherwise ask the system for a free one."""
    for kandidat in (vorgabe, 0):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", kandidat))
                return s.getsockname()[1]
            except OSError:
                continue
    raise SystemExit("no free port available")


class Harness(http.server.BaseHTTPRequestHandler):
    """Stand-in for the Hermes HTTP API; 200 on every path is enough here."""

    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def _antwort(self):
        roh = json.dumps({"ok": True, "pfad": self.path}).encode()
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


class App:
    """The built app in a scratch folder, startable more than once."""

    def __init__(self, scratch: Path, harness_port: int):
        self.scratch = scratch
        self.harness_port = harness_port
        self.prozess = None
        self.port = freier_port(VORGABE_PORT)

    def starten(self, extra_umgebung: dict) -> str:
        umgebung = {
            "PATH": os.environ.get("PATH", ""),
            "HOME": str(self.scratch / "home"),
            "PORT": str(self.port),
            "HOST": "127.0.0.1",
            "ORIGIN": f"http://127.0.0.1:{self.port}",
            "HERMES_BASIS": f"http://127.0.0.1:{self.harness_port}",
        }
        umgebung.update(extra_umgebung)
        befehl = [NODE, str(self.scratch / "build" / "index.js")]
        self.prozess = subprocess.Popen(
            befehl,
            cwd=self.scratch,
            env=umgebung,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if not warte_auf(self.port):
            raise SystemExit("die gebaute App wurde nicht wach")
        return self.port

    def stoppen(self) -> str:
        """Terminate the app and return its complete output so far."""
        if self.prozess is None:
            return ""
        self.prozess.terminate()
        try:
            self.prozess.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.prozess.kill()
        ausgabe = ""
        if self.prozess.stdout is not None:
            try:
                ausgabe = self.prozess.stdout.read().decode("utf-8", "replace")
            except Exception:
                ausgabe = ""
        self.prozess = None
        return ausgabe


def scratch_bauen() -> Path:
    """Copy build/ and package.json into a fresh temp folder."""
    ordner = Path(tempfile.mkdtemp(prefix="openmanatee-tuer-"))
    shutil.copytree(BAU.parent, ordner / "build")
    shutil.copy2(WURZEL / "package.json", ordner / "package.json")
    (ordner / "home").mkdir()
    return ordner


def ergebnisliste(ergebnisse, name, ok, beleg):
    ergebnisse.append((name, bool(ok), beleg))


def fall_aktive_tuer(app: App, ergebnisse) -> None:
    """Case 1/2: door active, every API route needs a cookie."""
    port = app.starten({"APP_TOKEN": TOKEN, "APP_SECRET": SECRET, "HERMES_KEY": HARNESS_KEY})

    status, _, koerper = anfrage(port, "GET", "/api/hermes/api/status")
    ergebnisliste(ergebnisse, "Fall1/2 401 ohne Cookie",
                  status == 401 and "nicht angemeldet" in koerper, f"{status} {koerper[:60]}")

    status, kopf, koerper = anfrage(
        port, "GET", "/api/status")
    basis_ohne = json.loads(koerper).get("basis") if status == 200 else "kein json"
    ergebnisliste(ergebnisse, "Fall1/2 /api/status ohne Cookie basis null",
                  status == 200 and basis_ohne is None, f"{status} basis={basis_ohne!r}")

    status, kopf, koerper = anfrage(
        port,
        "POST",
        "/anmelden",
        kopf={
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": f"http://127.0.0.1:{port}",
            "Accept": "text/html",
        },
        koerper=f"token={TOKEN}",
    )
    cookie = cookie_aus(kopf)
    set_cookie = next((w for n, w in kopf if n.lower() == "set-cookie"), "")
    merkmale = (
        status in (302, 303)
        and cookie != ""
        and "HttpOnly" in set_cookie
        and "SameSite=Lax" in set_cookie
        and TOKEN not in cookie
    )
    ergebnisliste(ergebnisse, "Fall1/2 Anmeldung setzt Cookie", merkmale,
                  f"{status} {cookie} merkmale={set_cookie}")

    status, _, koerper = anfrage(port, "GET", "/api/hermes/api/status", kopf={"Cookie": cookie})
    ergebnisliste(ergebnisse, "Fall1/2 200 mit gueltigem Cookie", status == 200,
                  f"{status} {koerper[:60]}")

    status, _, koerper = anfrage(port, "GET", "/api/status", kopf={"Cookie": cookie})
    basis_mit = json.loads(koerper).get("basis") if status == 200 else "kein json"
    ergebnisliste(ergebnisse, "Fall1/2 /api/status mit Cookie zeigt basis",
                  status == 200 and isinstance(basis_mit, str) and basis_mit.startswith("http"),
                  f"{status} basis={basis_mit!r}")

    manipuliert = cookie[:-1] + ("0" if cookie[-1] != "0" else "1")
    status, _, koerper = anfrage(port, "GET", "/api/hermes/api/status",
                                 kopf={"Cookie": manipuliert})
    ergebnisliste(ergebnisse, "Fall1/2 401 bei manipuliertem Cookie", status == 401,
                  f"{status} {koerper[:60]}")

    for pfad in ("/api/board", "/api/experten"):
        status, _, koerper = anfrage(port, "GET", pfad)
        ergebnisliste(ergebnisse, f"Fall1/2 {pfad} ohne Cookie 401", status == 401,
                      f"{status} {koerper[:60]}")

    status, _, koerper = anfrage(port, "GET", "/anmelden")
    ergebnisliste(ergebnisse, "Fall1/2 200 auf /anmelden", status == 200,
                  f"{status} {len(koerper)} Zeichen")

    app.stoppen()


def fall_erzeugter_token(app: App, ergebnisse) -> None:
    """Case 2: no APP_TOKEN, but a harness key. The app generates one."""
    (app.scratch / ".env").write_text(
        f"APP_TOKEN=\nAPP_SECRET=\nHERMES_KEY={HARNESS_KEY}\n"
        f"HERMES_BASIS=http://127.0.0.1:{app.harness_port}\n",
        encoding="utf-8",
    )
    port = app.starten({"APP_TOKEN": "", "APP_SECRET": "", "HERMES_KEY": HARNESS_KEY})
    status, _, koerper = anfrage(port, "GET", "/api/board")
    ergebnisliste(ergebnisse, "Fall2 /api/board ohne Cookie 401", status == 401,
                  f"{status} {koerper[:60]}")
    status, _, koerper = anfrage(port, "GET", "/api/experten")
    ergebnisliste(ergebnisse, "Fall2 /api/experten ohne Cookie 401", status == 401,
                  f"{status} {koerper[:60]}")
    ausgabe = app.stoppen()
    erzeugt = "APP_TOKEN=" in ausgabe and "Anmelden unter /anmelden" in ausgabe
    ergebnisliste(ergebnisse, "Fall2 Startausgabe zeigt erzeugten Token", erzeugt,
                  "Banner mit APP_TOKEN vorhanden" if erzeugt else "kein Banner gefunden")
    ergebnisliste(ergebnisse, "Fall2 Startausgabe zeigt keinen Harness-Schluessel",
                  HARNESS_KEY not in ausgabe,
                  "probe-schluessel nicht in der Ausgabe")
    # The generated token was persisted next to the settings.
    env_text = (app.scratch / ".env").read_text(encoding="utf-8")
    zeile = next((z for z in env_text.splitlines() if z.startswith("APP_TOKEN=")), "")
    ergebnisliste(ergebnisse, "Fall2 Token wurde in die .env geschrieben",
                  len(zeile.split("=", 1)[-1]) == 64,
                  f"APP_TOKEN-Laenge {len(zeile.split('=', 1)[-1])}")


def fall_ohne_tuer(app: App, ergebnisse) -> None:
    """Case 3: no door. Both host routes answer examples and read nothing."""
    # A decoy profile folder: it must never show up in the answer.
    profile = app.scratch / "home" / ".hermes" / "profiles" / "GEHEIM-MARKE"
    profile.mkdir(parents=True)
    (profile / "profile.yaml").write_text("name: GEHEIM-MARKE\ndescription: darf nicht erscheinen\n",
                                          encoding="utf-8")

    # A decoy hermes binary: it must never be executed.
    bindir = app.scratch / "bin"
    bindir.mkdir()
    marker = app.scratch / "hermes-wurde-gerufen"
    klinge = bindir / "hermes"
    klinge.write_text(f"#!/bin/sh\ntouch {marker}\necho '[]'\n", encoding="utf-8")
    klinge.chmod(klinge.stat().st_mode | stat.S_IEXEC)

    port = app.starten(
        {
            "APP_TOKEN": "",
            "HERMES_KEY": "",
            "PATH": str(bindir),
            "HERMES_BIN": "",
        }
    )

    status, _, koerper = anfrage(port, "GET", "/api/board")
    daten = json.loads(koerper) if status == 200 else {}
    aufgaben = daten.get("aufgaben", [])
    ok_board = status == 200 and len(aufgaben) > 0 and "titel" in aufgaben[0]
    ergebnisliste(ergebnisse, "Fall3 /api/board 200 mit Beispielaufgaben", ok_board,
                  f"{status} {len(aufgaben)} Aufgaben, erste: {aufgaben[0]['titel'] if aufgaben else '-'}")
    ergebnisliste(ergebnisse, "Fall3 /api/board liest die CLI nicht", not marker.exists(),
                  f"Marker {marker.name} {'da' if marker.exists() else 'fehlt'}")

    status, _, koerper = anfrage(port, "GET", "/api/experten")
    daten = json.loads(koerper) if status == 200 else {}
    experten = daten.get("experten", [])
    namen = [e.get("name") for e in experten]
    ok_experten = status == 200 and len(experten) > 0 and "GEHEIM-MARKE" not in namen
    ergebnisliste(ergebnisse, "Fall3 /api/experten 200 mit Beispielprofilen", ok_experten,
                  f"{status} {namen}")
    ergebnisliste(ergebnisse, "Fall3 /api/experten liest den Profilordner nicht",
                  "GEHEIM-MARKE" not in koerper,
                  "Decoy GEHEIM-MARKE nicht in der Antwort")

    status, _, koerper = anfrage(port, "GET", "/api/status")
    stand = json.loads(koerper) if status == 200 else {}
    ergebnisliste(ergebnisse, "Fall3 /api/status anmeldung false",
                  status == 200 and stand.get("anmeldung") is False,
                  f"{status} anmeldung={stand.get('anmeldung')!r}")

    app.stoppen()


def main() -> int:
    if not BAU.exists():
        print(f"FEHL build fehlt: {BAU} (erst bauen)")
        return 1

    scratch = scratch_bauen()
    harness_port = freier_port(8644)
    harness = http.server.ThreadingHTTPServer(("127.0.0.1", harness_port), Harness)
    threading.Thread(target=harness.serve_forever, daemon=True).start()
    print(f"scratch={scratch}")
    print(f"harness auf 127.0.0.1:{harness_port}")

    ergebnisse: list[tuple[str, bool, str]] = []
    try:
        fall_aktive_tuer(App(scratch, harness_port), ergebnisse)
        fall_erzeugter_token(App(scratch, harness_port), ergebnisse)
        fall_ohne_tuer(App(scratch, harness_port), ergebnisse)
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
