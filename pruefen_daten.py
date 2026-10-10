"""Prueft die beiden neuen Seiten gegen einen echten Lauf und legt Bilder ab.

Geprueft wird, was auf dem Schirm steht: dass die Routinen aus einer Liste
kommen und nicht aus dem Quelltext, dass die Ablage Dateien oder einen klaren
Hinweis zeigt, und dass die Vorschlaege unter der Sitzung nichts behaupten.

English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT, images in
build/probe (OPENMANATEE_BILDORDNER). With OPENMANATEE_TOKEN set the script logs
in first, which is needed whenever the copy under test has a door.
"""
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

WURZEL = Path(__file__).resolve().parent
PORT = os.environ.get("OPENMANATEE_PORT", "5173")
BASIS = os.environ.get("OPENMANATEE_BASIS", "http://127.0.0.1:" + PORT)
TOKEN = os.environ.get("OPENMANATEE_TOKEN", "")
ORDNER = Path(os.environ.get("OPENMANATEE_BILDORDNER", str(WURZEL / "build" / "probe")))
ORDNER.mkdir(parents=True, exist_ok=True)

fehler: list[str] = []
seiten: dict[str, str] = {}

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    if TOKEN:
        pg.goto(BASIS + "/anmelden", wait_until="networkidle")
        if pg.locator('input[name="token"]').count():
            pg.fill('input[name="token"]', TOKEN)
            pg.press('input[name="token"]', "Enter")
            pg.wait_for_timeout(1500)

    for weg, bild in (("/aufgaben", "app-aufgaben-daten.png"), ("/ablage", "app-ablage-daten.png"),
                      ("/session/manatee", "app-sitzung-vorschlaege.png")):
        pg.goto(BASIS + weg, wait_until="networkidle")
        pg.wait_for_timeout(2200)
        seiten[weg] = pg.inner_text("body")
        pg.screenshot(path=str(ORDNER / bild))
    b.close()

aufgaben = seiten["/aufgaben"]
ablage = seiten["/ablage"]
sitzung = seiten["/session/manatee"]

# "14 Routinen, 10 aktiv, 4 pausiert" oder "3 Routinen, alle aktiv"
zahl = re.search(r"(\d+) Routinen", aufgaben)
zeitplaene = ("taeglich", "jeden Tag", "montags", "dienstags", "mittwochs", "donnerstags",
              "freitags", "samstags", "sonntags", "alle ", "jede Minute")

pruefungen = {
    "Routinen-Abschnitt vorhanden": "Routinen" in aufgaben,
    "Routinen mit Anzahl": zahl is not None,
    "Routinen mit Zeitplan in Worten": any(t in aufgaben for t in zeitplaene),
    "Routinen mit Zustand": "aktiv" in aufgaben or "pausiert" in aufgaben,
    "kein Fehler bei den Routinen": "nicht lesbar" not in aufgaben,
    "Ablage ohne Beispielhinweis oder mit klarem Hinweis": (
        "Beispielinhalt" not in ablage
    ) or ("keinem echten Ordner" in ablage),
    "Ablage mit Eintrag oder Ordnerhinweis": (
        "KB" in ablage or "Ordner" in ablage or "Kein Ordner gesetzt" in ablage
    ),
    "kein Fehler bei der Ablage": "nicht lesbar" not in ablage,
    "Vorschlaege ohne erfundene Zusage": "Zeig meinen Kalender" not in sitzung
    and "Sortiere meine Mails" not in sitzung,
    "keine Konsolenfehler": not fehler,
}

for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
if fehler:
    for f in fehler[:5]:
        print("     ", f)
angezeigt = re.search(r"(\d+) Routinen", aufgaben)
print(f"\nRoutinen laut Seite: {angezeigt.group(1) if angezeigt else 'keine'}")
print(f"Bilder in {ORDNER}")
