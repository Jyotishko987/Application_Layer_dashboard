/* ---------------------------------------------------------------
   THREE.JS BACKGROUND
--------------------------------------------------------------- */
(function initBackground(){
  const canvas = document.getElementById('bgCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 32;
  const group = new THREE.Group();
  scene.add(group);
  const COUNT = 60;
  const nodes = [];
  const nodeGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const cyanMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent:true, opacity:0.7 });
  const pinkMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent:true, opacity:0.7 });
  for(let i=0;i<COUNT;i++){
    const mesh = new THREE.Mesh(nodeGeo, i % 3 === 0 ? pinkMat : cyanMat);
    const pos = new THREE.Vector3((Math.random()-0.5)*55,(Math.random()-0.5)*34,(Math.random()-0.5)*30);
    mesh.position.copy(pos);
    group.add(mesh);
    nodes.push({ mesh, base: pos.clone(), phase: Math.random()*Math.PI*2 });
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4a5a75, transparent:true, opacity:0.14 });
  const linePositions = [];
  for(let i=0;i<nodes.length;i++)
    for(let j=i+1;j<nodes.length;j++)
      if(nodes[i].base.distanceTo(nodes[j].base) < 11){
        linePositions.push(nodes[i].base.x, nodes[i].base.y, nodes[i].base.z);
        linePositions.push(nodes[j].base.x, nodes[j].base.y, nodes[j].base.z);
      }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  group.add(new THREE.LineSegments(lineGeo, lineMat));
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  let mouseX=0, mouseY=0;
  window.addEventListener('mousemove', e => { mouseX=(e.clientX/window.innerWidth-0.5); mouseY=(e.clientY/window.innerHeight-0.5); });
  const clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    nodes.forEach(n => {
      n.mesh.position.y = n.base.y + Math.sin(t*0.5+n.phase)*0.6;
      n.mesh.position.x = n.base.x + Math.cos(t*0.35+n.phase)*0.4;
    });
    group.rotation.y = t*0.03 + mouseX*0.3;
    group.rotation.x = mouseY*0.15;
    renderer.render(scene, camera);
  }
  animate();
})();

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

/* ---------------------------------------------------------------
   LEFT PANEL FORMS
--------------------------------------------------------------- */
const bodies = {
  browse: `
    <div class="field-row"><label>URL</label><input id="in-url" type="text" value="https://www.example.com/index.html"></div>
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
    mode==='browse' ? 'Protocol Visualizer — DNS + HTTP' :
    mode==='mail'   ? 'Protocol Visualizer — DNS + SMTP' :
                      'Protocol Visualizer — DNS + HTTP (streaming)';
  wireModeButtons();
}
function wireModeButtons(){
  if(mode==='browse'){
    document.getElementById('runBrowse').addEventListener('click', () => {
      const url = document.getElementById('in-url').value.trim() || 'https://www.example.com/';
      startRun(buildBrowseScenario(url));
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

function buildBrowseScenario(url){
  const host = domainFromUrl(url), path = pathFromUrl(url), ip = randIp();
  const isHttps = /^https:/i.test(url) || !/^http:/i.test(url); // default to https-style port if scheme omitted
  const httpPort = isHttps ? 443 : 80;
  const resolverIp = '192.168.1.1', resolverMac = randMac(), serverMac = randMac();
  const dnsClientPort = randPort(), httpClientPort = randPort();
  return [
    withAddr({ proto:'DNS', t:0, bytes:42, title:'DNS Query', log:`Resolving ${host}...`,
      body:`Type: ${hl('A')}\nName: ${hl(host)}\nClient → Resolver (UDP/53)` }, 'c2s', resolverIp, 53, resolverMac, dnsClientPort),
    withAddr({ proto:'DNS', t:180, bytes:68, title:'DNS Response', log:`Resolved to server address`,
      body:`${hl(host)}  A  ${hl(ip)}\nTTL: 300s\nResolver → Client` }, 's2c', resolverIp, 53, resolverMac, dnsClientPort),
    withAddr({ proto:'HTTP', t:420, bytes:412, title:'HTTP GET Request', log:`Requesting ${path}`,
      body:`GET ${hl(path)} HTTP/1.1\nHost: ${host}\nUser-Agent: WiresideBrowser/1.0\nAccept: text/html,application/xhtml+xml\nConnection: keep-alive` }, 'c2s', ip, httpPort, serverMac, httpClientPort),
    withAddr({ proto:'HTTP', t:780, bytes:4213, title:'HTTP Response', log:`Page loaded successfully`,
      body:`HTTP/1.1 ${hl('200 OK')}\nContent-Type: text/html; charset=UTF-8\nContent-Length: 4213\nServer: nginx\n\n&lt;html&gt;...page content...&lt;/html&gt;` }, 's2c', ip, httpPort, serverMac, httpClientPort),
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
    withAddr({ proto:'SMTP', t:380, bytes:90, title:'220 Service Ready', log:`Connecting to mail server...`,
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
    withAddr({ proto:'HTTP', t:360, bytes:380, title:'GET Manifest', log:`Requesting stream manifest...`,
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
        <span class="proto-tag">${s.proto}</span>
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
