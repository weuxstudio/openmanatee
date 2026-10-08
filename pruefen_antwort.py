"""Prueft, dass die Antwort als Schnittstelle gezeichnet wird, nicht als Textwand.

Drei Faelle am echten Lauf:
  1. Aufzaehlung  -> Zeilen mit Haarlinie statt eines Textblocks
  2. Tabelle      -> echte Tabelle mit Kopfzeile
  3. langer Text  -> zusammengeklappt, aufklappbar

Gemessen wird am DOM (gezeichnete Elemente), nicht am Einrucken der Antwort.

Adresse ueber OPENMANATEE_BASIS oder OPENMANATEE_PORT, Bilder in build/probe (OPENMANATEE_BILDORDNER).
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
# The prompts name the project folder so the model reads real files from there.
LIB = str(WURZEL / "src" / "lib")

faelle = {
    "liste": (
        f"Nenne mir die drei groessten Dateien in {LIB} "
        "mit ihrer Zeilenzahl. Antworte als Aufzaehlung, je Zeile ein Eintrag.",
        "ol.liste",
    ),
    "tabelle": (
        "Antworte ausschliesslich mit einer Markdown-Tabelle mit der Kopfzeile "
        f"Datei | Zeilen | Zweck und drei Datenzeilen zu Dateien aus {LIB}. "
        "Kein Text davor oder danach.",
        "table.tabelle",
    ),
    "lang": (
        "Schreibe einen einzigen zusammenhaengenden Absatz von mindestens 900 Zeichen darueber, "
        "wie ein Vite-Build und der Svelte-Compiler zusammenspielen. Keine Aufzaehlung, keine "
        "Ueberschrift, nur Fliesstext.",
        "p.text.geklappt",
    ),
}

fehler: list[str] = []
ergebnis: dict[str, str] = {}

with sync_playwright() as p:
    try:
        b = p.chromium.launch(channel="chrome", headless=True)
    except Exception:
        b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.on("console", lambda m: fehler.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(f"[seite] {e}"))

    pg.goto(BASIS + "/session/manatee", wait_until="networkidle")
    pg.wait_for_timeout(1500)
    # Frische Sitzung: sonst sammeln sich die Antworten frueherer Prueflaeufe an.
    pg.evaluate("() => localStorage.clear()")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(1500)

    for name, (auftrag, wahl) in faelle.items():
        vorher = pg.locator(wahl).count()
        pg.fill("input", auftrag)
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(2500)  # Zug startet
        for _ in range(1200):
            if pg.evaluate("() => !document.querySelector('.lauf')"):
                break
            pg.wait_for_timeout(300)
        pg.wait_for_timeout(3000)  # Verlauf nachladen
        ergebnis[name] = pg.evaluate(
            """(wahl) => {
                const el = document.querySelector(wahl);
                if (!el) return 'nicht gefunden';
                if (wahl === 'p.text.geklappt') {
                    return 'geklappt: ' + (el.scrollHeight > el.clientHeight + 2);
                }
                return 'da: ' + el.tagName.toLowerCase() + ' ' + el.className;
            }""",
            wahl,
        )
        if name == "liste":
            ergebnis["liste_zeilen"] = str(pg.locator("ol.liste li").count())
            pg.screenshot(path=f"{ORDNER}/antwort-liste.png")
        if name == "tabelle":
            pg.screenshot(path=f"{ORDNER}/antwort-tabelle.png")
        if name == "lang":
            # Aufklappen muss gehen: genau ein Absatz weniger ist zusammengeklappt.
            vorher_lang = pg.locator("p.text.geklappt").count()
            pg.locator("button.mehr").last.click()
            pg.wait_for_timeout(400)
            ergebnis["lang_auf"] = f"vorher {vorher_lang}, jetzt {pg.locator('p.text.geklappt').count()}"
            pg.screenshot(path=f"{ORDNER}/antwort-lang.png")

    b.close()

pruefungen = {
    "Aufzaehlung als Zeilen gezeichnet": ergebnis.get("liste", "").startswith("da: ol"),
    "Aufzaehlung mit mehreren Zeilen": int(ergebnis.get("liste_zeilen", "0") or 0) >= 3,
    "Tabelle als Tabelle gezeichnet": ergebnis.get("tabelle", "").startswith("da: table"),
    "Langer Text zusammengeklappt": "geklappt: true" in ergebnis.get("lang", ""),
    "Langer Text aufklappbar": (
        ergebnis.get("lang_auf", "").startswith("vorher ")
        and (
            int(ergebnis.get("lang_auf", "vorher 0, jetzt 0").split()[1].rstrip(","))
            - int(ergebnis.get("lang_auf", "vorher 0, jetzt 0").split()[3])
            == 1
        )
    ),
    "Keine Konsolenfehler": not fehler,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("messungen:", ergebnis)
print("fehler:", fehler[:5] if fehler else "keine")
sys.exit(0 if all(pruefungen.values()) else 1)
