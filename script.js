/* ---------------------------------------------------------------
   STATE
--------------------------------------------------------------- */
let mode = 'browse';
let steps = [];
let stepIndex = -1;
let playing = false;
let timer = null;
const STEP_DELAY = 1100;

function hl(t){ return '<span class="field-hl">'+t+'</span>'; }
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtTime(ms){ return '+'+(ms/1000).toFixed(2)+'s'; }
function randIp(){ return `${93+Math.floor(Math.random()*4)}.184.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`; }

/* Real-world public IP ranges for well-known services (publicly documented via
   ARIN/RDAP — the same info "whois" or "nslookup" would show). Used to make the
   Browsing demo feel realistic; matched loosely by keyword in the hostname. */
const KNOWN_SERVICES = [
  { match: /facebook|instagram|whatsapp|meta\.com/i,   name: 'Meta',    ip: () => `157.240.${22+Math.floor(Math.random()*8)}.${Math.floor(Math.random()*255)}` },
  { match: /youtube|google|gmail|ytimg/i,               name: 'Google',  ip: () => `142.250.${180+Math.floor(Math.random()*10)}.${Math.floor(Math.random()*255)}` },
  { match: /netflix/i,                                  name: 'Netflix', ip: () => `45.57.${Math.floor(Math.random()*8)}.${Math.floor(Math.random()*255)}` },
  { match: /amazon|aws\./i,                             name: 'Amazon',  ip: () => `52.94.${Math.floor(Math.random()*4)}.${Math.floor(Math.random()*255)}` },
  { match: /wikipedia|wikimedia/i,                      name: 'Wikimedia', ip: () => `198.35.${26+Math.floor(Math.random()*2)}.${Math.floor(Math.random()*255)}` },
  { match: /twitter|(^|\.)x\.com/i,                     name: 'X (Twitter)', ip: () => `104.244.42.${Math.floor(Math.random()*255)}` },
  { match: /github/i,                                   name: 'GitHub',  ip: () => `140.82.${112+Math.floor(Math.random()*4)}.${Math.floor(Math.random()*255)}` },
];
/* Resolve a host to a realistic IP: a known service's real public range if the
   hostname matches one, otherwise a random example IP like before. */
function resolveIp(host){
  const svc = KNOWN_SERVICES.find(s => s.match.test(host));
  return svc ? { ip: svc.ip(), service: svc.name } : { ip: randIp(), service: null };
}
function randMac(){
  const h = () => Math.floor(Math.random()*256).toString(16).padStart(2,'0');
  return `${h()}:${h()}:${h()}:${h()}:${h()}:${h()}`.toUpperCase();
}
function randPort(){ return 1024 + Math.floor(Math.random()*64511); }

/* This "machine's" identity stays fixed for the whole session, like a real host would. */
const CLIENT_IP  = `192.168.1.${20 + Math.floor(Math.random()*200)}`;
const CLIENT_MAC = randMac();

/* Attach simulated network-layer addressing to a step based on its direction.
   dir 'c2s' => src is the client, dst is the server; 's2c' is the reverse. */
function withAddr(step, dir, serverIp, serverPort, serverMac, clientPort){
  const client = { ip: CLIENT_IP, port: clientPort, mac: CLIENT_MAC };
  const server = { ip: serverIp, port: serverPort, mac: serverMac };
  const src = dir === 'c2s' ? client : server;
  const dst = dir === 'c2s' ? server : client;
  return { ...step, dir, net: { srcIp: src.ip, srcPort: src.port, srcMac: src.mac, dstIp: dst.ip, dstPort: dst.port, dstMac: dst.mac } };
}

function setStatus(text, live){
  document.getElementById('statusText').textContent = text;
  document.getElementById('statusDot').classList.toggle('live', !!live);
  document.getElementById('leftPanel').classList.toggle('glow', !!live);
}

function pulseOrb(dir){
  const orb = document.getElementById('orb');
  orb.classList.remove('pulse-c2s','pulse-s2c');
  void orb.offsetWidth;
  orb.classList.add(dir === 'c2s' ? 'pulse-c2s' : 'pulse-s2c');
}

/* Highlight which layer of the stack this step belongs to: TCP = Transport,
   everything else (DNS/HTTP/SMTP) = Application. Network stays subtly lit
   throughout since every message carries simulated IP addressing. */
function highlightLayer(proto){
  const activeLayer = proto === 'TCP' ? 'Transport' : 'Application';
  document.querySelectorAll('#layerStack .layer-box').forEach(box => {
    box.classList.toggle('active', box.dataset.layer === activeLayer);
  });
}
function resetLayerStack(){
  document.querySelectorAll('#layerStack .layer-box').forEach(box => box.classList.remove('active'));
}

/* ---------------------------------------------------------------
   LEFT PANEL FORMS
--------------------------------------------------------------- */
const bodies = {
  browse: `
    <div class="field-row"><label>URL</label><input id="in-url" type="text" value="https://www.example.com/index.html"></div>
    <div class="quick-tries" id="quickTries">
      <span class="quick-label">Try:</span>
      <button class="chip" data-url="https://www.facebook.com/">facebook.com</button>
      <button class="chip" data-url="https://www.youtube.com/">youtube.com</button>
      <button class="chip" data-url="https://www.google.com/">google.com</button>
      <button class="chip" data-url="https://www.netflix.com/">netflix.com</button>
      <button class="chip" data-url="https://www.wikipedia.org/">wikipedia.org</button>
      <button class="chip" data-url="https://github.com/">github.com</button>
    </div>
    <div class="btn-row"><button class="btn" id="runBrowse">Visit</button></div>
  `,
  mail: `
    <div class="field-row"><label>To</label><input id="in-to" type="text" value="prof.rao@college.edu"></div>
    <div class="field-row"><label>Subject</label><input id="in-subject" type="text" value="Assignment submission"></div>
    <div class="field-row"><label>Body</label><textarea id="in-body">Sir, please find my assignment attached.</textarea></div>
    <div class="btn-row"><button class="btn" id="runMail">Send</button></div>
  `,
  stream: `
    <div class="stream-visual"><span id="streamLabel">Player idle</span><div class="bar" id="streamBar"></div></div>
    <div class="field-row"><label>Quality</label>
      <select id="in-quality"><option value="1080p">1080p</option><option value="720p" selected>720p</option><option value="480p">480p</option></select>
    </div>
    <div class="btn-row">
      <button class="btn" id="runStream">Play</button>
      <button class="btn secondary" id="pauseStream" disabled>Pause</button>
    </div>
  `
};

function renderMode(){
  document.getElementById('activityBody').innerHTML = bodies[mode];
  document.getElementById('protoTitle').textContent =
    mode==='browse' ? 'Protocol Visualizer — DNS + TCP + HTTP' :
    mode==='mail'   ? 'Protocol Visualizer — DNS + TCP + SMTP' :
                      'Protocol Visualizer — DNS + TCP + HTTP (streaming)';
  wireModeButtons();
}
function wireModeButtons(){
  if(mode==='browse'){
    document.getElementById('runBrowse').addEventListener('click', () => {
      const url = document.getElementById('in-url').value.trim() || 'https://www.example.com/';
      startRun(buildBrowseScenario(url));
    });
    document.querySelectorAll('#quickTries .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('in-url').value = chip.dataset.url;
      });
    });
  }
  if(mode==='mail'){
    document.getElementById('runMail').addEventListener('click', () => {
      const to = document.getElementById('in-to').value.trim() || 'someone@example.com';
      const subject = document.getElementById('in-subject').value.trim() || '(no subject)';
      const body = document.getElementById('in-body').value.trim() || '(empty message)';
      startRun(buildMailScenario(to, subject, body));
    });
  }
  if(mode==='stream'){
    document.getElementById('runStream').addEventListener('click', () => {
      const quality = document.getElementById('in-quality').value;
      document.getElementById('pauseStream').disabled = false;
      document.getElementById('streamLabel').textContent = 'Buffering...';
      startRun(buildStreamScenario(quality));
    });
    document.getElementById('pauseStream').addEventListener('click', () => {
      document.getElementById('streamLabel').textContent = 'Paused';
      document.getElementById('pauseStream').disabled = true;
    });
  }
}

function selectMode(newMode){
  mode = newMode;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode===mode));
  document.querySelectorAll('.side-btn[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode===mode));
  resetRun();
  renderMode();
}
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => selectMode(tab.dataset.mode)));
document.querySelectorAll('.side-btn[data-mode]').forEach(btn => btn.addEventListener('click', () => selectMode(btn.dataset.mode)));

/* ---------------------------------------------------------------
   SCENARIO BUILDERS (each step now carries approx byte size)
--------------------------------------------------------------- */
function domainFromUrl(url){ try{ return new URL(url).hostname; } catch(e){ return 'www.example.com'; } }
function pathFromUrl(url){ try{ const u=new URL(url); return u.pathname+u.search||'/'; } catch(e){ return '/'; } }

function randSeq(){ return Math.floor(Math.random()*4_000_000_000); }

/* TCP 3-way handshake — every real TCP connection (HTTP, SMTP) does this
   before any application data is sent. DNS runs over UDP, so it skips this. */
function buildTcpHandshake(tBase, serverIp, serverPort, serverMac, clientPort){
  const clientSeq = randSeq(), serverSeq = randSeq();
  return [
    withAddr({ proto:'TCP', t:tBase, bytes:54, title:'SYN', log:`Opening TCP connection to port ${serverPort}...`,
      body:`Flags: ${hl('SYN')}\nSeq: ${clientSeq}\nClient → Server (3-way handshake, step 1/3)` }, 'c2s', serverIp, serverPort, serverMac, clientPort),
    withAddr({ proto:'TCP', t:tBase+90, bytes:58, title:'SYN, ACK', log:`Server acknowledges, offers its own sequence`,
      body:`Flags: ${hl('SYN, ACK')}\nSeq: ${serverSeq}\nAck: ${clientSeq+1}\nServer → Client (step 2/3)` }, 's2c', serverIp, serverPort, serverMac, clientPort),
    withAddr({ proto:'TCP', t:tBase+150, bytes:54, title:'ACK', log:`Handshake complete — connection established`,
      body:`Flags: ${hl('ACK')}\nSeq: ${clientSeq+1}\nAck: ${serverSeq+1}\nClient → Server (step 3/3)` }, 'c2s', serverIp, serverPort, serverMac, clientPort),
  ];
}

/* TCP 4-way teardown — closes the connection cleanly after the application
   protocol finishes (each side sends its own FIN, acknowledged by the other). */
function buildTcpTeardown(tBase, serverIp, serverPort, serverMac, clientPort){
  return [
    withAddr({ proto:'TCP', t:tBase, bytes:54, title:'FIN, ACK', log:`Client requests connection close`,
      body:`Flags: ${hl('FIN, ACK')}\nClient → Server (closing, step 1/4)` }, 'c2s', serverIp, serverPort, serverMac, clientPort),
    withAddr({ proto:'TCP', t:tBase+70, bytes:54, title:'ACK', log:`Server acknowledges close request`,
      body:`Flags: ${hl('ACK')}\nServer → Client (step 2/4)` }, 's2c', serverIp, serverPort, serverMac, clientPort),
    withAddr({ proto:'TCP', t:tBase+130, bytes:54, title:'FIN, ACK', log:`Server closes its side`,
      body:`Flags: ${hl('FIN, ACK')}\nServer → Client (step 3/4)` }, 's2c', serverIp, serverPort, serverMac, clientPort),
    withAddr({ proto:'TCP', t:tBase+190, bytes:54, title:'ACK', log:`Connection fully closed`,
      body:`Flags: ${hl('ACK')}\nClient → Server (step 4/4)` }, 'c2s', serverIp, serverPort, serverMac, clientPort),
  ];
}

function buildBrowseScenario(url){
  const host = domainFromUrl(url), path = pathFromUrl(url);
  const resolved = resolveIp(host), ip = resolved.ip;
  const isHttps = /^https:/i.test(url) || !/^http:/i.test(url); // default to https-style port if scheme omitted
  const httpPort = isHttps ? 443 : 80;
  const resolverIp = '192.168.1.1', resolverMac = randMac(), serverMac = randMac();
  const dnsClientPort = randPort(), httpClientPort = randPort();
  const rangeNote = resolved.service ? `  (${resolved.service}'s real-world public IP range)` : '';
  return [
    withAddr({ proto:'DNS', t:0, bytes:42, title:'DNS Query', log:`Resolving ${host}...`,
      body:`Type: ${hl('A')}\nName: ${hl(host)}\nClient → Resolver (UDP/53)` }, 'c2s', resolverIp, 53, resolverMac, dnsClientPort),
    withAddr({ proto:'DNS', t:180, bytes:68, title:'DNS Response', log:`Resolved to server address`,
      body:`${hl(host)}  A  ${hl(ip)}${rangeNote}\nTTL: 300s\nResolver → Client` }, 's2c', resolverIp, 53, resolverMac, dnsClientPort),
    ...buildTcpHandshake(340, ip, httpPort, serverMac, httpClientPort),
    withAddr({ proto:'HTTP', t:620, bytes:412, title:'HTTP GET Request', log:`Requesting ${path}`,
      body:`GET ${hl(path)} HTTP/1.1\nHost: ${host}\nUser-Agent: WiresideBrowser/1.0\nAccept: text/html,application/xhtml+xml\nConnection: keep-alive` }, 'c2s', ip, httpPort, serverMac, httpClientPort),
    withAddr({ proto:'HTTP', t:980, bytes:4213, title:'HTTP Response', log:`Page loaded successfully`,
      body:`HTTP/1.1 ${hl('200 OK')}\nContent-Type: text/html; charset=UTF-8\nContent-Length: 4213\nServer: nginx\n\n&lt;html&gt;...page content...&lt;/html&gt;` }, 's2c', ip, httpPort, serverMac, httpClientPort),
    ...buildTcpTeardown(1300, ip, httpPort, serverMac, httpClientPort),
  ];
}

function buildMailScenario(to, subject, body){
  const domain = to.split('@')[1] || 'example.com';
  const from = 'student@myclient.edu';
  const contentBytes = 80 + body.length + subject.length;
  const resolverIp = '192.168.1.1', resolverMac = randMac();
  const mailIp = randIp(), mailMac = randMac();
  const dnsClientPort = randPort(), smtpClientPort = randPort();
  return [
    withAddr({ proto:'DNS', t:0, bytes:40, title:'DNS Query (MX)', log:`Looking up mail server for ${domain}...`,
      body:`Type: ${hl('MX')}\nName: ${hl(domain)}\nClient → Resolver` }, 'c2s', resolverIp, 53, resolverMac, dnsClientPort),
    withAddr({ proto:'DNS', t:150, bytes:66, title:'DNS Response (MX)', log:`Mail server found`,
      body:`${domain}  MX  10 ${hl('mail.'+domain)}\nMail Client → Resolver` }, 's2c', resolverIp, 53, resolverMac, dnsClientPort),
    ...buildTcpHandshake(220, mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:500, bytes:90, title:'220 Service Ready', log:`Connecting to mail server...`,
      body:`${hl('220')} mail.${domain} ESMTP ready` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:560, bytes:40, title:'EHLO', log:`Handshake sent`,
      body:`${hl('EHLO')} myclient.edu` }, 'c2s', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:700, bytes:70, title:'250 Hello', log:`Handshake accepted`,
      body:`250-mail.${domain} Hello\n250 OK` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:880, bytes:45, title:'MAIL FROM', log:`Declaring sender...`,
      body:`${hl('MAIL FROM')}:&lt;${from}&gt;` }, 'c2s', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1000, bytes:20, title:'250 OK', log:`Sender accepted`, body:`250 OK` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1160, bytes:50, title:'RCPT TO', log:`Declaring recipient ${to}...`,
      body:`${hl('RCPT TO')}:&lt;${to}&gt;` }, 'c2s', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1280, bytes:25, title:'250 OK', log:`Recipient accepted`, body:`250 Accepted` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1420, bytes:20, title:'DATA', log:`Starting message body...`, body:`${hl('DATA')}` }, 'c2s', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1540, bytes:45, title:'354 Start Input', log:`Server ready for content`,
      body:`354 End data with &lt;CRLF&gt;.&lt;CRLF&gt;` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1760, bytes:contentBytes, title:'Message Content', log:`Message body sent`,
      body:`Subject: ${esc(subject)}\nFrom: ${from}\nTo: ${to}\n\n${esc(body)}\n.` }, 'c2s', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:1940, bytes:60, title:'250 Queued', log:`Message accepted for delivery`,
      body:`${hl('250')} OK: queued as 8B3F1A2C` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:2080, bytes:20, title:'QUIT', log:`Closing connection...`, body:`${hl('QUIT')}` }, 'c2s', mailIp, 25, mailMac, smtpClientPort),
    withAddr({ proto:'SMTP', t:2180, bytes:30, title:'221 Closing', log:`Connection closed. Mail sent.`, body:`221 Bye` }, 's2c', mailIp, 25, mailMac, smtpClientPort),
    ...buildTcpTeardown(2320, mailIp, 25, mailMac, smtpClientPort),
  ];
}

function buildStreamScenario(quality){
  const cdn = 'cdn.wireside-video.net', ip = randIp();
  const resolverIp = '192.168.1.1', resolverMac = randMac(), cdnMac = randMac();
  const dnsClientPort = randPort(), httpClientPort = randPort();
  return [
    withAddr({ proto:'DNS', t:0, bytes:42, title:'DNS Query', log:`Resolving video CDN...`,
      body:`Type: ${hl('A')}\nName: ${hl(cdn)}` }, 'c2s', resolverIp, 53, resolverMac, dnsClientPort),
    withAddr({ proto:'DNS', t:150, bytes:68, title:'DNS Response', log:`CDN address resolved`,
      body:`${cdn}  A  ${hl(ip)}\nTTL: 60s` }, 's2c', resolverIp, 53, resolverMac, dnsClientPort),
    ...buildTcpHandshake(200, ip, 443, cdnMac, httpClientPort),
    withAddr({ proto:'HTTP', t:480, bytes:380, title:'GET Manifest', log:`Requesting stream manifest...`,
      body:`GET ${hl('/video/master.m3u8')} HTTP/1.1\nHost: ${cdn}\nAccept: application/vnd.apple.mpegurl` }, 'c2s', ip, 443, cdnMac, httpClientPort),
    withAddr({ proto:'HTTP', t:640, bytes:300, title:'Manifest Response', log:`Manifest received (quality: ${quality})`,
      body:`HTTP/1.1 ${hl('200 OK')}\nContent-Type: application/vnd.apple.mpegurl\n\n#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n${hl(quality)}/index.m3u8` }, 's2c', ip, 443, cdnMac, httpClientPort),
    withAddr({ proto:'HTTP', t:900, bytes:380, title:'GET Segment 1', log:`Requesting first video segment...`,
      body:`GET ${hl('/video/'+quality+'/seg-001.ts')} HTTP/1.1\nHost: ${cdn}\nRange: bytes=0-` }, 'c2s', ip, 443, cdnMac, httpClientPort),
    withAddr({ proto:'HTTP', t:1180, bytes:614400, title:'Segment 1 Response', log:`Segment 1 buffered`,
      body:`HTTP/1.1 ${hl('206 Partial Content')}\nContent-Type: video/MP2T\nContent-Length: 614400` }, 's2c', ip, 443, cdnMac, httpClientPort),
    withAddr({ proto:'HTTP', t:1420, bytes:360, title:'GET Segment 2', log:`Requesting next segment...`,
      body:`GET ${hl('/video/'+quality+'/seg-002.ts')} HTTP/1.1\nHost: ${cdn}` }, 'c2s', ip, 443, cdnMac, httpClientPort),
    withAddr({ proto:'HTTP', t:1680, bytes:611820, title:'Segment 2 Response', log:`Segment 2 buffered — playback smooth`,
      body:`HTTP/1.1 ${hl('200 OK')}\nContent-Type: video/MP2T\nContent-Length: 611820` }, 's2c', ip, 443, cdnMac, httpClientPort),
    ...buildTcpTeardown(1900, ip, 443, cdnMac, httpClientPort),
  ];
}

/* ---------------------------------------------------------------
   PLAYBACK
--------------------------------------------------------------- */
function startRun(scenario){
  resetRun();
  steps = scenario;
  setStatus('Running — protocol exchange in progress...', true);
  document.getElementById('rightPanel').classList.add('glow');
  document.getElementById('timeline').innerHTML = '';
  document.getElementById('chartEmpty').style.display = 'none';
  document.getElementById('auditEmpty').style.display = 'none';
  updateControls();
  drawChartAxes();
  play();
  if(mode==='stream') document.getElementById('streamBar').style.width='0%';
}

function resetRun(){
  stop();
  steps = []; stepIndex = -1;
  document.getElementById('timeline').innerHTML =
    '<div class="empty-state">No activity running yet. Run something on the left — the protocol exchange will appear here, one message at a time.</div>';
  document.getElementById('auditList').innerHTML = '<div class="audit-empty" id="auditEmpty">Nothing logged yet.</div>';
  document.getElementById('chartSvg').innerHTML = '';
  document.getElementById('chartEmpty').style.display = 'block';
  updateControls();
  setStatus('Idle. Choose an activity and run it.', false);
  document.getElementById('rightPanel').classList.remove('glow');
  resetLayerStack();
}

function updateControls(){
  const total = steps.length;
  document.getElementById('progressLabel').textContent = `${Math.max(stepIndex+1,0)} / ${total}`;
  document.getElementById('progressFill').style.width = total ? `${((stepIndex+1)/total)*100}%` : '0%';
  document.getElementById('btnPrev').disabled = stepIndex<=0;
  document.getElementById('btnNext').disabled = total===0 || stepIndex>=total-1;
  document.getElementById('btnReplay').disabled = total===0;
  document.getElementById('btnPlay').innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
}

function renderStep(i){
  const s = steps[i];
  const el = document.getElementById('timeline');
  if(el.querySelector('.empty-state')) el.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'step';
  wrap.innerHTML = `
    <div class="step-meta"><div class="step-seq">#${i+1}</div><div class="step-time">${fmtTime(s.t)}</div></div>
    <div class="msg ${s.dir}">
      <div class="msg-head">
        <span class="proto-tag ${s.proto==='TCP' ? 'tcp' : ''}">${s.proto}</span>
        <span class="dir-label">${s.dir==='c2s' ? '<b>Client</b> &rarr; Server' : 'Server &rarr; <b>Client</b>'}</span>
      </div>
      <div class="msg-title">${s.title}</div>
      ${s.net ? `<div class="addr-line" title="Src MAC: ${s.net.srcMac}  ·  Dst MAC: ${s.net.dstMac}">
        <span class="addr-ip">${s.net.srcIp}<span class="addr-port">:${s.net.srcPort}</span></span>
        <span class="addr-arrow">&rarr;</span>
        <span class="addr-ip">${s.net.dstIp}<span class="addr-port">:${s.net.dstPort}</span></span>
      </div>` : ''}
      <div class="msg-body">${s.body}</div>
    </div>`;
  el.appendChild(wrap);
  el.scrollTop = el.scrollHeight;

  addAuditRow(s);
  addChartBar(i, s);
  pulseOrb(s.dir);
  highlightLayer(s.proto);

  if(mode==='stream'){
    document.getElementById('streamBar').style.width = `${((i+1)/steps.length)*100}%`;
    document.getElementById('streamLabel').textContent = i===steps.length-1 ? 'Playing smoothly' : 'Buffering...';
  }
}

function addAuditRow(s){
  const list = document.getElementById('auditList');
  const row = document.createElement('div');
  row.className = 'audit-row';
  const stamp = new Date().toTimeString().slice(0,8);
  row.innerHTML = `
    <div class="tag ${s.proto}">${s.proto}</div>
    <div class="text">${esc(s.log)}</div>
    ${s.net ? `<div class="audit-addr">${s.net.srcIp}:${s.net.srcPort} &rarr; ${s.net.dstIp}:${s.net.dstPort}</div>` : ''}
    <div class="time">${stamp}</div>
    <svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>`;
  list.appendChild(row);
}

/* ---- chart: log-scaled bars per step ---- */
function drawChartAxes(){ document.getElementById('chartSvg').innerHTML = ''; }
function addChartBar(i, s){
  const svg = document.getElementById('chartSvg');
  const total = steps.length;
  const w = 1000, h = 150, pad = 20;
  const bw = Math.min(48, (w-pad*2)/total - 8);
  const gap = (w - pad*2 - bw*total) / Math.max(total-1,1);
  const x = pad + i*(bw+gap);
  const logv = Math.log10(Math.max(s.bytes,10));
  const norm = Math.min(Math.max((logv-1)/(5.9-1), 0.06), 1);
  const barH = norm * (h - 30);
  const y = h - 14 - barH;
  const color = s.dir==='c2s' ? 'var(--cyan)' : 'var(--server)';
  const ns = 'http://www.w3.org/2000/svg';

  const rect = document.createElementNS(ns,'rect');
  rect.setAttribute('x', x); rect.setAttribute('y', h-14);
  rect.setAttribute('width', bw); rect.setAttribute('height', 0);
  rect.setAttribute('rx', 3);
  rect.setAttribute('fill', color);
  rect.setAttribute('opacity', '0.85');
  rect.setAttribute('class','chart-bar');
  svg.appendChild(rect);
  requestAnimationFrame(() => { rect.setAttribute('y', y); rect.setAttribute('height', barH); });

  const label = document.createElementNS(ns,'text');
  label.setAttribute('x', x+bw/2); label.setAttribute('y', h-2);
  label.setAttribute('font-size','9'); label.setAttribute('fill','#8393ab');
  label.setAttribute('text-anchor','middle');
  label.textContent = i+1;
  svg.appendChild(label);

  const title = document.createElementNS(ns,'title');
  title.textContent = `${s.proto} ${s.title}: ~${s.bytes} bytes`;
  rect.appendChild(title);
}

function stepForward(){
  if(stepIndex>=steps.length-1){ stop(); setStatus('Exchange complete.', false); return; }
  stepIndex++; renderStep(stepIndex); updateControls();
  if(stepIndex>=steps.length-1){ stop(); setStatus('Exchange complete.', false); }
}
function stepBackward(){
  if(stepIndex<=0) return;
  stop(); stepIndex--;
  document.getElementById('timeline').innerHTML = '';
  document.getElementById('auditList').innerHTML = '';
  document.getElementById('chartSvg').innerHTML = '';
  for(let i=0;i<=stepIndex;i++) renderStep(i);
  updateControls();
  setStatus('Paused.', false);
}
function play(){
  if(steps.length===0) return;
  playing = true; updateControls();
  timer = setInterval(() => { stepForward(); if(!playing) clearInterval(timer); }, STEP_DELAY);
}
function stop(){ playing = false; if(timer) clearInterval(timer); timer=null; updateControls(); }
function togglePlay(){
  if(steps.length===0) return;
  if(playing){ stop(); setStatus('Paused.', false); }
  else { setStatus('Running — protocol exchange in progress...', true); play(); }
}
function replay(){
  if(steps.length===0) return;
  stop(); stepIndex=-1;
  document.getElementById('timeline').innerHTML = '';
  document.getElementById('auditList').innerHTML = '';
  document.getElementById('chartSvg').innerHTML = '';
  if(mode==='stream') document.getElementById('streamBar').style.width='0%';
  setStatus('Running — protocol exchange in progress...', true);
  play();
}

document.getElementById('btnPlay').addEventListener('click', togglePlay);
document.getElementById('btnNext').addEventListener('click', () => { stop(); stepForward(); setStatus('Paused.', false); });
document.getElementById('btnPrev').addEventListener('click', stepBackward);
document.getElementById('btnReplay').addEventListener('click', replay);

renderMode();
