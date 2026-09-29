/* ===============================================================
   EDITRA — Video manager
   Open it on the live site with  #admin  at the end of the URL
   (e.g. https://teameditra03.github.io/editra/#admin) or Ctrl+Shift+A.
   Changes are saved to the GitHub repo in one commit when you press
   "Publish"; the site updates for visitors about a minute later.
   =============================================================== */
(function(){
const OWNER = "Teameditra03", REPO = "editra", BRANCH = "main", DATA = "videos.json";
const TOKEN_KEY = "editra_admin_pat";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const MAX_MB = 95;
const E = window.Editra;
const esc = E.esc;

let token = "";
try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch(e){}
let draft = null;          // { showreel, videos:[] }
let published = "";        // JSON string of what is live, to detect changes
let initialFiles = new Set();
let pendingBlobs = {};     // path -> blob sha (uploaded, not yet committed)
let root = null, busy = false, dragFrom = null;

/* ---------------- styles ---------------- */
const css = `
.adm{position:fixed;inset:0;z-index:300;background:rgba(5,6,8,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);overflow:auto;padding:24px 16px 120px;font:15px/1.5 var(--body);color:var(--paper)}
.adm *{box-sizing:border-box}
.adm-in{max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
.adm-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.adm-top h2{margin:0;font:900 clamp(34px,5vw,52px)/.9 var(--display);text-transform:uppercase;flex:1;min-width:0}
.adm-top h2 small{display:block;font:500 11px var(--mono);letter-spacing:.14em;color:var(--tally);margin-bottom:6px}
.adm-card{background:var(--ink-2);border:1px solid var(--line);border-radius:16px;padding:20px}
.adm-card h3{margin:0 0 4px;font:800 22px var(--display);text-transform:uppercase;letter-spacing:.04em}
.adm-card .hint{margin:0 0 14px;color:var(--muted);font-size:14px}
.adm label{display:flex;flex-direction:column;gap:6px;font:500 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);min-width:0}
.adm input[type=text],.adm input[type=password],.adm input[type=url],.adm select,.adm textarea{width:100%;background:var(--ink);border:1px solid var(--line);border-radius:10px;color:var(--paper);font:15px var(--body);padding:10px 12px;text-transform:none;letter-spacing:0}
.adm textarea{min-height:64px;resize:vertical}
.adm input:focus,.adm select:focus,.adm textarea:focus{outline:none;border-color:var(--tally)}
.adm .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.adm .b{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 14px/1 var(--body);padding:11px 16px;border-radius:999px;border:1px solid var(--line);background:var(--ink-3);color:var(--paper);cursor:pointer;white-space:nowrap;text-decoration:none}
.adm .b:hover:not(:disabled){border-color:var(--paper)}
.adm .b:disabled{opacity:.45;cursor:not-allowed}
.adm .b.pri{background:var(--tally);border-color:var(--tally);color:#1a1204}
.adm .b.danger{color:#ff8a7d}
.adm .b.sm{padding:7px 11px;font-size:13px}
.adm .b.ic{width:36px;height:36px;padding:0;font-size:15px}
.adm-status{font:500 13px var(--mono);letter-spacing:.04em;padding:10px 14px;border-radius:10px;background:var(--ink-3);border:1px solid var(--line)}
.adm-status.ok{border-color:#2f7d64;color:#7fe3c2}
.adm-status.err{border-color:#8a3a33;color:#ffb0a6}
.adm-status.work{border-color:#7a5a1c;color:#ffd48a}
.adm-list{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}
.adm-row{display:grid;grid-template-columns:28px 34px 96px minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px}
.adm-row.drag-over{border-color:var(--tally)}
.adm-row.dragging{opacity:.4}
.adm-row .h{cursor:grab;color:var(--muted);text-align:center;font-size:18px;user-select:none}
.adm-row .n{font:700 13px var(--mono);color:var(--tally);text-align:center}
.adm-row .th{width:96px;aspect-ratio:16/9;border-radius:6px;background:var(--ink-3);overflow:hidden;display:grid;place-items:center;font:10px var(--mono);color:var(--muted)}
.adm-row .th img,.adm-row .th video{width:100%;height:100%;object-fit:cover;display:block}
.adm-row .t b{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adm-row .t span{font:12px var(--mono);color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.adm-row .acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.adm-row .ed{grid-column:1/-1;display:none;border-top:1px solid var(--line);padding-top:12px;margin-top:2px}
.adm-row.open .ed{display:flex;flex-direction:column;gap:12px}
.adm-row .ed .row{display:flex;gap:8px;align-items:end;flex-wrap:wrap}
.adm-row .ed .row label{flex:1;min-width:200px}
@media (max-width:640px){
  .adm-row{grid-template-columns:24px 72px minmax(0,1fr)}
  .adm-row .n{display:none}
  .adm-row .th{width:72px}
  .adm-row .acts{grid-column:1/-1;justify-content:flex-start}
}
.adm-src{display:flex;gap:6px;margin-bottom:10px}
.adm-src button{flex:1}
.adm-src button[aria-pressed=true]{border-color:var(--tally);color:var(--tally)}
.adm-drop{border:1.5px dashed var(--line);border-radius:12px;padding:18px;text-align:center;color:var(--muted);cursor:pointer}
.adm-drop:hover,.adm-drop.over{border-color:var(--tally);color:var(--paper)}
.adm-drop input{display:none}
.adm-prog{height:6px;border-radius:3px;background:var(--ink-3);overflow:hidden;margin-top:10px}
.adm-prog i{display:block;height:100%;width:0;background:var(--tally);transition:width .2s}
.adm-bar{position:fixed;left:0;right:0;bottom:0;z-index:310;background:var(--ink-2);border-top:1px solid var(--line);padding:12px 16px}
.adm-bar .in{max-width:980px;margin:0 auto;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.adm-bar .msg{flex:1;min-width:180px;font:500 13px var(--mono);color:var(--muted)}
.adm-bar .msg b{color:var(--tally)}
.adm-bar label.chk{flex-direction:row;align-items:center;gap:6px;text-transform:none;letter-spacing:0;font:13px var(--body)}
.adm ol.steps{margin:0 0 14px;padding-left:20px;color:#cfccc6}
.adm ol.steps li{margin-bottom:6px}
.adm a{color:var(--tally)}
`;

/* ---------------- GitHub API ---------------- */
async function gh(path, opts = {}){
  const r = await fetch(path.startsWith("http") ? path : API + path, {
    ...opts,
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json", ...(opts.body ? {"Content-Type":"application/json"} : {}) },
    cache: "no-store"
  });
  if (!r.ok){
    let m = ""; try { m = (await r.json()).message; } catch(e){}
    const err = new Error(m || `GitHub error ${r.status}`); err.status = r.status; throw err;
  }
  return r.status === 204 ? null : r.json();
}
function b64(str){ return btoa(unescape(encodeURIComponent(str))); }
function unb64(s){ return decodeURIComponent(escape(atob(s.replace(/\n/g,"")))); }

function fileToBase64(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Could not read the file"));
    fr.readAsDataURL(file);
  });
}
// Upload a blob with a progress callback (fetch can't report upload progress)
function uploadBlob(base64, onProgress){
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("POST", API + "/git/blobs");
    x.setRequestHeader("Authorization", `Bearer ${token}`);
    x.setRequestHeader("Accept", "application/vnd.github+json");
    x.setRequestHeader("Content-Type", "application/json");
    x.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) res(JSON.parse(x.responseText).sha);
      else { let m=""; try{ m = JSON.parse(x.responseText).message; }catch(e){} rej(new Error(m || `Upload failed (${x.status})`)); }
    };
    x.onerror = () => rej(new Error("Network error while uploading"));
    x.send(JSON.stringify({ content: base64, encoding: "base64" }));
  });
}

async function pathExists(path){
  if (pendingBlobs[path]) return true;
  try { await gh(`/contents/${encodeURI(path)}?ref=${BRANCH}`); return true; }
  catch(e){ if (e.status === 404) return false; throw e; }
}
function cleanName(name){
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || "video";
  const ext = (dot > 0 ? name.slice(dot + 1) : "mp4").toLowerCase().replace(/[^a-z0-9]/g,"");
  return { base: base.slice(0, 60), ext };
}
async function uniquePath(dir, base, ext){
  let p = `${dir}/${base}.${ext}`, i = 2;
  while (await pathExists(p)) p = `${dir}/${base}-${i++}.${ext}`;
  return p;
}

// Grab a still frame from a local video file to use as the poster
function captureFrame(file){
  return new Promise(resolve => {
    const url = URL.createObjectURL(file), v = document.createElement("video");
    let done = false;
    const finish = out => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(out); };
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.addEventListener("loadedmetadata", () => { v.currentTime = Math.min(1.5, (v.duration || 3) / 3); });
    v.addEventListener("seeked", () => {
      try{
        const w = Math.min(1280, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(v, 0, 0, w, h);
        finish({ dataUrl: c.toDataURL("image/jpeg", .82), tall: v.videoHeight > v.videoWidth });
      }catch(e){ finish(null); }
    });
    v.addEventListener("error", () => finish(null));
    setTimeout(() => finish(null), 15000);
  });
}

async function uploadFile(file, dir, onProgress){
  const mb = file.size / 1048576;
  if (mb > MAX_MB) throw new Error(`This file is ${mb.toFixed(0)} MB. The limit is ${MAX_MB} MB — export a smaller version, or upload it to YouTube / Google Drive and use "Paste a link" instead.`);
  const { base, ext } = cleanName(file.name);
  const path = await uniquePath(dir, base, ext);
  const data = await fileToBase64(file);
  const sha = await uploadBlob(data, onProgress);
  pendingBlobs[path] = sha;
  return path;
}
async function uploadDataUrl(dataUrl, path){
  const sha = await uploadBlob(dataUrl.split(",")[1]);
  pendingBlobs[path] = sha;
  return path;
}

/* ---------------- data ---------------- */
function repoFiles(d){
  const s = new Set();
  const add = u => { if (u && !/^https?:/i.test(u)) s.add(u.replace(/^\.\//,"")); };
  add(d.showreel); d.videos.forEach(v => { add(v.video); add(v.thumbnail); });
  return s;
}
// serialize without temporary UI fields (those start with "_")
function ser(d, pretty){ return JSON.stringify(d, (k, v) => k.startsWith("_") ? undefined : v, pretty ? 2 : 0); }
function isDirty(){ return !!draft && (ser(draft) !== published || Object.keys(pendingBlobs).length > 0); }

async function loadDraft(){
  status("Loading your videos…", "work");
  const f = await gh(`/contents/${DATA}?ref=${BRANCH}`);
  draft = E.normalize(JSON.parse(unb64(f.content)));
  published = ser(draft);
  initialFiles = repoFiles(draft);
  pendingBlobs = {};
  renderDash();
  status(`${draft.videos.length} videos loaded. Make your changes, then press Publish.`, "ok");
}

async function publish(){
  if (busy || !isDirty()) return;
  busy = true; updateBar();
  status("Publishing…", "work");
  try{
    for (let attempt = 0; attempt < 3; attempt++){
      const ref = await gh(`/git/ref/heads/${BRANCH}`);
      const head = await gh(`/git/commits/${ref.object.sha}`);
      const tree = [{ path: DATA, mode: "100644", type: "blob", content: ser(draft, true) + "\n" }];
      const used = repoFiles(draft);
      for (const [path, sha] of Object.entries(pendingBlobs)) if (used.has(path)) tree.push({ path, mode: "100644", type: "blob", sha });
      const cleanup = document.getElementById("admCleanup");
      const unused = [...initialFiles].filter(p => !used.has(p));
      if (cleanup && cleanup.checked && unused.length){
        const full = await gh(`/git/trees/${head.tree.sha}?recursive=1`);
        const existing = new Set(full.tree.map(t => t.path));
        for (const p of unused) if (existing.has(p)) tree.push({ path: p, mode: "100644", type: "blob", sha: null });
      }
      const newTree = await gh(`/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
      const commit = await gh(`/git/commits`, { method: "POST", body: JSON.stringify({ message: "Update videos from website admin", tree: newTree.sha, parents: [ref.object.sha] }) });
      try{
        await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
      }catch(e){ if (e.status === 422 && attempt < 2) continue; throw e; }
      break;
    }
    published = ser(draft);
    initialFiles = repoFiles(draft);
    pendingBlobs = {};
    E.render(JSON.parse(published));
    status("Published! Visitors will see the changes in about 1–2 minutes.", "ok");
  }catch(e){
    status("Could not publish: " + e.message, "err");
  }finally{ busy = false; renderDash(); }
}

/* ---------------- UI ---------------- */
let lastStatus = ["", ""];
function status(msg, kind){
  lastStatus = [msg, kind];
  const el = root && root.querySelector("#admStatus");
  if (el){ el.textContent = msg; el.className = "adm-status " + (kind || ""); }
}
function updateBar(){
  const bar = document.getElementById("admBar");
  if (!bar) return;
  const dirty = isDirty();
  bar.hidden = !draft;
  bar.querySelector(".msg").innerHTML = dirty ? "<b>● Unpublished changes</b> — visitors don't see them yet" : "Everything is published";
  bar.querySelector("#admPublish").disabled = !dirty || busy;
  bar.querySelector("#admDiscard").disabled = !dirty || busy;
  const unused = draft ? [...initialFiles].filter(p => !repoFiles(draft).has(p)) : [];
  bar.querySelector(".chk").hidden = unused.length === 0;
}

function thumbHtml(v){
  const s = E.srcInfo(v.video);
  const t = E.safeUrl(v.thumbnail);
  if (t && !pendingBlobs[t]) return `<img src="${esc(t)}" alt="">`;
  if (v._preview) return `<img src="${esc(v._preview)}" alt="">`;
  if (s.thumb) return `<img src="${esc(s.thumb)}" alt="">`;
  if (s.kind === "file" && !pendingBlobs[s.src]) return `<video src="${esc(s.src)}#t=0.5" muted preload="metadata"></video>`;
  return s.kind === "file" ? "NEW" : "LINK";
}

function typeOptions(sel, withAuto){
  return (withAuto ? `<option value="auto">Auto-detect</option>` : "") +
    Object.entries(E.TYPES).map(([k, l]) => `<option value="${k}" ${k===sel?"selected":""}>${l}</option>`).join("");
}
function posOptions(){
  return `<option value="start">At the top (first)</option>` +
    draft.videos.map((v, i) => `<option value="${i}">After #${i+1} · ${esc(v.title)}</option>`).join("") +
    `<option value="end" selected>At the bottom (last)</option>`;
}

function renderLogin(){
  root.querySelector(".adm-in").innerHTML = `
    <div class="adm-top"><h2><small>Editra · Admin</small>Video manager</h2><button class="b" data-a="close">Close ✕</button></div>
    <div class="adm-card">
      <h3>Unlock once on this device</h3>
      <p class="hint">Your videos are saved in your GitHub repo, so this panel needs a GitHub access key. You only do this once per device and browser. After that you just open this page and edit.</p>
      <ol class="steps">
        <li>Open <a href="https://github.com/settings/tokens/new?scopes=repo&description=Editra%20website%20admin" target="_blank" rel="noopener">this GitHub page</a>. You need to be signed in as <b>${OWNER}</b>.</li>
        <li>Choose an <b>Expiration</b> (for example 1 year), keep the <b>repo</b> box ticked, and press <b>Generate token</b>.</li>
        <li>Copy the token (it starts with <code>ghp_</code>) and paste it below.</li>
      </ol>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) auto;align-items:end">
        <label>Access key<input type="password" id="admToken" placeholder="ghp_…" autocomplete="off"></label>
        <button class="b pri" data-a="login">Unlock</button>
      </div>
      <p class="hint" style="margin:12px 0 0">The key stays saved only in this browser. Don't unlock on a shared computer, and use Lock when you're done there.</p>
    </div>
    <div class="adm-status" id="admStatus" hidden></div>`;
  root.querySelector("#admToken").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
  setTimeout(() => root.querySelector("#admToken").focus(), 50);
  updateBar();
}

async function login(){
  const input = root.querySelector("#admToken");
  const t = input.value.trim();
  const st = root.querySelector("#admStatus"); st.hidden = false;
  if (!t) return status("Paste the access key first.", "err");
  token = t;
  status("Checking the key…", "work");
  try{
    const repo = await gh("");
    if (!repo.permissions || !repo.permissions.push) throw new Error("This key can't edit the editra repo. Make sure the repo box was ticked.");
    try { localStorage.setItem(TOKEN_KEY, t); } catch(e){}
    await openDash();
  }catch(e){
    token = "";
    status(e.status === 401 ? "That key didn't work. Check you copied all of it, or make a new one." : e.message, "err");
  }
}

async function openDash(){
  root.querySelector(".adm-in").innerHTML = `<div class="adm-status work" id="admStatus">Loading…</div>`;
  try{ await loadDraft(); }
  catch(e){
    if (e.status === 401){ lock(); status("Your saved key has expired or was removed. Unlock again with a new key.", "err"); root.querySelector("#admStatus").hidden = false; return; }
    status("Could not load videos: " + e.message, "err");
  }
}

function renderDash(){
  const d = draft;
  root.querySelector(".adm-in").innerHTML = `
    <div class="adm-top">
      <h2><small>Editra · Admin</small>Video manager</h2>
      <button class="b sm" data-a="lock" title="Forget the key on this device">Lock</button>
      <button class="b sm" data-a="close">Close ✕</button>
    </div>
    <div class="adm-status" id="admStatus"></div>

    <div class="adm-card">
      <h3>Showreel</h3>
      <p class="hint">The big video at the top of the site. Use a file you've uploaded, a new upload, or a YouTube / Drive / Vimeo link.</p>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) auto auto;align-items:end">
        <label>Showreel file or link<input type="text" id="admReel" value="${esc(d.showreel)}" placeholder="showreel.mp4 or https://youtu.be/…"></label>
        <button class="b sm" data-a="reel-upload">Upload new…</button>
        <button class="b sm" data-a="reel-play" ${d.showreel?"":"disabled"}>▶ Preview</button>
      </div>
      <input type="file" id="admReelFile" accept="video/*" hidden>
      <div class="adm-prog" id="admReelProg" hidden><i></i></div>
    </div>

    <div class="adm-card">
      <h3>Videos in "Selected work" (${d.videos.length})</h3>
      <p class="hint">Top of the list shows first on the site. Drag ☰ to reorder, or use ↑ ↓. Press Edit to change title, category, description or the video itself.</p>
      <ul class="adm-list" id="admList">
        ${d.videos.map((v, i) => `
        <li class="adm-row" draggable="true" data-i="${i}">
          <span class="h" title="Drag to move">☰</span>
          <span class="n">${String(i+1).padStart(2,"0")}</span>
          <span class="th">${thumbHtml(v)}</span>
          <span class="t"><b>${esc(v.title)}</b><span>${esc(E.TYPES[v.type])}${v.tag?" · "+esc(v.tag):""} · ${esc(v.video || "no video")}</span></span>
          <span class="acts">
            <button class="b ic" data-a="up" data-i="${i}" ${i===0?"disabled":""} title="Move up" aria-label="Move up">↑</button>
            <button class="b ic" data-a="down" data-i="${i}" ${i===d.videos.length-1?"disabled":""} title="Move down" aria-label="Move down">↓</button>
            <button class="b sm" data-a="edit" data-i="${i}">Edit</button>
            <button class="b sm" data-a="play" data-i="${i}" ${v.video?"":"disabled"}>▶</button>
            <button class="b sm danger" data-a="del" data-i="${i}">Remove</button>
          </span>
          <div class="ed">
            <div class="grid">
              <label>Title<input type="text" data-f="title" data-i="${i}" value="${esc(v.title)}"></label>
              <label>Tag (small label)<input type="text" data-f="tag" data-i="${i}" value="${esc(v.tag)}"></label>
              <label>Category (filter)<select data-f="type" data-i="${i}">${typeOptions(v.type)}</select></label>
              <label>Position<select data-f="pos" data-i="${i}">${d.videos.map((_, j) => `<option value="${j}" ${j===i?"selected":""}>#${j+1}</option>`).join("")}</select></label>
            </div>
            <label>Description (optional)<textarea data-f="desc" data-i="${i}">${esc(v.desc)}</textarea></label>
            <label>Tools (optional)<input type="text" data-f="tools" data-i="${i}" value="${esc(v.tools)}" placeholder="Premiere Pro · After Effects"></label>
            <div class="row">
              <label>Video file or link<input type="text" data-f="video" data-i="${i}" value="${esc(v.video)}"></label>
              <button class="b sm" data-a="replace-video" data-i="${i}">Upload replacement…</button>
            </div>
            <div class="row">
              <label>Thumbnail image (optional)<input type="text" data-f="thumbnail" data-i="${i}" value="${esc(v.thumbnail)}" placeholder="Leave empty to use a frame from the video"></label>
              <button class="b sm" data-a="replace-thumb" data-i="${i}">Upload image…</button>
            </div>
            <div class="adm-prog" data-prog="${i}" hidden><i></i></div>
          </div>
        </li>`).join("")}
      </ul>
      <input type="file" id="admRowFile" hidden>
    </div>

    <div class="adm-card" id="admAdd">
      <h3>Add a video</h3>
      <p class="hint">Upload a video file (up to ${MAX_MB} MB), or paste a YouTube, Google Drive, Vimeo or Instagram link for bigger videos.</p>
      <div class="adm-src" role="group" aria-label="Video source">
        <button class="b sm" data-a="src" data-v="file" aria-pressed="true">Upload a file</button>
        <button class="b sm" data-a="src" data-v="link" aria-pressed="false">Paste a link</button>
      </div>
      <div id="admSrcFile">
        <label class="adm-drop" id="admDrop"><input type="file" id="admFile" accept="video/*"><span id="admDropTxt">Click to choose a video, or drag it here</span></label>
      </div>
      <div id="admSrcLink" hidden>
        <label>Video link<input type="url" id="admLink" placeholder="https://youtu.be/…  or  https://drive.google.com/file/d/…"></label>
        <p class="hint" style="margin:8px 0 0">For Google Drive, set sharing to <b>Anyone with the link</b> so visitors can watch it.</p>
      </div>
      <div class="grid" style="margin-top:14px">
        <label>Title *<input type="text" id="admTitle" placeholder="e.g. Brand Film"></label>
        <label>Tag (small label)<input type="text" id="admTag" placeholder="e.g. Cinematic"></label>
        <label>Category (filter)<select id="admType">${typeOptions("", true)}</select></label>
        <label>Where to put it<select id="admPos">${posOptions()}</select></label>
      </div>
      <label style="margin-top:12px">Description (optional)<textarea id="admDesc" placeholder="One or two lines about the edit"></textarea></label>
      <div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">
        <button class="b pri" data-a="add">+ Add to list</button>
        <span class="hint" style="margin:0">Then press <b>Publish</b> at the bottom.</span>
      </div>
      <div class="adm-prog" id="admAddProg" hidden><i></i></div>
    </div>`;
  wireList();
  wireAdd();
  updateBar();
  status(...lastStatus);
}

function prog(el, frac){ if (!el) return; el.hidden = frac == null; el.firstElementChild.style.width = Math.round((frac || 0) * 100) + "%"; }

function move(from, to){
  if (to < 0 || to >= draft.videos.length || from === to) return;
  const [v] = draft.videos.splice(from, 1);
  draft.videos.splice(to, 0, v);
  renderDash();
  status(`Moved "${v.title}" to #${to+1}. Press Publish to save.`, "work");
}

function wireList(){
  const list = root.querySelector("#admList");
  root.querySelector("#admReel").addEventListener("change", e => { draft.showreel = e.target.value.trim(); renderDash(); });
  list.addEventListener("change", e => {
    const f = e.target.dataset.f, i = +e.target.dataset.i;
    if (!f) return;
    if (f === "pos") return move(i, +e.target.value);
    draft.videos[i][f] = e.target.value.trim();
    const row = e.target.closest(".adm-row");
    const keepOpen = row.classList.contains("open");
    renderDash();
    if (keepOpen) root.querySelector(`.adm-row[data-i="${i}"]`)?.classList.add("open");
  });
  // drag & drop reorder
  list.addEventListener("dragstart", e => {
    const row = e.target.closest(".adm-row"); if (!row) return;
    if (e.target.closest(".ed")) { e.preventDefault(); return; }
    dragFrom = +row.dataset.i; row.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(dragFrom)); } catch(_){}
  });
  list.addEventListener("dragover", e => {
    const row = e.target.closest(".adm-row"); if (!row || dragFrom == null) return;
    e.preventDefault();
    list.querySelectorAll(".drag-over").forEach(r => r.classList.remove("drag-over"));
    row.classList.add("drag-over");
  });
  list.addEventListener("drop", e => {
    const row = e.target.closest(".adm-row"); if (!row || dragFrom == null) return;
    e.preventDefault();
    const to = +row.dataset.i, from = dragFrom; dragFrom = null;
    move(from, to);
  });
  list.addEventListener("dragend", () => { dragFrom = null; list.querySelectorAll(".dragging,.drag-over").forEach(r => r.classList.remove("dragging","drag-over")); });
}

let addSrc = "file", addFile = null, addFrame = null;
function wireAdd(){
  const input = root.querySelector("#admFile"), drop = root.querySelector("#admDrop");
  addFile = null; addFrame = null;
  const pick = async f => {
    if (!f) return;
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|webm|m4v)$/i.test(f.name)) return status("Please choose a video file (mp4, mov or webm).", "err");
    const mb = f.size / 1048576;
    if (mb > MAX_MB) return status(`That file is ${mb.toFixed(0)} MB — the limit is ${MAX_MB} MB. Export a smaller version, or upload it to YouTube / Drive and use "Paste a link".`, "err");
    addFile = f;
    root.querySelector("#admDropTxt").textContent = `✓ ${f.name} · ${mb.toFixed(1)} MB`;
    const t = root.querySelector("#admTitle");
    if (!t.value) t.value = cleanName(f.name).base.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    addFrame = await captureFrame(f);
  };
  input.addEventListener("change", () => pick(input.files[0]));
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); pick(e.dataTransfer.files[0]); });
}

async function addVideo(){
  const title = root.querySelector("#admTitle").value.trim();
  const tag = root.querySelector("#admTag").value.trim();
  const desc = root.querySelector("#admDesc").value.trim();
  let type = root.querySelector("#admType").value;
  const pos = root.querySelector("#admPos").value;
  if (!title) return status("Give the video a title.", "err");
  const entry = { title, tag, type: "long", desc, tools: "", video: "", thumbnail: "" };
  const bar = root.querySelector("#admAddProg");
  busy = true; updateBar();
  try{
    if (addSrc === "link"){
      const link = root.querySelector("#admLink").value.trim();
      if (!/^https?:\/\//i.test(link)) throw new Error("Paste the full link, starting with https://");
      entry.video = link;
      if (type === "auto") type = E.srcInfo(link).tall ? "short" : "long";
    }else{
      if (!addFile) throw new Error("Choose a video file first.");
      status(`Uploading ${addFile.name}… keep this tab open.`, "work");
      entry.video = await uploadFile(addFile, "videos", f => prog(bar, f * .95));
      if (addFrame){
        const { base } = cleanName(entry.video.split("/").pop());
        entry.thumbnail = await uploadDataUrl(addFrame.dataUrl, `videos/thumb-${base}.jpg`);
        entry._preview = addFrame.dataUrl;
      }
      if (type === "auto") type = addFrame && addFrame.tall ? "short" : "long";
    }
    entry.type = type;
    const at = pos === "start" ? 0 : pos === "end" ? draft.videos.length : +pos + 1;
    draft.videos.splice(at, 0, entry);
    prog(bar, 1);
    busy = false;
    renderDash();
    status(`"${title}" added at #${at+1}. Press Publish to put it live.`, "ok");
    root.querySelector(`.adm-row[data-i="${at}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }catch(e){
    busy = false; prog(bar, null); updateBar();
    status(e.message, "err");
  }
}

async function replaceMedia(i, kind){
  const input = root.querySelector("#admRowFile");
  input.accept = kind === "video" ? "video/*" : "image/*";
  input.value = "";
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    const bar = root.querySelector(`[data-prog="${i}"]`);
    busy = true; updateBar();
    try{
      status(`Uploading ${f.name}…`, "work");
      const path = await uploadFile(f, "videos", p => prog(bar, p));
      const v = draft.videos[i];
      if (kind === "video"){
        v.video = path;
        const fr = await captureFrame(f);
        if (fr && !v.thumbnail){ v.thumbnail = await uploadDataUrl(fr.dataUrl, `videos/thumb-${cleanName(path.split("/").pop()).base}.jpg`); v._preview = fr.dataUrl; }
      } else {
        v.thumbnail = path;
        v._preview = URL.createObjectURL(f);
      }
      busy = false; renderDash();
      root.querySelector(`.adm-row[data-i="${i}"]`)?.classList.add("open");
      status("Uploaded. Press Publish to put it live.", "ok");
    }catch(e){ busy = false; prog(bar, null); updateBar(); status(e.message, "err"); }
  };
  input.click();
}

async function uploadShowreel(){
  const input = root.querySelector("#admReelFile");
  input.value = "";
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    const bar = root.querySelector("#admReelProg");
    busy = true; updateBar();
    try{
      status(`Uploading showreel ${f.name}…`, "work");
      draft.showreel = await uploadFile(f, "videos", p => prog(bar, p));
      busy = false; renderDash();
      status("Showreel uploaded. Press Publish to put it live.", "ok");
    }catch(e){ busy = false; prog(bar, null); updateBar(); status(e.message, "err"); }
  };
  input.click();
}

function lock(){
  token = "";
  try { localStorage.removeItem(TOKEN_KEY); } catch(e){}
  draft = null; pendingBlobs = {};
  renderLogin();
}

function onClick(e){
  const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
  const a = b.dataset.a, i = +b.dataset.i;
  const v = draft && draft.videos[i];
  switch (a){
    case "close": return close();
    case "login": return login();
    case "lock":
      if (isDirty() && !confirm("You have unpublished changes. Lock anyway and lose them?")) return;
      return lock();
    case "up": return move(i, i - 1);
    case "down": return move(i, i + 1);
    case "edit": return b.closest(".adm-row").classList.toggle("open");
    case "play": return playPreview(v.video, v.title);
    case "reel-play": return playPreview(draft.showreel, "Showreel");
    case "reel-upload": return uploadShowreel();
    case "del":
      if (!confirm(`Remove "${v.title}" from the website?`)) return;
      draft.videos.splice(i, 1);
      renderDash();
      return status(`Removed "${v.title}". Press Publish to save.`, "work");
    case "replace-video": return replaceMedia(i, "video");
    case "replace-thumb": return replaceMedia(i, "image");
    case "src":
      addSrc = b.dataset.v;
      root.querySelectorAll('[data-a="src"]').forEach(x => x.setAttribute("aria-pressed", x === b));
      root.querySelector("#admSrcFile").hidden = addSrc !== "file";
      root.querySelector("#admSrcLink").hidden = addSrc !== "link";
      return;
    case "add": return addVideo();
    case "publish": return publish();
    case "discard":
      if (!confirm("Throw away all unpublished changes?")) return;
      return openDash();
  }
}

function playPreview(src, title){
  if (pendingBlobs[src]) return status("This upload isn't live yet — publish first to preview it on the site.", "work");
  const s = E.srcInfo(src);
  if (s.kind === "none") return;
  const url = s.kind === "file" ? s.src : s.kind === "embed" ? s.embed : s.href;
  window.open(url, "_blank", "noopener");
}

/* ---------------- open / close ---------------- */
function open(){
  if (root){ root.hidden = false; document.getElementById("admBar").hidden = !draft; document.body.style.overflow = "hidden"; return; }
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  root = document.createElement("div");
  root.className = "adm"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Video manager");
  root.innerHTML = `<div class="adm-in"></div>`;
  document.body.appendChild(root);
  const bar = document.createElement("div");
  bar.className = "adm adm-bar"; bar.id = "admBar"; bar.hidden = true;
  bar.style.cssText = "position:fixed;inset:auto 0 0 0;padding:12px 16px;overflow:visible;background:var(--ink-2)";
  bar.innerHTML = `<div class="in">
    <span class="msg"></span>
    <label class="chk" hidden><input type="checkbox" id="admCleanup" checked> Also delete removed video files from storage</label>
    <button class="b" data-a="discard" id="admDiscard">Discard</button>
    <button class="b pri" data-a="publish" id="admPublish">Publish changes</button>
  </div>`;
  document.body.appendChild(bar);
  root.addEventListener("click", onClick);
  bar.addEventListener("click", onClick);
  document.body.style.overflow = "hidden";
  if (token) openDash(); else renderLogin();
}
function close(){
  if (!root) return;
  if (isDirty() && !confirm("You have unpublished changes. Close anyway? (They stay here until you reload the page.)")) return;
  root.hidden = true;
  document.getElementById("admBar").hidden = true;
  document.body.style.overflow = "";
  if (location.hash === "#admin") history.replaceState(null, "", location.pathname + location.search);
}

window.addEventListener("beforeunload", e => { if (isDirty()){ e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")){ e.preventDefault(); open(); }
});
window.addEventListener("hashchange", () => { if (location.hash === "#admin") open(); });
if (location.hash === "#admin") open();
})();
