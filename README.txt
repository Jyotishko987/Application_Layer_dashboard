# Wireside — Application Layer Activity & Protocol Visualizer

🔗 **Live Demo:** [jyotishko987.github.io/Application_Layer_dashboard](https://jyotishko987.github.io/Application_Layer_dashboard)

![image alt](https://github.com/Jyotishko987/Application_Layer_dashboard/blob/11e0aa259af95486f344c9d5d74071742ae2ca72/screenshot.jpeg)

Wireside is a dual-panel dashboard that lets you perform everyday internet activities — **Browsing**, **Mail**, and **Streaming** — while watching the exact protocol messages behind them play out step by step, across three network layers: **DNS/HTTP/SMTP** (Application), **TCP** (Transport), and simulated **IP/port/MAC** addressing (Network).

> Everything shown is simulated client-side — no real network traffic is sent.

## What It Does

- **Browsing** → DNS query/response → TCP handshake → HTTP GET request/response → TCP teardown
- **Mail** → DNS MX lookup → TCP handshake → full SMTP conversation (`EHLO`, `MAIL FROM`, `RCPT TO`, `DATA`, `QUIT`) → TCP teardown
- **Streaming** → DNS lookup → TCP handshake → HTTP manifest + video segment requests → TCP teardown

Each message shows:

- Direction (client → server / server → client)
- Simulated IP address, port, and MAC address for both endpoints
- A live **layer-stack diagram** (Application / Transport / Network) that highlights which layer the current step belongs to
- Real-world public IP ranges when you visit well-known sites (Facebook, YouTube, Netflix, Wikipedia, GitHub, etc.) via quick-try buttons

Playback controls: step forward/back, play, pause, replay — plus a running audit log and a message-size chart.

## Tech Stack

Plain **HTML / CSS / JavaScript** — no framework, no backend, no build step, no external dependencies.

## Project Structure

```
Application_Layer_dashboard/
├── .github/workflows/static.yml   # GitHub Pages deployment
├── assets/screenshot.jpeg         # Screenshot used in this README
├── index.html                     # Page markup (sidebar, activity panel, protocol visualizer)
├── style.css                      # All styling
├── script.js                      # Scenario builders, TCP handshake/teardown, playback engine
└── README.md                      # This file
```

## Run Locally

Want to try it without downloading anything? Use the live demo above.

Just double-click `index.html` — it opens in your browser, no install needed.

Or serve it locally:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploy on GitHub Pages

This repo includes a GitHub Actions workflow that deploys the site on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**.

Alternatively, deploy straight from a branch: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)` → Save**. Your live link appears in about a minute: `https://<your-username>.github.io/<repo-name>/`

## What We've Built (Summary of Changes)

1. Started from a single self-contained HTML dashboard simulating DNS/HTTP/SMTP for Browsing, Mail, and Streaming.
2. Split it into `index.html` / `style.css` / `script.js`.
3. Added simulated IP / port / MAC addressing to every protocol message.
4. Removed unused decorative sidebar icons and their dead CSS.
5. Removed Three.js entirely — replaced the 3D background with a lightweight CSS gradient.
6. Added a real-world IP lookup table so visiting known sites (Facebook, YouTube, Netflix, Wikipedia, GitHub) resolves to that company's actual public IP range, plus quick-try buttons to test them instantly.
7. Added the TCP transport layer: a 3-way handshake (`SYN` → `SYN,ACK` → `ACK`) before every connection, and a 4-way teardown (`FIN,ACK` → `ACK` → `FIN,ACK` → `ACK`) after it, for all three activities.
8. Added a live layer-stack diagram (Application / Transport / Network) that highlights the active layer in sync with playback.

## Built With

Developed with substantial assistance from [Claude](https://claude.ai) (Anthropic).
