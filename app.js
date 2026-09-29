/* ===============================================================
   EDITRA — site script
   Videos and the showreel come from videos.json.
   Manage them from the website itself: open  <site>/#admin
   (or press Ctrl+Shift+A).
   =============================================================== */
(function(){
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover:hover) and (pointer:fine)").matches;

const TYPES = { short:"Short form", long:"Long form", motion:"Motion design" };
const COLOR = { short:"var(--rec)", long:"var(--v1)", motion:"var(--v2)" };
const LOOKS = [["#2b1b5a","#ff7a45"],["#401a3a","#ff4d3d"],["#151515","#ffb020"],["#0f2a3a","#6f7cff"],["#1d2a14","#34c7a1"],["#241436","#c56bff"]];

const SERVICES = [
  { name:"Short-form content",   trk:"9:16",  c:"var(--rec)",   desc:"Reels, Shorts and TikToks with fast hooks, tight cuts and captions that read at a glance." },
  { name:"YouTube / Long-form",  trk:"16:9",  c:"var(--v1)",    desc:"Full YouTube edits with pacing, B-roll, zooms and sound design that hold attention to the end." },
  { name:"Talking-head editing", trk:"CAM",   c:"var(--tally)", desc:"Jump cuts, punch-ins, captions and graphics that keep a single-camera video moving." },
  { name:"Motion graphics",      trk:"Ae",    c:"var(--v2)",    desc:"Titles, lower thirds, kinetic type and animated callouts made in After Effects." },
  { name:"Social media content", trk:"IG",    c:"var(--a1)",    desc:"Edits sized and paced for Instagram, YouTube, LinkedIn and X." },
  { name:"Story-driven edits",   trk:"STORY", c:"#eeeae3",      desc:"Finding the story in the footage first, then cutting toward it." }
];

/* ---------- video source helper (file in repo, YouTube, Drive, Vimeo, any mp4 URL) ---------- */
function safeUrl(u){
  u = String(u || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w./-]+$/.test(u) && !u.includes("..")) return u; // file in the repo
  return "";
}
function srcInfo(raw){
  const u = safeUrl(raw);
  if (!u) return { kind:"none" };
  let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i)))
    return { kind:"embed", embed:`https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`, thumb:`https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, tall:/shorts\//i.test(u) };
  if ((m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/i)))
    return { kind:"embed", embed:`https://drive.google.com/file/d/${m[1]}/preview`, thumb:`https://drive.google.com/thumbnail?id=${m[1]}&sz=w1280` };
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i)))
    return { kind:"embed", embed:`https://player.vimeo.com/video/${m[1]}?autoplay=1` };
  if (/instagram\.com\/(?:reel|p)\/([\w-]+)/i.test(u)){
    const id = u.match(/instagram\.com\/(?:reel|p)\/([\w-]+)/i)[1];
    return { kind:"embed", embed:`https://www.instagram.com/reel/${id}/embed`, tall:true };
  }
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u) || !/^https?:/i.test(u)) return { kind:"file", src:u };
  return { kind:"link", href:u };
}

function normalize(data){
  if (Array.isArray(data)) data = { showreel:"", videos:data };
  data = data || {};
  data.videos = (data.videos || []).map(v => ({
    title: v.title || "Untitled",
    tag: v.tag || "",
    type: TYPES[v.type] ? v.type : "long",
    desc: v.desc || "",
    tools: v.tools || "",
    video: v.video || "",
    thumbnail: v.thumbnail || ""
  }));
  data.showreel = data.showreel || "";
  return data;
}

/* ---------- player ---------- */
const player = $("#player"), stage = $("#playerStage");
let lastFocus = null;
function openPlayer(source, title, tallHint){
  const s = srcInfo(source);
  if (s.kind === "none") return;
  if (s.kind === "link"){ window.open(s.href, "_blank", "noopener"); return; }
  lastFocus = document.activeElement;
  stage.classList.toggle("tall", !!(s.tall || (tallHint && s.kind === "embed")));
  stage.innerHTML = s.kind === "file"
    ? `<video src="${esc(s.src)}" controls autoplay playsinline></video>`
    : `<iframe src="${esc(s.embed)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen title="${esc(title)}"></iframe>`;
  $("#playerTitle").textContent = title || "";
  player.hidden = false;
  document.body.style.overflow = "hidden";
  $("#playerClose").focus();
}
function closePlayer(){
  player.hidden = true;
  stage.innerHTML = "";
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}
$("#playerClose").addEventListener("click", closePlayer);
player.addEventListener("click", e => { if (e.target === player) closePlayer(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !player.hidden) closePlayer(); });

/* ---------- timecode (25fps) ---------- */
const t0 = performance.now();
function tc(ms){ const f=Math.floor(ms/40); return [Math.floor(f/90000), Math.floor(f/1500)%60, Math.floor(f/25)%60, f%25].map(n=>String(n).padStart(2,"0")).join(":"); }
(function tick(){ const v=tc(performance.now()-t0); $("#timecode").textContent=v; $("#cardTc").textContent=v; $("#reelTc").textContent=v; if(!reduce) requestAnimationFrame(tick); })();
$("#yr").textContent = new Date().getFullYear();

/* ---------- profile card: tilt + flip ---------- */
const card = $("#pcard");
if (canHover && !reduce){
  card.addEventListener("pointermove", e => {
    const r = card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    card.classList.add("live");
    card.style.setProperty("--rx", ((.5-y)*16).toFixed(2)+"deg");
    card.style.setProperty("--ry", ((x-.5)*22).toFixed(2)+"deg");
    card.style.setProperty("--mx", (x*100).toFixed(1)+"%");
    card.style.setProperty("--my", (y*100).toFixed(1)+"%");
  });
  card.addEventListener("pointerleave", () => {
    card.classList.remove("live");
    card.style.setProperty("--rx","0deg"); card.style.setProperty("--ry","-8deg");
  });
}
card.addEventListener("click", () => {
  card.classList.remove("live");
  card.setAttribute("aria-pressed", card.classList.toggle("flipped"));
});

/* ---------- timeline strip ---------- */
const ruler = $("#ruler");
for (let i=0;i<40;i++){ const s=document.createElement("span"); s.textContent=tc(i*4000).slice(0,8); ruler.appendChild(s); }
function fill(el, cls, names, widths, dur){
  let h=""; for(let r=0;r<2;r++) names.forEach((n,i)=>{ h+=`<div class="clip ${cls}" style="width:${widths[i%widths.length]}px">${cls==="a1"?"<i></i>":esc(n)}</div>`; });
  el.innerHTML=h; el.style.animationDuration=dur;
}
fill($("#trV2"),"v2",["Title","Lower third","Zoom","Captions","Callout","Kinetic type","Logo","Transition","Title"],[110,160,80,220,120,170,90,130,100],"46s");
fill($("#trV1"),"v1",["Hook","A-cam","B-roll","Jump cut","Talking head","Cutaway","Montage","Story beat","Outro"],[110,200,140,90,260,120,220,150,160],"40s");
fill($("#trA1"),"a1",["","","","","","",""],[320,180,260,140,300,220,200],"52s");

/* ---------- services ---------- */
$("#svcList").innerHTML = SERVICES.map(s=>`
  <li class="svc" style="--c:${s.c}">
    <span class="trk">${esc(s.trk)}</span>
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.desc)}</p>
  </li>`).join("");

/* ---------- copy email ---------- */
$("#copyBtn").addEventListener("click", ()=>{
  const btn=$("#copyBtn"), email=$("#email").textContent, done=m=>{ btn.textContent=m; setTimeout(()=>btn.textContent="Copy email",1800); };
  const select=()=>{ const r=document.createRange(); r.selectNodeContents($("#email")); const s=getSelection(); s.removeAllRanges(); s.addRange(r); };
  try{ navigator.clipboard.writeText(email).then(()=>done("Copied"),()=>{select();done("Press Ctrl+C");}); }
  catch(e){ select(); done("Press Ctrl+C"); }
});

/* ---------- showreel ---------- */
let reelSource = "";
function fmtDur(s){ s=Math.round(s||0); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
function renderShowreel(src){
  reelSource = src;
  const media = $("#reelMedia"), s = srcInfo(src);
  media.innerHTML = "";
  $("#reelDur").textContent = "--:--";
  if (s.kind === "file"){
    const v = document.createElement("video");
    Object.assign(v, { src:s.src, muted:true, loop:true, playsInline:true, preload:"metadata" });
    v.setAttribute("muted",""); v.setAttribute("playsinline","");
    if (!reduce) v.autoplay = true;
    v.addEventListener("loadedmetadata", () => { $("#reelDur").textContent = fmtDur(v.duration); });
    media.appendChild(v);
  } else if (s.thumb){
    media.innerHTML = `<img src="${esc(s.thumb)}" alt="">`;
  }
}
$("#reelLink").addEventListener("click", e => {
  e.preventDefault();
  if (reelSource) openPlayer(reelSource, "Showreel 2026");
  else document.getElementById("work").scrollIntoView();
});

/* ---------- work ---------- */
const works = $("#works"), filters = $("#filters");
let current = "all";

function applyFilter(){
  filters.querySelectorAll(".filter").forEach(f=>f.setAttribute("aria-pressed", f.dataset.k===current));
  let n=0;
  works.querySelectorAll(".work").forEach(el=>{
    const show = current==="all" || el.dataset.type===current;
    el.hidden = !show;
    if (show){ el.classList.toggle("alt", n%2===1); n++; }
  });
}
filters.addEventListener("click", e=>{
  const b=e.target.closest(".filter"); if(!b) return;
  current = b.dataset.k; applyFilter();
});

function renderWork(list){
  const counts = list.reduce((a,w)=>(a[w.type]=(a[w.type]||0)+1,a),{});
  const keys = ["all", ...Object.keys(TYPES).filter(k=>counts[k])];
  if (!keys.includes(current)) current = "all";
  filters.innerHTML = keys.map((k,i)=>`${i>1?'<span class="sep" aria-hidden="true">·</span>':''}<button class="filter" type="button" data-k="${k}" aria-pressed="false">${k==='all'?'All':TYPES[k]}<sup>${String(k==='all'?list.length:counts[k]).padStart(2,"0")}</sup></button>`).join("");

  if (!list.length){ works.innerHTML = `<p class="mono" style="color:var(--muted)">New work coming soon.</p>`; return; }

  works.innerHTML = list.map((w,i)=>{
    const s = srcInfo(w.video);
    const thumb = safeUrl(w.thumbnail) || s.thumb || "";
    const vertical = w.type==="short" || s.tall;
    const look = LOOKS[i % LOOKS.length];
    let media = "";
    if (s.kind === "file") media = `<video class="media" muted playsinline preload="metadata" ${thumb?`poster="${esc(thumb)}"`:""} src="${esc(s.src)}#t=0.5"></video>`;
    else if (thumb) media = `<img class="media" src="${esc(thumb)}" alt="" loading="lazy">`;
    return `
    <a class="work ${vertical?'vertical':''}" data-i="${i}" data-type="${w.type}" href="${esc(safeUrl(w.video) || '#work')}" aria-label="Play ${esc(w.title)}">
      <div class="frame ${media?'has-media':''}">
        <div class="bg" style="background:
          radial-gradient(120% 90% at ${15+(i%6)*14}% 10%, ${look[1]}cc, transparent 55%),
          radial-gradient(80% 80% at 90% 100%, ${look[1]}55, transparent 60%),
          linear-gradient(160deg, ${look[0]}, #0b0c10)"></div>
        ${media}
        <div class="safe"></div>
        <span class="corner c-tl">${esc(TYPES[w.type])}</span>
        <span class="corner c-tr">Rec</span>
        <span class="big">${esc(w.title)}</span>
        <span class="corner c-bl res">${vertical?'1080×1920':'1920×1080'}</span>
        <span class="corner c-br tc dur">▶ Watch</span>
        <span class="play"><svg viewBox="0 0 24 24"><path d="M6 4l15 8-15 8z"/></svg></span>
      </div>
      <div class="meta">
        <div class="row1"><span class="cat" style="background:${COLOR[w.type]}">${esc(TYPES[w.type])}</span>${w.tag?`<span class="tag">${esc(w.tag)}</span>`:""}<span class="idx tc">${String(i+1).padStart(2,"0")} / ${String(list.length).padStart(2,"0")}</span></div>
        <h3>${esc(w.title)}</h3>
        ${w.desc?`<p>${esc(w.desc)}</p>`:""}
        ${w.tools?`<dl><dt>Tools</dt><dd>${esc(w.tools)}</dd></dl>`:""}
        <span class="watch">Watch project ${s.kind==="link"?"↗":"▶"}</span>
      </div>
    </a>`;
  }).join("");

  works.querySelectorAll(".work").forEach(el=>{
    const w = list[+el.dataset.i];
    el.addEventListener("click", e => { e.preventDefault(); openPlayer(w.video, w.title, w.type==="short"); });
    const img = el.querySelector("img.media");
    if (img) img.addEventListener("error", () => { img.remove(); el.querySelector(".frame").classList.remove("has-media"); });
    const v = el.querySelector("video.media");
    if (!v) return;
    v.addEventListener("loadedmetadata", () => {
      const tall = v.videoHeight > v.videoWidth;
      el.classList.toggle("vertical", tall);
      el.querySelector(".res").textContent = `${v.videoWidth}×${v.videoHeight}`;
      el.querySelector(".dur").textContent = fmtDur(v.duration);
    });
    if (canHover && !reduce){
      el.addEventListener("mouseenter", () => { v.currentTime = 0.5; v.play().catch(()=>{}); });
      el.addEventListener("mouseleave", () => { v.pause(); });
    }
  });
  applyFilter();
}

function render(data){
  data = normalize(data);
  renderShowreel(data.showreel);
  renderWork(data.videos);
}

async function load(){
  try{
    const r = await fetch("videos.json?v=" + Date.now(), { cache:"no-store" });
    if (!r.ok) throw new Error(r.status);
    render(await r.json());
  }catch(e){
    console.error("Could not load videos.json", e);
    works.innerHTML = `<p class="mono" style="color:var(--muted)">Could not load videos. Refresh the page to try again.</p>`;
  }
}
load();

window.Editra = { render, srcInfo, safeUrl, normalize, esc, TYPES };
})();
