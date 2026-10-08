"""Prueft die Werkzeugzeile und die Figur am echten Lauf.

Geprueft wird: sichtbar ist immer nur der aktuelle Schritt in Menschensprache, der naechste
Schritt tritt an seine Stelle, der Verlauf geht auf Klick auf und ist vollstaendig (Argumente
und echte Ausgabe), Bewegung des Symbols, Leben der Figur, Laufanzeige, Verlauf nach Neuladen.

Der Auftrag loest drei Schritte aus, zuletzt einen langsamen (Terminal mit sleep), sonst ist der
laufende Zustand vorbei, bevor er gemessen werden kann.

English: base URL via OPENMANATEE_BASIS or OPENMANATEE_PORT, images in build/probe
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
DATEI = str(WURZEL / "src" / "lib" / "werkzeug.ts")
AUFTRAG = (
    'Fuehre im Terminal den Befehl date "+%Y-%m-%d" aus, lies danach die Datei '
    f"{DATEI} und fuehre zum Schluss im Terminal den Befehl sleep 5 aus. "
    "Danach fuehre im Terminal noch den Befehl sw_vers -productVersion aus. "
    "Antworte am Ende mit dem Wort fertig."
)

fehler: list[str] = []
symbol_bewegung = "kein laufendes Symbol gefunden"
figur_wache = ""
lauftext = ""
laufzeile = ""

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
    pg.fill("input", AUFTRAG)
    pg.keyboard.press("Enter")

    # Waehrend des Laufs: Bewegung, Figur, Laufanzeige.
    pg.wait_for_selector("button.jetzt", timeout=150_000)
    for _ in range(900):
        stand = pg.evaluate(
            """() => {
                const el = document.querySelector('.jetzt .symbol.an');
                const leib = document.querySelector('.leib');
                if (!el) return null;
                return {
                    name: getComputedStyle(el).animationName,
                    zeile: (document.querySelector('.jetzt') || {}).innerText || '',
                    figur: leib ? getComputedStyle(leib).animationName + '|' + getComputedStyle(leib).animationDuration : '',
                    lauf: (document.querySelector('.lauf-text') || {}).innerText || ''
                };
            }"""
        )
        if stand:
            symbol_bewegung = stand["name"] or "none"
            lauftext = (stand["zeile"] or "").replace("\n", " ").strip()
            figur_wache = stand["figur"] or ""
            laufzeile = (stand["lauf"] or "").replace("\n", " ").strip()
            pg.screenshot(path=f"{ORDNER}/werkzeug-laeuft.png")
            if symbol_bewegung != "none":
                break
        pg.wait_for_timeout(200)

    # Auf das Ende des Zuges warten: nicht auf fehlende Symbole (die Luecke zwischen zwei
    # Schritten sieht genauso aus), sondern auf das Verschwinden der Laufanzeige.
    for _ in range(1200):
        if pg.evaluate("() => !document.querySelector('.lauf')"):
            break
        pg.wait_for_timeout(300)
    pg.wait_for_timeout(2200)

    # Zugeklappt: nur der aktuelle Schritt, nichts vom Verlauf.
    text_zu = pg.inner_text("body")
    sichtbare_zeile = pg.inner_text("button.jetzt").replace("\n", " ")
    sicht_satz = pg.eval_on_selector("button.jetzt .satz", "e => e.innerText.trim()")
    zeilen_zu = pg.locator("button.kopfzeile").count()
    pg.screenshot(path=f"{ORDNER}/werkzeug-zu.png")

    figur_ruhe = pg.evaluate(
        """() => {
            const leib = document.querySelector('.leib');
            const augen = document.querySelector('.augen');
            return (leib ? getComputedStyle(leib).animationName : 'kein leib') + '|' +
                   (augen ? getComputedStyle(augen).animationName : 'keine augen');
        }"""
    )

    # Verlauf aufklappen, dann jeden Schritt einzeln.
    pg.locator("button.jetzt").click()
    pg.wait_for_timeout(600)
    text_verlauf = pg.inner_text("body")
    zeilen = pg.locator("button.kopfzeile").count()
    saetze = pg.eval_on_selector_all(
        "button.kopfzeile .satz", "els => els.map(e => e.innerText.trim())"
    )
    gesammelt = []
    for i in range(zeilen):
        pg.locator("button.kopfzeile").nth(i).click()
        pg.wait_for_timeout(220)
        gesammelt.append(pg.inner_text("body"))
    text_auf = "\n".join(gesammelt)
    pg.screenshot(path=f"{ORDNER}/werkzeug-auf.png")

    # Verlauf wieder zu.
    pg.locator("button.jetzt").click()
    pg.wait_for_timeout(500)
    text_wieder_zu = pg.inner_text("body")
    zeilen_wieder_zu = pg.locator("button.kopfzeile").count()

    # Neu laden: der aktuelle Schritt und der ganze Verlauf muessen wieder da sein.
    pg.wait_for_timeout(2500)
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(4500)
    text_neu = pg.inner_text("body")
    zeile_neu = pg.inner_text("button.jetzt").replace("\n", " ")
    zeile_neu_satz = pg.eval_on_selector("button.jetzt .satz", "e => e.innerText.trim()")
    pg.locator("button.jetzt").click()
    pg.wait_for_timeout(600)
    zeilen_neu = pg.locator("button.kopfzeile").count()
    saetze_neu = pg.eval_on_selector_all(
        "button.kopfzeile .satz", "els => els.map(e => e.innerText.trim())"
    )
    for i in range(zeilen_neu):
        pg.locator("button.kopfzeile").nth(i).click()
        pg.wait_for_timeout(200)
    text_neu_auf = pg.inner_text("body")
    pg.screenshot(path=f"{ORDNER}/werkzeug-nach-neuladen.png")
    b.close()

pruefungen = {
    "Sichtbar nur der aktuelle Schritt": bool(saetze) and saetze.count(sicht_satz) == 1 and saetze[-1] == sicht_satz,
    "Verlauf zugeklappt verborgen": zeilen_zu == 0,
    "Klartext in Menschensprache": any(w in sichtbare_zeile for w in ("Arbeitet", "Wartet", "Liest", "Sucht", "Holt")),
    "Kein Rohbefehl in der sichtbaren Zeile": ("Fuehrt aus" not in sichtbare_zeile) and ("Führt aus" not in sichtbare_zeile) and ("sw_vers" not in sichtbare_zeile),
    "Unbekannter Befehl bleibt verstaendlich": ("Arbeitet am Rechner" in saetze) and not any(s.startswith(("Führt aus", "Fuehrt aus")) for s in saetze),
    "Befehl als Absicht uebersetzt": "Sucht Datum und Uhrzeit" in text_verlauf,
    "Rohbefehl steht im Verlauf": "sw_vers" in text_auf,
    "Zustand arbeitet": "arbeitet" in lauftext,
    "Symbol bewegt sich beim Arbeiten": symbol_bewegung not in ("none", "", "kein laufendes Symbol gefunden"),
    "Figur wird beim Arbeiten wacher": figur_wache.endswith("|1.2s"),
    "Figur lebt auch in Ruhe": "atmet" in figur_ruhe and "blinzelt" in figur_ruhe,
    "Laufanzeige mit Zeit und Schritten": ("Schritt" in laufzeile or "Denkt" in laufzeile) and " s" in laufzeile,
    "Verlauf auf Klick mit allen Schritten": zeilen >= 3,
    "Details tragen Argumente": "Argumente" in text_auf,
    "Details vollstaendig, kein Ausschnitt": DATEI in text_auf,
    "Verlauf wieder zuklappbar": zeilen_wieder_zu == 0,
    "Nach Neuladen aktueller Schritt da": bool(saetze_neu) and zeile_neu_satz == saetze_neu[-1],
    "Nach Neuladen echte Ausgabe": ("Ausgabe" in text_neu_auf) and ("exit_code" in text_neu_auf),
    "Nach Neuladen Verlauf vollstaendig": "Sucht Datum und Uhrzeit" in text_neu_auf,
}
for name, ok in pruefungen.items():
    print(f"{'ok  ' if ok else 'FEHL'} {name}")
print("sichtbare zeile:", sichtbare_zeile[:80])
print("symbol-bewegung:", symbol_bewegung)
print("figur waehrend arbeit:", figur_wache)
print("figur in ruhe:", figur_ruhe)
print("laufanzeige:", laufzeile)
print("zeile waehrend des laufs:", lauftext[:80])
print("schritte im verlauf:", zeilen)
print("fehler:", fehler[:5] if fehler else "keine")
sys.exit(0 if all(pruefungen.values()) and not fehler else 1)
