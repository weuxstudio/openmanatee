"""Prueft die Aufgabenseite gegen das echte Board und legt ein Bildschirmfoto ab.

English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT, image in build/probe
(OPENMANATEE_BILDORDNER).
"""
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent
PORT = os.environ.get("OPENMANATEE_PORT", "5173")
BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + PORT)
ORDNER = Path(os.environ.get("OPENMANATEE_BILDORDNER", str(WURZEL / "build" / "probe")))
ORDNER.mkdir(parents=True, exist_ok=True)
ZIEL = str(ORDNER / "app-board.png")
fehler: list[str] = []

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    pg.goto(BASIS + "/aufgaben", wait_until="networkidle")
    pg.wait_for_timeout(2500)
    text = pg.inner_text("body")
    pg.screenshot(path=ZIEL)
    b.close()

pruefungen = {
    "Abholaufgabe sichtbar": "Tailscale Serve" in text,
    "Pruefaufgabe sichtbar": "Kurzfassung" in text,
    "Rolle recherche": "recherche" in text,
    "Rolle ordnung": "ordnung" in text,
    "Zustand fertig": "fertig" in text,
    "kein Musterhinweis": "Musterdaten" not in text,
    "kein Boardfehler": "nicht lesbar" not in text,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("fehler:", fehler[:5] if fehler else "keine")
print("bild:", ZIEL)
sys.exit(0 if all(pruefungen.values()) and not fehler else 1)
