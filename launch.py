#!/opt/homebrew/bin/python3
"""Tkinter desktop launcher for Jasus Viz AI Lib."""

import os
import signal
import subprocess
import sys
import threading
import time
import tkinter as tk
import webbrowser
from pathlib import Path
from tkinter import font as tkfont

ROOT         = Path(__file__).parent
PID_FILE     = ROOT / ".launcher_pids"
PYENV_PYTHON = "/Users/suhas/.pyenv/versions/3.13.5/bin/python3"

BACKEND_CMD  = [PYENV_PYTHON, "-m", "uvicorn", "src.api:app", "--reload", "--port", "8000"]
FRONTEND_CMD = ["npm", "start"]
BACKEND_URL  = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

# ── colours ──────────────────────────────────────────────────────────────────
BG       = "#0f1117"
CARD     = "#1a1d27"
BORDER   = "#2d3148"
ACCENT   = "#6c63ff"
GREEN    = "#22c55e"
RED      = "#ef4444"
TEXT     = "#e2e8f0"
MUTED    = "#64748b"
BTN_DARK = "#1e293b"

# ── process helpers ───────────────────────────────────────────────────────────

def save_pids(bp, fp):
    PID_FILE.write_text(f"{bp}\n{fp}\n")

def load_pids():
    if not PID_FILE.exists():
        return None, None
    try:
        parts = PID_FILE.read_text().strip().splitlines()
        return int(parts[0]), int(parts[1])
    except Exception:
        return None, None

def is_running(pid):
    if pid is None:
        return False
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False

def kill_pid(pid):
    if not (pid and is_running(pid)):
        return
    try:
        os.kill(pid, signal.SIGTERM)
        time.sleep(1)
        if is_running(pid):
            os.kill(pid, signal.SIGKILL)
    except Exception:
        pass

# ── GUI ───────────────────────────────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Jasus Viz AI — Launcher")
        self.resizable(False, False)
        self.configure(bg=BG)
        w, h = 480, 520
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{w}x{h}+{(sw-w)//2}+{(sh-h)//2}")
        self._build()
        self._tick()

    # ── build ─────────────────────────────────────────────────────────────────

    def _build(self):
        # header
        hdr = tk.Frame(self, bg=BG)
        hdr.pack(fill="x", padx=24, pady=(28, 0))
        tk.Label(hdr, text="Jasus Viz AI", bg=BG, fg=TEXT,
                 font=("SF Pro Display", 22, "bold")).pack(anchor="w")
        tk.Label(hdr, text="Development Launcher", bg=BG, fg=MUTED,
                 font=("SF Pro Text", 12)).pack(anchor="w", pady=(2, 0))

        self._hr(pady=(20, 4))

        # service cards
        self._dot_b = self._service_card("Backend API",  "FastAPI · port 8000", BACKEND_URL)
        self._dot_f = self._service_card("Frontend App", "React · port 3000",   FRONTEND_URL)

        self._hr(pady=(16, 0))

        # action buttons
        row = tk.Frame(self, bg=BG)
        row.pack(fill="x", padx=24, pady=(16, 0))
        self._btn_start   = self._btn(row, "▶  Start",   ACCENT,    self._start)
        self._btn_stop    = self._btn(row, "■  Stop",    BTN_DARK,  self._stop)
        self._btn_restart = self._btn(row, "↺  Restart", BTN_DARK,  self._restart)
        for b in (self._btn_start, self._btn_stop, self._btn_restart):
            b.pack(side="left", expand=True, fill="x", padx=(0, 6))
        self._btn_restart.pack_configure(padx=0)

        # link buttons
        lrow = tk.Frame(self, bg=BG)
        lrow.pack(fill="x", padx=24, pady=(10, 0))
        self._link(lrow, "Open Frontend ↗", FRONTEND_URL).pack(side="left", expand=True, fill="x", padx=(0, 6))
        self._link(lrow, "Open API Docs ↗", BACKEND_URL + "/docs").pack(side="left", expand=True, fill="x")

        self._hr(pady=(16, 0))

        # log
        log_frame = tk.Frame(self, bg=CARD, highlightthickness=1, highlightbackground=BORDER)
        log_frame.pack(fill="both", expand=True, padx=24, pady=(12, 24))
        self._log_box = tk.Text(
            log_frame, bg=CARD, fg="#94a3b8", insertbackground=TEXT,
            font=("Menlo", 11), relief="flat", bd=0, padx=12, pady=10,
            wrap="word", state="disabled", height=7,
        )
        self._log_box.pack(fill="both", expand=True)
        self._log("Launcher ready.")

    def _hr(self, pady=(8, 0)):
        tk.Frame(self, bg=BORDER, height=1).pack(fill="x", padx=24, pady=pady)

    def _service_card(self, name, subtitle, url):
        card = tk.Frame(self, bg=CARD, highlightthickness=1, highlightbackground=BORDER)
        card.pack(fill="x", padx=24, pady=(12, 0))
        inner = tk.Frame(card, bg=CARD)
        inner.pack(fill="x", padx=16, pady=12)
        dot = tk.Label(inner, text="●", bg=CARD, fg=MUTED, font=("SF Pro Text", 16))
        dot.pack(side="left", padx=(0, 12))
        info = tk.Frame(inner, bg=CARD)
        info.pack(side="left", fill="x", expand=True)
        tk.Label(info, text=name,     bg=CARD, fg=TEXT,  font=("SF Pro Text", 13, "bold")).pack(anchor="w")
        tk.Label(info, text=subtitle, bg=CARD, fg=MUTED, font=("SF Pro Text", 10)).pack(anchor="w")
        lbl = tk.Label(inner, text=url, bg=CARD, fg=ACCENT, font=("Menlo", 10), cursor="hand2")
        lbl.pack(side="right")
        lbl.bind("<Button-1>", lambda e, u=url: webbrowser.open(u))
        return dot

    def _btn(self, parent, text, bg, cmd):
        return tk.Button(parent, text=text, bg=bg, fg="black",
                         activebackground=BORDER, activeforeground="black",
                         relief="flat", bd=0, pady=10,
                         font=("SF Pro Text", 12, "bold"), cursor="hand2",
                         command=cmd)

    def _link(self, parent, text, url):
        return tk.Button(parent, text=text, bg=CARD, fg=ACCENT,
                         activebackground=BORDER, activeforeground=ACCENT,
                         relief="flat", bd=0, pady=8,
                         font=("SF Pro Text", 11), cursor="hand2",
                         highlightthickness=1, highlightbackground=BORDER,
                         command=lambda: webbrowser.open(url))

    # ── log ──────────────────────────────────────────────────────────────────

    def _log(self, msg):
        ts = time.strftime("%H:%M:%S")
        self._log_box.configure(state="normal")
        self._log_box.insert("end", f"[{ts}]  {msg}\n")
        self._log_box.see("end")
        self._log_box.configure(state="disabled")

    # ── status polling ────────────────────────────────────────────────────────

    def _tick(self):
        bp, fp = load_pids()
        self._dot_b.configure(fg=GREEN if is_running(bp) else RED)
        self._dot_f.configure(fg=GREEN if is_running(fp) else RED)
        self.after(2000, self._tick)

    # ── actions ───────────────────────────────────────────────────────────────

    def _set_btns(self, enabled):
        s = "normal" if enabled else "disabled"
        self.after(0, lambda: [b.configure(state=s)
                               for b in (self._btn_start, self._btn_stop, self._btn_restart)])

    def _in_thread(self, fn):
        threading.Thread(target=fn, daemon=True).start()

    def _start(self):   self._in_thread(self._do_start)
    def _stop(self):    self._in_thread(self._do_stop)
    def _restart(self): self._in_thread(self._do_restart)

    def _do_start(self):
        bp, fp = load_pids()
        if is_running(bp) or is_running(fp):
            self.after(0, lambda: self._log("Services already running."))
            return
        self._set_btns(False)
        self.after(0, lambda: self._log("Starting backend…"))
        backend = subprocess.Popen(BACKEND_CMD, cwd=ROOT,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.after(0, lambda: self._log("Starting frontend…"))
        frontend = subprocess.Popen(FRONTEND_CMD, cwd=ROOT / "frontend",
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        save_pids(backend.pid, frontend.pid)
        time.sleep(2)
        self.after(0, lambda: self._log(f"Backend  → {BACKEND_URL}"))
        self.after(0, lambda: self._log(f"Frontend → {FRONTEND_URL}"))
        self.after(0, lambda: self._log("All services started."))
        self._set_btns(True)

    def _do_stop(self):
        bp, fp = load_pids()
        if not is_running(bp) and not is_running(fp):
            self.after(0, lambda: self._log("No running services."))
            return
        self._set_btns(False)
        if is_running(bp):
            self.after(0, lambda: self._log(f"Stopping backend  (PID {bp})…"))
            kill_pid(bp)
        if is_running(fp):
            self.after(0, lambda: self._log(f"Stopping frontend (PID {fp})…"))
            kill_pid(fp)
        if PID_FILE.exists():
            PID_FILE.unlink()
        self.after(0, lambda: self._log("All services stopped."))
        self._set_btns(True)

    def _do_restart(self):
        self._do_stop()
        time.sleep(1)
        self._do_start()


if __name__ == "__main__":
    App().mainloop()
