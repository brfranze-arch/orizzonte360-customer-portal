(() => {
  const cfg = window.ORIZZONTE_PORTAL_CONFIG || {};
  const data = window.ORIZZONTE_DEMO_DATA;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = {
    tickets: JSON.parse(localStorage.getItem("o360_tickets") || "null") || data.tickets,
    notifications: JSON.parse(localStorage.getItem("o360_notifications") || "null") || data.notifications,
    page: "dashboard",
    token: localStorage.getItem("o360_portal_token") || "",
    profile: null,
    license: null,
    downloads: [],
    releases: [],
    activations: []
  };

  const loginView = $("#loginView");
  const portalView = $("#portalView");
  const content = $("#content");
  const pageTitle = $("#pageTitle");
  const sidebar = $(".sidebar");

  function esc(v="") {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2600);
  }
  function save() {
    localStorage.setItem("o360_tickets", JSON.stringify(state.tickets));
    localStorage.setItem("o360_notifications", JSON.stringify(state.notifications));
  }
  function downloadText(filename, text, type="text/plain") {
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  function statusClass(status) {
    const s = String(status).toLowerCase();
    if (["attiva","pagata","disponibile","aperto"].some(v => s.includes(v))) return "status-active";
    if (["chiuso","archiviata"].some(v => s.includes(v))) return "status-closed";
    if (["preparazione","pianificata","non disponibile"].some(v => s.includes(v))) return "status-warning";
    return "status-info";
  }
  async function api(path, options={}) {
    const headers = {...(options.headers || {})};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(`${cfg.apiUrl}${path}`, {...options, headers});
    let payload;
    try { payload = await response.json(); } catch { payload = {error:"Risposta backend non valida"}; }
    if (!response.ok && !payload.error) payload.error = `Errore HTTP ${response.status}`;
    return payload;
  }

  async function loadRealProfile() {
    const result = await api("/api/portal/profile");
    if (result.error) throw new Error(result.error);
    state.profile = result;
    data.customer.name = result.name;
    data.customer.initials = result.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
    data.customer.email = result.email;
    data.customer.company = result.company_name || "Azienda non impostata";
    data.customer.role = result.job_title || result.role;
    $$(".avatar").forEach(x=>x.textContent=data.customer.initials);
    const chip=$(".user-chip span:last-child");
    if(chip) chip.innerHTML=`<strong>${esc(result.name)}</strong><small>${esc(result.role)}</small>`;
  }

  function fmtDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("it-IT");
  }
  function fmtBytes(value) {
    const bytes = Number(value || 0);
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  function deviceFingerprint() {
    let value = localStorage.getItem("o360_device_fingerprint");
    if (!value) {
      value = `${navigator.platform}-${navigator.language}-${screen.width}x${screen.height}-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
      localStorage.setItem("o360_device_fingerprint", value);
    }
    return value;
  }
  async function loadPortalCommerceData() {
    const [license, downloads, releases, activations] = await Promise.all([
      api("/api/portal/license"),
      api("/api/portal/downloads"),
      api("/api/portal/releases"),
      api("/api/portal/license/activations")
    ]);
    if (license.error) throw new Error(license.error);
    if (downloads.error) throw new Error(downloads.error);
    if (releases.error) throw new Error(releases.error);
    state.license = license;
    state.downloads = Array.isArray(downloads) ? downloads : [];
    state.releases = Array.isArray(releases) ? releases : [];
    state.activations = Array.isArray(activations) ? activations : [];
    data.customer.plan = license.plan || data.customer.plan;
    data.license = {
      code: license.license_key,
      status: license.status,
      edition: license.edition,
      seats: license.max_seats,
      usedSeats: license.used_seats,
      companies: license.max_companies,
      usedCompanies: license.used_companies,
      renewal: fmtDate(license.expires_at),
      activatedAt: fmtDate(license.starts_at),
      environment: license.edition,
      currentVersion: license.current_version
    };
  }

  function unreadCount() {
    const n = state.notifications.filter(x => !x.read).length;
    $("#notificationCount").textContent = n;
    $("#notificationCount").style.display = n ? "" : "none";
  }
  function pageHead(title, subtitle, action="") {
    return `<div class="page-head"><div><span class="eyebrow">Orizzonte360</span><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>`;
  }
  function setActive(page) {
    state.page = page;
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    pageTitle.textContent = ({
      dashboard:"Dashboard",licenses:"Licenze",downloads:"Download Center",releases:"Release Center",
      docs:"Documentazione",academy:"Academy",tickets:"Ticket",billing:"Billing",
      notifications:"Notifiche",profile:"Profilo"
    })[page] || page;
  }

  const views = {
    dashboard() {
      const lic = data.license, c = data.customer;
      return pageHead(`Benvenuto, ${esc(c.name.split(" ")[0])}`, `${esc(c.company)} · ${esc(c.tenant)}`,
        `<button class="btn btn-primary" data-page="downloads">Apri Download Center</button>`) + `
      <div class="grid kpi-grid">
        <article class="card kpi"><span class="kpi-label">Piano</span><div class="kpi-value">${esc(c.plan)}</div><span class="kpi-meta">Licenza attiva</span></article>
        <article class="card kpi"><span class="kpi-label">Versione</span><div class="kpi-value">1.0.0</div><span class="kpi-meta">RC1 disponibile</span></article>
        <article class="card kpi"><span class="kpi-label">Postazioni</span><div class="kpi-value">${lic.usedSeats}/${lic.seats}</div><span class="kpi-meta">3 disponibili</span></article>
        <article class="card kpi"><span class="kpi-label">Ticket aperti</span><div class="kpi-value">${state.tickets.filter(t=>t.status==="Aperto").length}</div><span class="kpi-meta">Supporto operativo</span></article>
      </div>
      <div class="grid two-col" style="margin-top:18px">
        <section class="card">
          <h3>Azioni rapide</h3>
          <div class="quick-grid">
            <button class="quick-action" data-page="licenses"><strong>Licenza</strong><span>Stato e attivazioni</span></button>
            <button class="quick-action" data-page="downloads"><strong>Download</strong><span>Software e manuali</span></button>
            <button class="quick-action" data-page="tickets"><strong>Supporto</strong><span>Apri o controlla ticket</span></button>
            <button class="quick-action" data-page="billing"><strong>Billing</strong><span>Fatture e piano</span></button>
          </div>
        </section>
        <section class="card">
          <h3>Stato licenza</h3>
          <p><span class="status status-active">${esc(lic.status)}</span></p>
          <p><strong>${esc(lic.edition)}</strong><br><small>${esc(lic.code)}</small></p>
          <div class="progress"><span style="width:${lic.usedSeats/lic.seats*100}%"></span></div>
          <p class="kpi-label">${lic.usedSeats} postazioni utilizzate su ${lic.seats}</p>
        </section>
      </div>
      <div class="grid two-col" style="margin-top:18px">
        <section class="card"><h3>Attività recente</h3><div class="timeline">
          <div class="timeline-item"><span class="dot"></span><div><strong>Import Enterprise completato</strong><small>120 entrate e 20 clienti elaborati</small></div></div>
          <div class="timeline-item"><span class="dot"></span><div><strong>Release RC1 pubblicata</strong><small>Digital Twin, diagnostica e manifest</small></div></div>
          <div class="timeline-item"><span class="dot"></span><div><strong>Pagamento ricevuto</strong><small>Fattura Professional pagata</small></div></div>
        </div></section>
        <section class="card"><h3>Notifiche</h3>
          ${state.notifications.slice(0,3).map(n=>`<div class="notification ${n.read?"":"unread"}"><span class="notification-icon">●</span><div><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p></div></div>`).join("")}
          <button class="btn btn-secondary btn-small" data-page="notifications">Vedi tutte</button>
        </section>
      </div>`;
    },
    licenses() {
      const l = state.license || {};
      const usedSeats = Number(l.used_seats || 0), maxSeats = Number(l.max_seats || 1);
      const usedCompanies = Number(l.used_companies || 0), maxCompanies = Number(l.max_companies || 1);
      return pageHead("Licenze","Stato reale, limiti e dispositivi autorizzati.",
        `<button class="btn btn-secondary" id="exportLicense">Esporta licenza</button>`) + `
      <div class="grid two-col">
        <section class="card">
          <h3>Licenza principale</h3>
          <p><span class="status ${statusClass(l.status || "active")}">${esc(l.status || "active")}</span></p>
          <table class="data-table"><tbody>
            <tr><th>Codice</th><td><strong>${esc(l.license_key || "—")}</strong></td></tr>
            <tr><th>Piano</th><td>${esc(l.plan || "FREE")}</td></tr>
            <tr><th>Edizione</th><td>${esc(l.edition || "SAAS_CLOUD")}</td></tr>
            <tr><th>Versione</th><td>${esc(l.current_version || "—")}</td></tr>
            <tr><th>Attivata</th><td>${fmtDate(l.starts_at)}</td></tr>
            <tr><th>Scadenza / rinnovo</th><td>${fmtDate(l.expires_at)}</td></tr>
          </tbody></table>
        </section>
        <section class="card">
          <h3>Utilizzo</h3>
          <p><strong>Postazioni: ${usedSeats}/${maxSeats}</strong></p><div class="progress"><span style="width:${Math.min(100,usedSeats/maxSeats*100)}%"></span></div>
          <p><strong>Aziende: ${usedCompanies}/${maxCompanies}</strong></p><div class="progress"><span style="width:${Math.min(100,usedCompanies/maxCompanies*100)}%"></span></div>
          <p class="notice">I limiti sono sincronizzati con il piano Billing reale.</p>
          <button class="btn btn-primary btn-small" id="activateThisDevice">Attiva questo dispositivo</button>
        </section>
      </div>
      <section class="card" style="margin-top:18px"><h3>Dispositivi e postazioni</h3>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Dispositivo</th><th>Fingerprint</th><th>Attivato</th><th>Ultimo accesso</th><th>Stato</th><th></th></tr></thead><tbody>
        ${state.activations.length ? state.activations.map(a=>`<tr><td><strong>${esc(a.device_name)}</strong></td><td>${esc(String(a.device_fingerprint).slice(0,22))}…</td><td>${fmtDate(a.activated_at)}</td><td>${fmtDate(a.last_seen_at)}</td><td><span class="status ${a.active?"status-active":"status-closed"}">${a.active?"Attivo":"Disattivato"}</span></td><td>${a.active?`<button class="btn btn-secondary btn-small deactivate-device" data-id="${a.id}">Disattiva</button>`:""}</td></tr>`).join(""):`<tr><td colspan="6">Nessun dispositivo attivato.</td></tr>`}
        </tbody></table></div>
      </section>`;
    },
    downloads() {
      const categories=[...new Set(state.downloads.map(d=>d.category))];
      return pageHead("Download Center","Risorse reali protette da licenza e token temporaneo.") + `
      <div class="filters"><button class="filter-btn active" data-filter="Tutti">Tutti</button>${categories.map(x=>`<button class="filter-btn" data-filter="${esc(x)}">${esc(x)}</button>`).join("")}</div>
      <div id="downloadGrid" class="item-grid">
        ${state.downloads.length ? state.downloads.map(d=>`<article class="resource-card" data-type="${esc(d.category)}"><div class="resource-meta"><span>${esc(d.category)}</span><span>${esc(d.version)}</span></div><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p><div class="resource-meta"><span>${fmtBytes(d.size_bytes)}</span><span>Piano minimo: ${esc(d.min_plan)}</span></div><small>SHA-256: ${esc(String(d.checksum_sha256 || "").slice(0,18))}…</small><button class="btn ${d.entitled?"btn-primary":"btn-secondary"} btn-small secure-download" data-id="${d.id}" ${d.entitled?"":"disabled"}>${d.entitled?"Scarica in modo sicuro":"Non incluso nel piano"}</button></article>`).join(""):`<div class="empty">Nessuna risorsa disponibile.</div>`}
      </div>
      <section class="card" style="margin-top:18px"><h3>Come funziona la protezione</h3><p class="notice">Ogni download genera un token monouso valido 5 minuti. Il backend verifica utente, piano, edizione e disponibilità del file.</p><button class="btn btn-secondary btn-small" id="loadDownloadHistory">Storico download</button><div id="downloadHistory"></div></section>`;
    },
    releases() {
      return pageHead("Release Center","Versioni e changelog letti dal backend.") + `
      <section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Versione</th><th>Pubblicata</th><th>Canale</th><th>Stato</th><th>Novità</th><th></th></tr></thead><tbody>
        ${state.releases.length ? state.releases.map(r=>`<tr><td><strong>${esc(r.version)}</strong><br><small>${esc(r.title)}</small></td><td>${fmtDate(r.published_at)}</td><td>${esc(r.channel)}</td><td><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></td><td>${esc(r.summary)}</td><td><button class="btn btn-secondary btn-small release-notes-btn" data-id="${r.id}">Note</button></td></tr>`).join(""):`<tr><td colspan="6">Nessuna release disponibile.</td></tr>`}
      </tbody></table></div></section>`;
    },
    docs() {
      return pageHead("Documentazione","Manuali operativi, tecnici e commerciali.") + `
      <div class="item-grid">${data.docs.map(d=>`<article class="resource-card"><span class="status ${statusClass(d.status)}">${esc(d.status)}</span><h3>${esc(d.title)}</h3><p>${esc(d.description)}</p><div class="resource-meta"><span>${esc(d.category)}</span><span>PDF / DOCX</span></div><button class="btn btn-secondary btn-small doc-action" data-doc="${esc(d.title)}">${d.status==="Disponibile"?"Apri":"Avvisami"}</button></article>`).join("")}</div>`;
    },
    academy() {
      return pageHead("Orizzonte360 Academy","Percorsi di formazione per utenti, amministratori e partner.") + `
      <div class="item-grid">${data.academy.map((a,i)=>`<article class="resource-card"><div class="resource-meta"><span>${esc(a.level)}</span><span>${esc(a.duration)}</span></div><h3>${esc(a.title)}</h3><p>Avanzamento corso</p><div class="progress"><span style="width:${a.progress}%"></span></div><span class="kpi-label">${a.progress}% completato</span><button class="btn btn-secondary btn-small course-btn" data-course="${i}">${a.progress===100?"Rivedi":a.progress>0?"Continua":"Inizia"}</button></article>`).join("")}</div>`;
    },
    tickets() {
      return pageHead("Supporto e Ticket","Apri richieste tecniche, commerciali o di miglioramento.",
        `<button class="btn btn-primary" id="newTicket">Nuovo ticket</button>`) + `
      <section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Oggetto</th><th>Categoria</th><th>Priorità</th><th>Stato</th><th>Aggiornato</th></tr></thead><tbody>
        ${state.tickets.map(t=>`<tr><td><strong>${esc(t.id)}</strong></td><td>${esc(t.subject)}</td><td>${esc(t.category)}</td><td>${esc(t.priority)}</td><td><span class="status ${statusClass(t.status)}">${esc(t.status)}</span></td><td>${esc(t.updated)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
    },
    billing() {
      return pageHead("Billing","Piano, rinnovi, fatture e gestione abbonamento.",
        `<button class="btn btn-primary" id="openBilling">Gestisci abbonamento</button>`) + `
      <div class="grid kpi-grid">
        <article class="card kpi"><span class="kpi-label">Piano</span><div class="kpi-value">${esc(data.customer.plan)}</div><span class="kpi-meta">Attivo</span></article>
        <article class="card kpi"><span class="kpi-label">Canone</span><div class="kpi-value">€49</div><span class="kpi-meta">mensile</span></article>
        <article class="card kpi"><span class="kpi-label">Prossimo rinnovo</span><div class="kpi-value" style="font-size:20px">${esc(data.license.renewal)}</div><span class="kpi-meta">Rinnovo automatico</span></article>
        <article class="card kpi"><span class="kpi-label">Provider</span><div class="kpi-value" style="font-size:24px">Stripe</div><span class="kpi-meta">Pagamento sicuro</span></article>
      </div>
      <section class="card" style="margin-top:18px"><h3>Fatture recenti</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Numero</th><th>Data</th><th>Descrizione</th><th>Importo</th><th>Stato</th><th></th></tr></thead><tbody>
        ${data.invoices.map(i=>`<tr><td><strong>${esc(i.number)}</strong></td><td>${esc(i.date)}</td><td>${esc(i.description)}</td><td>${esc(i.amount)}</td><td><span class="status status-active">${esc(i.status)}</span></td><td><button class="btn btn-secondary btn-small invoice-btn" data-invoice="${esc(i.number)}">Esporta</button></td></tr>`).join("")}
      </tbody></table></div></section>`;
    },
    notifications() {
      return pageHead("Notifiche","Release, documentazione, billing e supporto.",
        `<button class="btn btn-secondary" id="markAllRead">Segna tutte come lette</button>`) + `
      <section class="card"><div class="notification-list">${state.notifications.length ? state.notifications.map(n=>`<article class="notification ${n.read?"":"unread"}"><span class="notification-icon">${n.type==="release"?"↻":n.type==="billing"?"€":"▤"}</span><div><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(n.date)}</small></div><button class="btn btn-secondary btn-small read-notification" data-id="${n.id}">${n.read?"Letta":"Segna letta"}</button></article>`).join("") : `<div class="empty">Nessuna notifica.</div>`}</div></section>`;
    },
    profile() {
      const c=data.customer;
      return pageHead("Profilo cliente","Dati personali, aziendali e preferenze.") + `
      <section class="card"><div class="profile-grid"><div><div class="profile-avatar">${esc(c.initials)}</div><p><span class="status status-active">${esc(c.plan)}</span></p></div>
      <form id="profileForm" class="ticket-form">
        <label>Nome e cognome<input name="name" value="${esc(c.name)}"></label>
        <label>Email<input type="email" name="email" value="${esc(c.email)}"></label>
        <label>Azienda<input name="company" value="${esc(c.company)}"></label>
        <label>Ruolo<input name="role" value="${esc(c.role)}"></label>
        <label class="full">Workspace<input value="${esc(c.tenant)}" disabled></label>
        <div class="full"><button class="btn btn-primary" type="submit">Salva profilo</button></div>
      </form></div></section>
      <section class="card" style="margin-top:18px"><h3>Sicurezza</h3><p class="notice">Autenticazione e cambio password sono collegati al backend. La 2FA sarà introdotta in un pacchetto successivo.</p><button class="btn btn-secondary" id="changePassword">Richiedi cambio password</button></section>`;
    }
  };

  function render(page) {
    setActive(page);
    content.innerHTML = views[page] ? views[page]() : views.dashboard();
    bindDynamic();
    sidebar.classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function modal(title, html) {
    const wrap=document.createElement("div");
    wrap.className="modal-backdrop";
    wrap.innerHTML=`<div class="modal"><div class="modal-head"><h3>${title}</h3><button class="modal-close">×</button></div>${html}</div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", e => { if(e.target===wrap || e.target.classList.contains("modal-close")) wrap.remove(); });
    return wrap;
  }

  function newTicketModal() {
    const m=modal("Nuovo ticket",`<form id="ticketForm" class="ticket-form">
      <label>Categoria<select name="category"><option>Supporto</option><option>Bug</option><option>Commerciale</option><option>Feature Request</option></select></label>
      <label>Priorità<select name="priority"><option>Bassa</option><option selected>Media</option><option>Alta</option></select></label>
      <label class="full">Oggetto<input name="subject" required></label>
      <label class="full">Descrizione<textarea name="description" rows="5" required></textarea></label>
      <div class="full"><button class="btn btn-primary" type="submit">Invia ticket</button></div>
    </form>`);
    $("#ticketForm",m).addEventListener("submit",e=>{
      e.preventDefault(); const f=new FormData(e.currentTarget);
      state.tickets.unshift({id:`TCK-${1043+state.tickets.length}`,subject:f.get("subject"),category:f.get("category"),priority:f.get("priority"),status:"Aperto",updated:new Date().toLocaleDateString("it-IT")});
      save(); m.remove(); toast("Ticket creato in modalità demo"); render("tickets");
    });
  }

  function bindDynamic() {
    $$('[data-page]', content).forEach(x=>x.addEventListener('click',()=>render(x.dataset.page)));
    $('#exportLicense')?.addEventListener('click',()=>downloadText('orizzonte360-licenza.json',JSON.stringify(state.license,null,2),'application/json'));
    $('#activateThisDevice')?.addEventListener('click', async()=>{
      const result=await api('/api/portal/license/activate',{method:'POST',body:JSON.stringify({device_name:navigator.userAgent.includes('Mobile')?'Browser mobile':'Browser desktop',device_fingerprint:deviceFingerprint()})});
      if(result.error){toast(result.error);return;} toast(result.message); await loadPortalCommerceData(); render('licenses');
    });
    $$('.deactivate-device').forEach(b=>b.addEventListener('click',async()=>{const result=await api(`/api/portal/license/activations/${b.dataset.id}`,{method:'DELETE'});if(result.error){toast(result.error);return;}toast(result.message);await loadPortalCommerceData();render('licenses');}));
    $$('.secure-download').forEach(b=>b.addEventListener('click',async()=>{const result=await api(`/api/portal/downloads/${b.dataset.id}/token`,{method:'POST'});if(result.error){toast(result.error);return;}window.location.href=`${cfg.apiUrl}${result.download_url}`;}));
    $('#loadDownloadHistory')?.addEventListener('click',async()=>{const rows=await api('/api/portal/downloads/history');const target=$('#downloadHistory');if(rows.error){target.innerHTML=`<p>${esc(rows.error)}</p>`;return;}target.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>File</th><th>Data</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.file_name)}</td><td>${fmtDate(x.downloaded_at)}</td></tr>`).join(''):`<tr><td colspan="2">Nessun download.</td></tr>`}</tbody></table></div>`;});
    $$('.release-notes-btn').forEach(b=>b.addEventListener('click',async()=>{const response=await fetch(`${cfg.apiUrl}/api/portal/releases/${b.dataset.id}/notes`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok){toast('Impossibile aprire le note');return;}const text=await response.text();downloadText(`release-notes-${b.dataset.id}.txt`,text);}));
    $('#newTicket')?.addEventListener('click',newTicketModal);
    $('#openBilling')?.addEventListener('click',()=>toast('Collegamento Stripe Customer Portal previsto nel PACK 02D'));
    $('#markAllRead')?.addEventListener('click',()=>{state.notifications.forEach(n=>n.read=true);save();unreadCount();render('notifications')});
    $$('.read-notification').forEach(b=>b.addEventListener('click',()=>{const n=state.notifications.find(x=>x.id===Number(b.dataset.id));if(n)n.read=true;save();unreadCount();render('notifications')}));
    $$('.filter-btn').forEach(b=>b.addEventListener('click',()=>{$$('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('[data-type]').forEach(c=>c.style.display=b.dataset.filter==='Tutti'||c.dataset.type===b.dataset.filter?'':'none')}));
    $$('.doc-action').forEach(b=>b.addEventListener('click',()=>toast(`${b.dataset.doc}: richiesta registrata`)));
    $$('.course-btn').forEach(b=>b.addEventListener('click',()=>toast('Corso aperto in modalità demo')));
    $$('.invoice-btn').forEach(b=>b.addEventListener('click',()=>downloadText(`${b.dataset.invoice}.txt`,`Fattura demo ${b.dataset.invoice}`)));
    $('#profileForm')?.addEventListener('submit',async e=>{
      e.preventDefault(); const f=new FormData(e.currentTarget);
      const payload={name:f.get('name'),email:f.get('email'),company_name:f.get('company'),job_title:f.get('role'),phone:'',preferred_language:'it'};
      const result=await api('/api/portal/profile',{method:'PUT',body:JSON.stringify(payload)});
      if(result.error){toast(result.error);return;}
      await loadRealProfile(); toast('Profilo aggiornato'); render('profile');
    });
    $('#changePassword')?.addEventListener('click',()=>{
      const m=modal('Cambia password',`<form id="passwordForm" class="ticket-form"><label class="full">Password attuale<input type="password" name="current" required></label><label class="full">Nuova password<input type="password" name="next" minlength="8" required></label><label class="full">Conferma nuova password<input type="password" name="confirm" minlength="8" required></label><div class="full"><button class="btn btn-primary" type="submit">Aggiorna password</button></div></form>`);
      $('#passwordForm',m).addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('next')!==f.get('confirm')){toast('Le nuove password non coincidono');return;}const result=await api('/api/portal/change-password',{method:'POST',body:JSON.stringify({current_password:f.get('current'),new_password:f.get('next')})});if(result.error){toast(result.error);return;}state.token=result.token;localStorage.setItem('o360_portal_token',state.token);m.remove();toast('Password aggiornata');});
    });
  }

  async function openPortal() {
    try {
      await loadRealProfile();
      await loadPortalCommerceData();
      loginView.classList.add("hidden"); portalView.classList.remove("hidden");
      unreadCount(); render("dashboard");
    } catch (error) {
      state.token=""; localStorage.removeItem("o360_portal_token");
      portalView.classList.add("hidden"); loginView.classList.remove("hidden");
      toast(error.message || "Sessione non valida");
    }
  }

  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const email=$("#loginEmail").value.trim();
    const password=$("#loginPassword").value;
    const query=new URLSearchParams({email,password});
    const result=await api(`/api/auth/login?${query.toString()}`,{method:"POST"});
    if(result.error){toast(result.error);return;}
    state.token=result.token; localStorage.setItem("o360_portal_token",state.token);
    await openPortal();
  });
  $("#logoutBtn").addEventListener("click",async()=>{
    try { await api("/api/portal/logout",{method:"POST"}); } catch {}
    state.token=""; state.profile=null; localStorage.removeItem("o360_portal_token");
    portalView.classList.add("hidden"); loginView.classList.remove("hidden");
  });
  $("#menuToggle").addEventListener("click",()=>sidebar.classList.toggle("open"));
  $("#sidebarNav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)render(b.dataset.page)});
  $(".sidebar-brand").addEventListener("click",e=>{e.preventDefault();render("dashboard")});
  $(".user-chip").addEventListener("click",()=>render("profile"));
  $("#quickSupport").addEventListener("click",newTicketModal);
  $("#openProduct").addEventListener("click",()=>window.open(cfg.productUrl || "#","_blank","noopener"));

  if(state.token) openPortal();
})();