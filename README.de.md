# OpenManatee-App

> Fruehere deutsche Fassung. Die aktuelle Anleitung steht auf Englisch in [README.md](README.md).

Ein eigener Client auf das Hermes-Harness: Chat mit einem Agenten, der nicht nur Text zurueckgibt,
sondern die Oberflaeche mitbestimmt.

Die App ist ein duenner Client. Sie rechnet nicht selbst, sie fragt den Server und zeigt, was
zurueckkommt. Zugangsdaten liegen ausschliesslich serverseitig. Der Stil kommt aus der Vorlage:
heller Grund, weisse Flaechen, ein gelber Akzent, Agenten als gezeichnete Figuren mit Visier,
unterschieden in Form und Farbe.

## Was die App auszeichnet

**Antworten sind Schnittstellen, keine Textwaende.** Der Text des Modells wird in Bloecke zerlegt und
je nach Form gezeichnet: Aufzaehlungen als Zeilen mit Haarlinie, Tabellen als echte Tabellen, lange
Absaetze zusammengeklappt mit "Alles zeigen".

**Bausteinkatalog.** Das Modell darf zusaetzlich einen Baustein schicken, dann zeichnet die App eine
ganze Ansicht daraus. Elf Bausteine stehen bereit: `liste`, `tabelle`, `kennzahl`, `zeitleiste`,
`schritte`, `kalender`, `ort`, `datei`, `verweis`, `fortschritt`, `frage`. Alles Fremde faellt durch
die Pruefung und wird als Text gezeigt. Es kann also nichts kaputtgehen, wenn das Modell sich nicht
an die Form haelt. Beispiele fuer Bausteine in Markdown-Bloecken sind unten.

**Werkzeugzeile in Klartext.** Sichtbar ist immer nur der aktuelle Schritt in Menschensprache:
"Liest werkzeug.ts", "Wartet kurz", "Sucht Datum und Uhrzeit". Der naechste Schritt tritt an dieselbe
Stelle. Der vollstaendige Verlauf geht auf Klick auf, mit Aufruf, Argumenten und echter Ausgabe.

**Die Figur lebt.** Sie atmet, blinzelt und wird wacher, waehrend gearbeitet wird.

**Ehrliche Anzeigen.** Kein erfundener Fortschritt: der Server meldet keinen Anteil, deshalb zeigt
die Sitzung verstrichene Zeit, Zahl der Schritte und einen unbestimmten Balken.

## Aufbau

    src/lib/antwort.ts          Antwort in Bloecke zerlegen
    src/lib/Antwort.svelte      Bloecke zeichnen (Liste, Tabelle, Absatz, Kasten)
    src/lib/bausteine.ts        Katalog samt Pruefung und Modellauftrag
    src/lib/Baustein.svelte     Bausteine zeichnen
    src/lib/werkzeug.ts         Werkzeugaufrufe und Befehle in Saetze uebersetzen
    src/lib/sitzung.svelte.ts   Zustand, Ereignisstrom, Verlauf nachladen
    src/lib/api.ts              Zugang zum Hermes-Server
    src/lib/werte.ts            Rollen, Formen, Farben, Aktionen
    src/lib/Figur.svelte        Figur einer Rolle, aus Form und Farbe gebaut
    src/lib/Icon.svelte         Strichsymbole, ein Satz, eine Strichstaerke
    src/lib/Werkzeugliste.svelte  Werkzeugzeile, aktueller Schritt und Verlauf
    src/lib/Freigabe.svelte     Freigabekarte mit drei Entscheidungen
    src/routes/session/[id]/    Sitzung mit Lauf, Bausteinen und Freigabe
    src/routes/agenten/         Rollen
    src/routes/aufgaben/        Aufgaben vom Kanban
    src/routes/ablage/          Dateien
    src/routes/api/...          Schleuse zum Harness, hier liegt der Schluessel

## Baustein schicken

Das Modell schickt einen Codeblock mit der Sprache `manatee` und darin JSON:

    ```manatee
    {"art":"kennzahl","titel":"Projekt","werte":[{"marke":"Dateien","wert":"42"}]}
    ```

Den Auftrag dazu bekommt es bei jeder Anfrage als `instructions` mitgeschickt, er steht in
`bausteine.ts` als `KATALOG_AUFTRAG` und landet nicht im Verlauf.

## Pruefungen

Die Pruefskripte messen am echten Lauf im Browser, nicht am geschriebenen Code:

    python pruefen_werkzeug.py    Werkzeugzeile, Klartext, Verlauf, Figur, Laufanzeige
    python pruefen_antwort.py     Aufzaehlung, Tabelle, zusammengeklappter Absatz
    python pruefen_bausteine.py   Katalog am echten Modell, samt Rueckfall und Fremdinhalt
    python pruefen_board.py       Aufgaben vom Kanban
    python pruefen_agenten.py     Agenten aus den Profilen

## Starten

    pnpm install
    pnpm dev            # http://127.0.0.1:5173, im Tailnet ueber tailscale serve

## Zugang zum Hermes-Server

Der Browser spricht nie direkt mit dem Harness und bekommt auch keinen Schluessel zu sehen. Alles
laeuft ueber die eigenen Serverrouten der App: `/api/status` meldet, ob ein Schluessel gesetzt ist,
`/api/hermes/<weg>` reicht an den Harness weiter, Ereignisstroeme unveraendert.

In `.env` (nicht im Git):

    HERMES_BASIS=http://127.0.0.1:8642
    HERMES_KEY=<der Schluessel aus API_SERVER_KEY>

Auf der Hermes-Seite muss dafuer in `~/.hermes/.env` stehen:

    API_SERVER_ENABLED=true
    API_SERVER_KEY=<derselbe Schluessel>

Der Schluessel gehoert nicht in eine `PUBLIC_`-Variable. Wer ihn im Browser liest, hat vollen
Zugriff auf die Werkzeuge des Harness, das Terminal eingeschlossen.

Ohne Schluessel laeuft dieselbe Oberflaeche mit Musterdaten, damit alles bedienbar und pruefbar
bleibt.

    pnpm build          # adapter-node, Ergebnis in build/
    pnpm start          # node --env-file=.env build/index.js, liest .env selbst
    node build/index.js # ohne .env-Datei; Werte ueber die Umgebung setzen

## Was echt ist und was offen

Echt: der Chat gegen das Harness samt Ereignisstrom, Werkzeugzeilen in Klartext mit Verlauf,
Antwortdarstellung, Bausteinkatalog, Sitzung nach Neuladen aus dem Verlauf, Figuren, Rollen,
Aufgaben vom Kanban, Agenten aus den Profilen, Freigabekarte mit drei Entscheidungen,
Zugangstuer mit Token und signiertem Cookie.

Offen: Der Harness nimmt keine Dateiuploads ueber diese Schnittstelle, nur Bilder
inline. Ein Neustart des Gateway setzt einen laufenden Auftrag auf unterbrochen, das gehoert sichtbar
auf den Schirm. Die Vorschlaege unter der Sitzung sind noch Muster.
