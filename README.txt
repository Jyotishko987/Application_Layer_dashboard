# Wireside — Application & Transport Layer Protocol Visualizer

**🔗 Live Demo: [jyotishko987.github.io/Application_Layer_dashboard](https://jyotishko987.github.io/Application_Layer_dashboard/)**

![image](screenshot.png)

Wireside is a dual-panel dashboard that lets you perform everyday internet
activities — **Browsing**, **Mail**, and **Streaming** — while watching the
exact protocol messages behind them play out step by step, across three
network layers: **DNS/HTTP/SMTP** (Application), **TCP** (Transport), and
simulated **IP/port/MAC** addressing (Network).

> Everything shown is simulated client-side — no real network traffic is sent.

## What It Does

- **Browsing** → DNS query/response → TCP handshake → HTTP GET request/response → TCP teardown
- **Mail** → DNS MX lookup → TCP handshake → full SMTP conversation (`EHLO`, `MAIL FROM`, `RCPT TO`, `DATA`, `QUIT`) → TCP teardown
- **Streaming** → DNS lookup → TCP handshake → HTTP manifest + video segment requests → TCP teardown

**Application Layer / Transport Layer toggle** — switch between:
- **Both (side-by-side)** — the default; Application and Transport messages fill two synchronized lanes in parallel
- **Application Layer only** — DNS, HTTP, SMTP messages, full width
- **Transport Layer only** — TCP messages, full width

Each TCP step shows real fields: `Flags` (SYN, ACK, FIN...), `Seq`, `Ack`,
`Win` (window size), and `Len` (payload length) — plus direction and a
live **layer-stack diagram** (Application / Transport / Network) that
highlights which layer the current step belongs to.

Also included:
- Simulated IP address, port, and MAC address for every message
- Real-world public IP ranges when you visit well-known sites (Facebook,
  YouTube, Netflix, Wikipedia, GitHub, etc.) via quick-try buttons
- Step forward/back, play, pause, replay controls
- Running audit log and a message-size chart

## Tech Stack

Plain **HTML / CSS / JavaScript** — no framework, no backend, no build step,
no external dependencies.

## Project Structure

```
wireside/
├── index.html      # Page markup (sidebar, activity panel, protocol visualizer)
├── style.css       # All styling
├── script.js       # Scenario builders, TCP handshake/teardown, playback engine
├── screenshot.png  # Dashboard screenshot (shown above)
└── README.md       # This file
```

## Run Locally

> Want to try it without downloading anything? Use the [live demo](https://jyotishko987.github.io/Application_Layer_dashboard/) above.

Just double-click `index.html` — it opens in your browser, no install needed.

**Or** serve it locally:
```bash
python3 -m http.server 8000
```
Then open http://localhost:8000

## Deploy on GitHub Pages

1. Create a new GitHub repository and upload `index.html`, `style.css`,
   `script.js`, `screenshot.png`, and `README.md` (drag-and-drop via
   **Add file → Upload files**).
2. Go to **Settings → Pages** → Source: **Deploy from a branch** → branch
   `main`, folder `/ (root)` → **Save**.
3. Your live link appears there in ~1 minute:
   `https://<your-username>.github.io/<repo-name>/`

## What We've Built (Summary of Changes)

**Application Layer Dashboard**
1. Dual-panel dashboard simulating DNS/HTTP/SMTP for Browsing, Mail, and Streaming.
2. Split into `index.html` / `style.css` / `script.js`.
3. Added simulated **IP / port / MAC addressing** to every protocol message.
4. Removed unused decorative sidebar icons and dead CSS, removed Three.js
   for a lightweight CSS gradient background.
5. Added a **real-world IP lookup table** for well-known sites (Facebook,
   YouTube, Netflix, Wikipedia, GitHub) with quick-try buttons.

**Transport Layer Extension**
6. Added the **TCP transport layer**: a 3-way handshake (`SYN` → `SYN,ACK` →
   `ACK`) before every connection, and a 4-way teardown (`FIN,ACK` → `ACK` →
   `FIN,ACK` → `ACK`) after it, for all three activities.
7. Added `Seq`, `Ack`, `Win` (window size), and `Len` (payload length)
   fields to every TCP step.
8. Added an **Application Layer / Transport Layer toggle** with a
   side-by-side synchronized view, so both layers update in parallel as you
   step through or play an activity.
9. Added a **live layer-stack diagram** (Application / Transport / Network)
   that highlights the active layer in sync with playback.

## Built With

Developed with substantial assistance from **Claude (Anthropic)**.
