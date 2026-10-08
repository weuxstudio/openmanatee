"""Ersatz-Server fuer die Probe: spricht denselben Vertrag wie der Harness.

POST /api/sessions                     -> {"id": ...}
POST /api/sessions/{id}/chat/stream    -> Ereignisstrom (SSE) mit Lebenszeichen,
                                          assistant.delta, tool.started, tool.completed,
                                          run.completed
GET  /api/sessions                     -> Liste
So laesst sich der echte Weg pruefen, ohne den Hermes-API-Server einzuschalten.
"""
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8643


def sse(name: str, daten: dict) -> bytes:
    return f"event: {name}\ndata: {json.dumps(daten)}\n\n".encode()


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass

    def _json(self, daten: dict, status: int = 200) -> None:
        roh = json.dumps(daten).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(roh)))
        self.end_headers()
        self.wfile.write(roh)

    def do_GET(self):
        print(f"PROBE GET {self.path} auth={self.headers.get('Authorization')!r}", flush=True)
        if self.path.startswith("/api/sessions"):
            self._json({"sessions": [{"id": "stub-sitzung", "titel": "Aus dem Ersatz-Server"}]})
            return
        self._json({"fehler": "unbekannter Weg", "pfad": self.path}, status=404)

    def do_POST(self):
        laenge = int(self.headers.get("Content-Length") or 0)
        koerper = self.rfile.read(laenge).decode() if laenge else ""
        print(f"PROBE POST {self.path} auth={self.headers.get('Authorization')!r} "
              f"body={koerper!r}", flush=True)

        if self.path == "/api/sessions":
            self._json({"id": "stub-sitzung"})
            return

        if self.path.endswith("/chat/stream"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            folge = [
                b": keepalive\n\n",
                sse("assistant.delta", {"text": "Ich sehe zwei "}),
                sse("assistant.delta", {"text": "offene Punkte."}),
                sse(
                    "tool.started",
                    {"tool": "read_file", "arguments": {"path": "documents/kapitel-2.md"}},
                ),
                sse("tool.completed", {"tool": "read_file", "duration_ms": 420}),
                sse(
                    "tool.started",
                    {"tool": "write_file", "arguments": {"path": "documents/entwurf.md"}},
                ),
                sse("tool.completed", {"tool": "write_file", "duration_ms": 1180}),
                sse("assistant.delta", {"text": " Ich habe den Entwurf angelegt."}),
                sse("run.completed", {"status": "completed"}),
            ]
            for stueck in folge:
                try:
                    self.wfile.write(stueck)
                    self.wfile.flush()
                except BrokenPipeError:
                    return
                time.sleep(0.25)
            return

        if "/approval" in self.path:
            self._json({"entschieden": True})
            return

        self._json({"fehler": "unbekannter Weg", "pfad": self.path}, status=404)


ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
