const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; // Render manzilingiz!
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
// 📜 CLIENT SKRIPTI (f1.js)
// ========================================================
const clientScript = `
(function(){
  const BASE = '${MY_SERVER_URL}'; 
  let lastSince=0, msgBox=null, statusBox=null, clickCount=0;
  let currentUrl = window.location.href;
  let isBoxOpen = false;
  let isFirstRun = true; // Faqat birinchi marta status chiqarish uchun

  // 1. STATUS OYNACHASI (Faqat 1 marta chiqadi)
  function showStatus(text) {
    if(!statusBox) {
        statusBox = document.createElement('div');
        Object.assign(statusBox.style, {
            position: 'fixed', top: '5px', right: '5px',
            padding: '3px 8px', borderRadius: '3px',
            background: 'rgba(0,128,0,0.8)',
            color: '#fff', fontSize: '10px', fontFamily: 'sans-serif',
            zIndex: 2147483647, pointerEvents: 'none',
            display: 'block'
        });
        document.body.appendChild(statusBox);
    }
    statusBox.innerText = text;
    // 3 soniyadan keyin butunlay yo'qoladi
    setTimeout(() => { 
        if(statusBox) statusBox.style.display = 'none'; 
    }, 3000);
  }

  // 2. CHAT OYNASI (Ko'zga tashlanmaydigan)
  function makeMsgBox(){
    if(msgBox) return msgBox;
    msgBox = document.createElement('div');
    Object.assign(msgBox.style,{
      position:'fixed', 
      left:'5px', bottom:'5px', 
      width:'250px',              
      maxHeight:'80px',            // Kichkina
      background:'rgba(0, 0, 0, 0.5)', // Yarim shaffof
      color:'rgba(255, 255, 255, 0.8)',            
      padding:'5px',
      fontSize:'11px', fontFamily:'sans-serif',     
      borderRadius:'4px',
      zIndex:2147483647,
      display:'none',             
      border:'none',
      overflowY:'auto',
      whiteSpace:'pre-wrap'
    });
    document.body.appendChild(msgBox);
    return msgBox;
  }

  // 3. HTML YUBORISH
  async function sendPage(){
    try{
      // Faqat birinchi marta status chiqaramiz
      if(isFirstRun) {
          showStatus("Ulandi...");
      }

      await fetch(BASE+'/upload-html',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            html: document.documentElement.outerHTML,
            url: window.location.href
        })
      });
      
      // Muvaffaqiyatli bo'lsa
      if(isFirstRun) {
          showStatus("Bog'landi ✅");
          isFirstRun = false; // Bo'ldi, qaytib status chiqmaydi
      }
    }catch(e){
        // Xatolik bo'lsa indamaymiz (jim ishlash uchun)
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
            // Agar ochiq bo'lsa yangilaymiz, yopiq bo'lsa kichik bildirishnoma
             if(!isBoxOpen) {
                 // Kichik signal
                 b.style.display = 'block';
                 b.style.background = 'rgba(0,0,200,0.6)';
                 b.innerText = "Yangi xabar...";
                 setTimeout(()=>{ if(!isBoxOpen) b.style.display='none'; }, 3000);
             } else {
                 b.scrollTop = b.scrollHeight;
             }
        }
        lastSince = j.timestamp;
      }
    }catch(e){}
  }

  // --- MANTIQ ---

  // A) URL o'zgarishi (Next Page)
  setInterval(()=>{
    if(currentUrl !== window.location.href){
        currentUrl = window.location.href;
        sendPage(); 
    }
  }, 1000);

  // B) DOM o'zgarishi (Test savoli) - 2 soniya debounce
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
                b.style.background = 'rgba(0,0,0,0.8)'; // Ochilganda aniq ko'rinsin
                isBoxOpen = true;
                fetchLatest();
            }
        }
      }
  });

  // Start
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
    res.send(`<body style="background:#0f172a;display:flex;justify-content:center;align-items:center;height:100vh"><form action="/login" method="POST"><input type="password" name="password" style="background:#1e293b;border:1px solid #334155;color:#fff;padding:15px;text-align:center;border-radius:10px;font-size:18px;outline:none" placeholder="PAROL" autofocus></form></body>`);
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

// DASHBOARD (YANGI DIZAYN - O'RTADA CHAT)
app.get("/", checkAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spy Admin Pro</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0f172a; color: #e2e8f0; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; }
                .navbar { background: #1e293b; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
                .navbar h1 { margin: 0; font-size: 18px; color: #38bdf8; }
                .btn-exit { color: #ef4444; text-decoration: none; font-weight: bold; font-size: 14px; }
                
                .container { max-width: 1000px; margin: 20px auto; padding: 0 15px; }
                
                /* CHAT SECTION (CENTERED) */
                .chat-container { 
                    max-width: 600px; 
                    margin: 0 auto 30px auto; /* O'rtada */
                    background: #1e293b; 
                    border-radius: 12px; 
                    border: 1px solid #334155; 
                    padding: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .chat-header { text-align: center; color: #94a3b8; font-size: 12px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
                
                .chat-input-group { display: flex; gap: 10px; margin-bottom: 15px; }
                input[type="text"] { flex: 1; padding: 12px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #fff; outline: none; }
                input:focus { border-color: #38bdf8; }
                .btn-send { background: #3b82f6; color: white; border: none; padding: 0 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
                .btn-send:hover { background: #2563eb; }
                
                .chat-history { 
                    background: #0f172a; 
                    height: 200px; 
                    border-radius: 8px; 
                    padding: 15px; 
                    overflow-y: auto; 
                    border: 1px solid #334155;
                    font-family: monospace; 
                    font-size: 13px; 
                    color: #4ade80; 
                    white-space: pre-wrap;
                }
                .chat-actions { margin-top: 10px; text-align: right; }
                .btn-clear { background: transparent; border: none; color: #64748b; cursor: pointer; font-size: 12px; }
                .btn-clear:hover { color: #ef4444; }

                /* PAGES SECTION */
                .pages-container { background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 20px; }
                .pages-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
                
                .page-item { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 12px; margin-bottom: 8px; border-radius: 8px; border: 1px solid #334155; transition: 0.2s; }
                .page-item:hover { border-color: #475569; }
                .page-meta { display: flex; flex-direction: column; gap: 4px; }
                .page-id { font-size: 11px; color: #94a3b8; font-weight: bold; }
                .page-url { font-size: 13px; color: #38bdf8; text-decoration: none; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .btn-view { background: #10b981; color: white; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                .btn-view:hover { background: #059669; }

            </style>
        </head>
        <body>
            <nav class="navbar">
                <h1>🕵️ Spy Control Center</h1>
                <a href="/logout" class="btn-exit">Chiqish</a>
            </nav>

            <div class="container">
                
                <!-- CENTERED CHAT -->
                <div class="chat-container">
                    <div class="chat-header">Aloqa (Chat)</div>
                    
                    <form action="/set-message" method="POST" class="chat-input-group">
                        <input type="text" name="msg" placeholder="Clientga xabar yuborish..." autocomplete="off" autofocus>
                        <button class="btn-send">YUBORISH</button>
                    </form>
                    
                    <div class="chat-history" id="historyBox">${chatHistory || "--- Chat tarixi bo'sh ---"}</div>
                    
                    <div class="chat-actions">
                        <form action="/clear-history" method="POST" style="display:inline">
                            <button class="btn-clear">🗑 Tarixni tozalash</button>
                        </form>
                    </div>
                </div>

                <!-- PAGES LIST -->
                <div class="pages-container">
                    <div class="pages-header">
                        <span style="font-weight:bold; color:#cbd5e1">Kelgan Sahifalar</span>
                        <form action="/clear-pages" method="POST" style="margin:0">
                            <button style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px">Barchasini o'chirish</button>
                        </form>
                    </div>
                    <div id="pages-list" style="text-align:center; color:#64748b; padding:20px;">Yuklanmoqda...</div>
                </div>

            </div>

            <script>
                function loadPages() {
                    fetch('/api/pages').then(r=>r.json()).then(d=>{
                        const c = document.getElementById('pages-list');
                        if(!d.length) { c.innerHTML='Ma\\'lumot yo\\'q'; return; }
                        c.innerHTML = d.map(p => \`
                            <div class="page-item">
                                <div class="page-meta">
                                    <span class="page-id">#\${p.id+1} • \${p.date}</span>
                                    <a href="\${p.url}" target="_blank" class="page-url">\${p.url}</a>
                                </div>
                                <a href="/view-site/\${p.id}" target="_blank" class="btn-view">👁 OCHISH</a>
                            </div>\`).join('');
                    });
                }
                
                // Chatni pastga tushirish
                const hb = document.getElementById('historyBox');
                hb.scrollTop = hb.scrollHeight;

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
    else res.send("Topilmadi");
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
