(() => {
  const cfg = window.ORIZZONTE_PORTAL_CONFIG || {};
  const data = window.ORIZZONTE_DEMO_DATA;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const state = {
    tickets: [],
    notifications: [],
    ticketMeta: null,
    page: "dashboard",
    token: localStorage.getItem("o360_portal_token") || "",
    profile: null,
    license: null,
    downloads: [],
    releases: [],
    activations: [],
    billing: null,
    invoices: [],
    marketplace: [],
    marketplaceCategories: [],
    myModules: [],
    loadingSecondary: false
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
    if (!response.ok && !payload.error) payload.error = payload.detail || `Errore HTTP ${response.status}`;
    return payload;
  }

  const PROFILE_CACHE_KEY = "o360_portal_profile_cache_v1";

  function applyProfile(result) {
    if (!result || !result.name) return;
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

  function restoreCachedProfile() {
    try {
      const cached = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
      if (!cached || !cached.profile || Date.now() - cached.savedAt > 86400000) return false;
      applyProfile(cached.profile);
      return true;
    } catch {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return false;
    }
  }

  function saveCachedProfile(profile) {
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({profile, savedAt:Date.now()}));
    } catch {}
  }

  async function loadRealProfile() {
    const result = await api("/api/portal/profile");
    if (result.error) throw new Error(result.error);
    applyProfile(result);
    saveCachedProfile(result);
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

  async function loadBillingData() {
    const [summary, invoices] = await Promise.all([
      api("/api/portal/billing/summary"),
      api("/api/portal/billing/invoices")
    ]);
    if (summary.error || summary.detail) throw new Error(summary.error || summary.detail);
    state.billing = summary;
    state.invoices = Array.isArray(invoices) ? invoices : [];
  }

  function fmtMoney(value, currency="EUR") {
    return new Intl.NumberFormat("it-IT", {style:"currency", currency}).format(Number(value || 0));
  }

  async function loadMarketplaceData() {
    const [categories,catalog,myModules]=await Promise.all([api("/api/marketplace/categories"),api("/api/marketplace/catalog"),api("/api/marketplace/my-modules")]);
    state.marketplaceCategories=Array.isArray(categories)?categories:[];
    state.marketplace=Array.isArray(catalog)?catalog:[];
    state.myModules=Array.isArray(myModules)?myModules:[];
  }

  async function loadSupportData() {
    const [tickets, notifications, meta] = await Promise.all([
      api("/api/portal/tickets"), api("/api/portal/notifications"), api("/api/portal/tickets/meta")
    ]);
    if (tickets.error) throw new Error(tickets.error);
    if (notifications.error) throw new Error(notifications.error);
    state.tickets = Array.isArray(tickets) ? tickets : [];
    state.notifications = Array.isArray(notifications) ? notifications : [];
    state.ticketMeta = meta.error ? null : meta;
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
      dashboard:"Dashboard",licenses:"Licenze",downloads:"Download Center",releases:"Release Center",marketplace:"Marketplace","my-modules":"I miei moduli",
      docs:"Documentazione",academy:"Academy",tickets:"Ticket",billing:"Abbonamento",
      notifications:"Notifiche",profile:"Profilo"
    })[page] || page;
  }

  const views = {
    dashboard() {
      const lic = data.license || {usedSeats:"—",seats:"—"}, c = data.customer;
      return pageHead(`Benvenuto, ${esc(c.name.split(" ")[0])}`, `${esc(c.company)} · ${esc(c.tenant)}`,
        `<button class="btn btn-primary" data-page="downloads">Apri Download Center</button>`) + `
      <div class="grid kpi-grid">
        <article class="card kpi"><span class="kpi-label">Piano</span><div class="kpi-value">${esc(c.plan)}</div><span class="kpi-meta">Licenza attiva</span></article>
        <article class="card kpi"><span class="kpi-label">Versione</span><div class="kpi-value">1.0.0</div><span class="kpi-meta">RC1 disponibile</span></article>
        <article class="card kpi"><span class="kpi-label">Postazioni</span><div class="kpi-value">${state.loadingSecondary ? "…" : `${lic.usedSeats}/${lic.seats}`}</div><span class="kpi-meta">3 disponibili</span></article>
        <article class="card kpi"><span class="kpi-label">Ticket aperti</span><div class="kpi-value">${state.loadingSecondary ? "…" : state.tickets.filter(t=>!["RISOLTO","CHIUSO"].includes(t.status)).length}</div><span class="kpi-meta">Supporto operativo</span></article>
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
      return pageHead("Supporto e Ticket","Richieste reali collegate al backend Orizzonte360.",
        `<button class="btn btn-primary" id="newTicket">Nuovo ticket</button>`) + `
      <section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Oggetto</th><th>Categoria</th><th>Priorità</th><th>Stato</th><th>Aggiornato</th></tr></thead><tbody>
        ${state.tickets.length ? state.tickets.map(t=>`<tr class="ticket-row" data-ticket-id="${t.id}"><td><strong>${esc(t.code)}</strong></td><td>${esc(t.subject)}</td><td>${esc(t.category)}</td><td>${esc(t.priority)}</td><td><span class="status ${statusClass(t.status)}">${esc(t.status)}</span></td><td>${fmtDate(t.updated_at)}</td></tr>`).join("") : `<tr><td colspan="6">Nessun ticket presente.</td></tr>`}
      </tbody></table></div></section>`;
    },
    billing() {
      const b = state.billing || {};
      const payment = b.payment_method;
      const paymentText = payment ? `${String(payment.brand || "Carta").toUpperCase()} •••• ${payment.last4} · ${payment.exp_month}/${payment.exp_year}` : "Non disponibile";
      const cancelText = b.cancel_at_period_end ? "Cancellazione programmata" : "Rinnovo automatico";
      const stripeConnected = Boolean(b.stripe_customer_connected);
      const actions = `<button class="btn btn-secondary" id="syncBilling">Sincronizza</button>${stripeConnected ? ` <button class="btn btn-primary" id="openBilling">Gestisci con Stripe</button>` : ""}`;
      const checkoutPlans = !stripeConnected ? `
        <section class="card" style="margin-top:18px">
          <h3>Scegli il tuo piano</h3>
          <p>Completa un pagamento di prova su Stripe Test Mode. Dopo il checkout potrai gestire upgrade, downgrade, carta e cancellazione dal portale Stripe.</p>
          <div class="quick-grid" style="margin-top:18px">
            <button class="quick-action checkout-plan" data-plan="PROFESSIONAL"><strong>Professional</strong><span>Passa al piano Professional</span></button>
            <button class="quick-action checkout-plan" data-plan="BUSINESS"><strong>Business</strong><span>Passa al piano Business</span></button>
            <button class="quick-action checkout-plan" data-plan="ENTERPRISE"><strong>Enterprise</strong><span>Passa al piano Enterprise</span></button>
          </div>
          <p class="kpi-label" style="margin-top:16px">Il pagamento è simulato: nessun addebito reale.</p>
        </section>` : `
        <section class="card" style="margin-top:18px"><h3>Gestione abbonamento</h3><p>Upgrade, downgrade, aggiornamento carta, cancellazione e riattivazione vengono eseguiti nel Customer Portal Stripe.</p><p><strong>Stato:</strong> ${esc(b.status || "—")} · <strong>Provider:</strong> ${esc(b.provider || "internal")} · <strong>Fine prevista:</strong> ${fmtDate(b.cancel_date)}</p></section>`;
      return pageHead("Abbonamento","Piano, pagamento, fatture e gestione sicura tramite Stripe.", actions) + `
      <div class="grid kpi-grid">
        <article class="card kpi"><span class="kpi-label">Piano</span><div class="kpi-value">${esc(b.plan || data.customer.plan)}</div><span class="kpi-meta">${esc(b.status || "active")}</span></article>
        <article class="card kpi"><span class="kpi-label">Canone</span><div class="kpi-value">${fmtMoney(b.price_month, b.currency || "EUR")}</div><span class="kpi-meta">al mese</span></article>
        <article class="card kpi"><span class="kpi-label">Prossimo rinnovo</span><div class="kpi-value" style="font-size:20px">${fmtDate(b.renewal_date)}</div><span class="kpi-meta">${cancelText}</span></article>
        <article class="card kpi"><span class="kpi-label">Metodo pagamento</span><div class="kpi-value" style="font-size:18px">${esc(paymentText)}</div><span class="kpi-meta">Stripe Test Mode</span></article>
      </div>
      ${b.sync_error ? `<p class="notice" style="margin-top:18px">Ultima sincronizzazione Stripe non riuscita: ${esc(b.sync_error)}</p>` : ""}
      ${checkoutPlans}
      <section class="card" style="margin-top:18px"><h3>Fatture reali</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Numero</th><th>Data</th><th>Importo</th><th>Stato</th><th></th></tr></thead><tbody>
        ${state.invoices.length ? state.invoices.map(i=>`<tr><td><strong>${esc(i.number)}</strong></td><td>${fmtDate(i.created_at)}</td><td>${fmtMoney(i.amount,i.currency||"EUR")}</td><td><span class="status ${statusClass(i.status)}">${esc(i.status)}</span></td><td>${i.hosted_invoice_url||i.invoice_pdf?`<button class="btn btn-secondary btn-small invoice-open" data-url="${esc(i.hosted_invoice_url||i.invoice_pdf)}">Apri</button>`:"—"}</td></tr>`).join("") : `<tr><td colspan="5">Nessuna fattura Stripe disponibile.</td></tr>`}
      </tbody></table></div></section>`;
    },
    marketplace() {
      return pageHead("Marketplace","Scopri e installa nuovi moduli Orizzonte360.") + `
      <section class="card"><div class="market-toolbar"><input id="marketSearch" placeholder="Cerca moduli"><select id="marketCategory"><option value="">Tutte le categorie</option>${state.marketplaceCategories.map(c=>`<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("")}</select></div></section>
      <div class="item-grid" id="marketGrid">${state.marketplace.map(m=>`<article class="resource-card market-card" data-name="${esc((m.name+' '+m.short_description).toLowerCase())}" data-category="${esc(m.category?.slug||'')}"><div class="resource-meta"><span>${esc(m.category?.name||'Marketplace')}</span><span>${esc(m.required_plan)}</span></div><h3>${esc(m.icon)} ${esc(m.name)}</h3><p>${esc(m.short_description)}</p><div class="resource-meta"><strong>${m.billing_type==='FREE'?'Gratis':fmtMoney(m.price,m.currency)}</strong><span>v${esc(m.version)}</span></div>${m.installed?`<button class="btn btn-secondary btn-small" disabled>Installato</button>`:m.billing_type==='FREE'?`<button class="btn btn-primary btn-small market-install" data-id="${m.id}">Installa</button>`:`<button class="btn btn-secondary btn-small" disabled>Disponibile nel PACK 05C</button>`}</article>`).join("")}</div>`;
    },
    "my-modules"() {
      return pageHead("I miei moduli","Installazioni, versioni e licenze Marketplace.") + `<section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Modulo</th><th>Versione</th><th>Stato</th><th>Installato</th><th></th></tr></thead><tbody>${state.myModules.length?state.myModules.map(x=>`<tr><td><strong>${esc(x.module.icon)} ${esc(x.module.name)}</strong><br><small>${esc(x.license_key)}</small></td><td>${esc(x.installed_version)}</td><td><span class="status ${statusClass(x.status)}">${esc(x.status)}</span></td><td>${fmtDate(x.installed_at)}</td><td>${x.status==='ACTIVE'?`<button class="btn btn-secondary btn-small market-uninstall" data-id="${x.module.id}">Disinstalla</button>`:'—'}</td></tr>`).join(''):`<tr><td colspan="5">Nessun modulo installato.</td></tr>`}</tbody></table></div></section>`;
    },
    notifications() {
      return pageHead("Notifiche","Release, documentazione, billing e supporto.",
        `<button class="btn btn-secondary" id="markAllRead">Segna tutte come lette</button>`) + `
      <section class="card"><div class="notification-list">${state.notifications.length ? state.notifications.map(n=>`<article class="notification ${n.read?"":"unread"}"><span class="notification-icon">${n.type==="release"?"↻":n.type==="billing"?"€":"▤"}</span><div><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${fmtDate(n.created_at)}</small></div><button class="btn btn-secondary btn-small read-notification" data-id="${n.id}">${n.read?"Letta":"Segna letta"}</button></article>`).join("") : `<div class="empty">Nessuna notifica.</div>`}</div></section>`;
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

  function ticketDetailModal(ticket) {
    const comments=(ticket.comments||[]).map(c=>`<article class="notification"><div><strong>${esc(c.author_name)}</strong><p>${esc(c.body)}</p><small>${fmtDate(c.created_at)}</small></div></article>`).join("") || '<div class="empty">Nessun commento.</div>';
    const attachments=(ticket.attachments||[]).map(a=>`<button class="btn btn-secondary btn-small attachment-download" data-url="${esc(a.download_url)}">${esc(a.original_name)}</button>`).join(' ') || 'Nessun allegato';
    const m=modal(`${esc(ticket.code)} · ${esc(ticket.subject)}`,`<p>${esc(ticket.description)}</p><p><span class="status ${statusClass(ticket.status)}">${esc(ticket.status)}</span> · ${esc(ticket.priority)} · ${esc(ticket.category)}</p><h4>Allegati</h4><div>${attachments}</div><h4>Cronologia commenti</h4><div class="notification-list">${comments}</div><form id="commentForm" class="ticket-form"><label class="full">Nuovo commento<textarea name="body" rows="4" required></textarea></label><label class="full">Allegato facoltativo<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"></label><div class="full"><button class="btn btn-primary">Invia aggiornamento</button> <button type="button" class="btn btn-secondary" id="closeTicket">Chiudi ticket</button></div></form>`);
    $$('.attachment-download',m).forEach(b=>b.addEventListener('click',async()=>{const response=await fetch(`${cfg.apiUrl}${b.dataset.url}`,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok){toast('Download non disponibile');return;}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='allegato';a.click();URL.revokeObjectURL(url);}));
    $('#commentForm',m).addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);let result=await api(`/api/portal/tickets/${ticket.id}/comments`,{method:'POST',body:JSON.stringify({body:f.get('body')})});if(result.error){toast(result.error);return;}const file=f.get('file');if(file&&file.size){const fd=new FormData();fd.append('file',file);result=await api(`/api/portal/tickets/${ticket.id}/attachments`,{method:'POST',body:fd});if(result.error){toast(result.error);return;}}await loadSupportData();m.remove();toast('Ticket aggiornato');render('tickets');});
    $('#closeTicket',m).addEventListener('click',async()=>{const result=await api(`/api/portal/tickets/${ticket.id}`,{method:'PATCH',body:JSON.stringify({status:'CHIUSO'})});if(result.error){toast(result.error);return;}await loadSupportData();m.remove();toast('Ticket chiuso');render('tickets');});
  }

  function newTicketModal() {
    const categories=state.ticketMeta?.categories||['SUPPORTO','BUG','COMMERCIALE','FEATURE_REQUEST'];
    const priorities=state.ticketMeta?.priorities||['BASSA','MEDIA','ALTA','CRITICA'];
    const m=modal("Nuovo ticket",`<form id="ticketForm" class="ticket-form"><label>Categoria<select name="category">${categories.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Priorità<select name="priority">${priorities.map(x=>`<option ${x==='MEDIA'?'selected':''}>${x}</option>`).join('')}</select></label><label class="full">Oggetto<input name="subject" minlength="3" required></label><label class="full">Descrizione<textarea name="description" rows="5" minlength="5" required></textarea></label><label class="full">Allegato facoltativo<input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"></label><div class="full"><button class="btn btn-primary" type="submit">Invia ticket</button></div></form>`);
    $("#ticketForm",m).addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);let result=await api('/api/portal/tickets',{method:'POST',body:JSON.stringify({subject:f.get('subject'),description:f.get('description'),category:f.get('category'),priority:f.get('priority')})});if(result.error){toast(result.error);return;}const file=f.get('file');if(file&&file.size){const fd=new FormData();fd.append('file',file);const upload=await api(`/api/portal/tickets/${result.ticket.id}/attachments`,{method:'POST',body:fd});if(upload.error){toast(`Ticket creato, allegato non caricato: ${upload.error}`);}}await loadSupportData();m.remove();toast('Ticket creato');render('tickets');});
  }

  function filterMarket(){const q=($('#marketSearch')?.value||'').toLowerCase();const c=$('#marketCategory')?.value||'';$$('.market-card').forEach(x=>x.style.display=((!q||x.dataset.name.includes(q))&&(!c||x.dataset.category===c))?'':'none');}

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
    $$('.ticket-row').forEach(r=>r.addEventListener('click',()=>{const t=state.tickets.find(x=>x.id===Number(r.dataset.ticketId));if(t)ticketDetailModal(t);}));
    $('#openBilling')?.addEventListener('click',async()=>{const result=await api('/api/portal/billing/portal-session',{method:'POST'});if(result.error||result.detail){toast(result.error||result.detail);return;}window.location.href=result.portal_url;});
    $$('.checkout-plan').forEach(button=>button.addEventListener('click',async()=>{
      const plan=button.dataset.plan;
      const original=button.innerHTML;
      button.disabled=true;
      button.innerHTML=`<strong>Connessione a Stripe…</strong><span>Attendi qualche secondo</span>`;
      const returnUrl=`${window.location.origin}${window.location.pathname}`;
      const result=await api(`/api/portal/billing/checkout/${plan}`,{method:'POST',body:JSON.stringify({return_url:returnUrl})});
      if(result.error||result.detail){button.disabled=false;button.innerHTML=original;toast(result.error||result.detail);return;}
      if(!result.checkout_url){button.disabled=false;button.innerHTML=original;toast('Stripe Checkout non disponibile');return;}
      window.location.href=result.checkout_url;
    }));
    $('#syncBilling')?.addEventListener('click',async()=>{const result=await api('/api/portal/billing/sync',{method:'POST'});if(result.error||result.detail){toast(result.error||result.detail);return;}await Promise.all([loadBillingData(),loadPortalCommerceData(),loadMarketplaceData()]);toast(result.message);render('billing');});
    $$('.invoice-open').forEach(b=>b.addEventListener('click',()=>window.open(b.dataset.url,'_blank','noopener')));
    $('#marketSearch')?.addEventListener('input',filterMarket);
    $('#marketCategory')?.addEventListener('change',filterMarket);
    $$('.market-install').forEach(b=>b.addEventListener('click',async()=>{const r=await api(`/api/marketplace/modules/${b.dataset.id}/install`,{method:'POST',body:JSON.stringify({company_id:null})});if(r.error||r.detail){toast(r.error||r.detail);return;}await loadMarketplaceData();toast(r.message);render('my-modules');}));
    $$('.market-uninstall').forEach(b=>b.addEventListener('click',async()=>{const r=await api(`/api/marketplace/modules/${b.dataset.id}/uninstall`,{method:'DELETE'});if(r.error||r.detail){toast(r.error||r.detail);return;}await loadMarketplaceData();toast(r.message);render('my-modules');}));
    $('#markAllRead')?.addEventListener('click',async()=>{await api('/api/portal/notifications/read-all',{method:'POST'});await loadSupportData();unreadCount();render('notifications')});
    $$('.read-notification').forEach(b=>b.addEventListener('click',async()=>{await api(`/api/portal/notifications/${b.dataset.id}/read`,{method:'POST'});await loadSupportData();unreadCount();render('notifications')}));
    $$('.filter-btn').forEach(b=>b.addEventListener('click',()=>{$$('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('[data-type]').forEach(c=>c.style.display=b.dataset.filter==='Tutti'||c.dataset.type===b.dataset.filter?'':'none')}));
    $$('.doc-action').forEach(b=>b.addEventListener('click',()=>toast(`${b.dataset.doc}: richiesta registrata`)));
    $$('.course-btn').forEach(b=>b.addEventListener('click',()=>toast('Corso aperto in modalità demo')));
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

  async function completeStripeCheckoutFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "success") return false;
    const sessionId = params.get("session_id");
    if (!sessionId) {
      toast("Pagamento completato, ma manca l'identificativo Stripe");
      return false;
    }
    const result = await api('/api/portal/billing/checkout/complete', {
      method: 'POST',
      body: JSON.stringify({session_id: sessionId})
    });
    if (result.error || result.detail) throw new Error(result.error || result.detail);
    history.replaceState({}, document.title, window.location.pathname);
    toast(result.message || "Abbonamento aggiornato");
    return true;
  }

  async function openPortal() {
    try {
      state.loadingSecondary = true;
      restoreCachedProfile();
      loginView.classList.add("hidden");
      portalView.classList.remove("hidden");
      render("dashboard");

      const profilePromise = loadRealProfile();
      const checkoutPromise = completeStripeCheckoutFromUrl();
      const secondaryPromise = Promise.all([
                   loadPortalCommerceData(),
                   loadBillingData(),
                   loadSupportData(),
                   loadMarketplaceData()
               ]);

      const [profileResult, checkoutCompleted] = await Promise.all([
        profilePromise,
        checkoutPromise
      ]);
      void profileResult;

      await secondaryPromise;
      state.loadingSecondary = false;
      unreadCount();
      render(checkoutCompleted ? "billing" : state.page);
    } catch (error) {
      state.loadingSecondary = false;
      state.token="";
      localStorage.removeItem("o360_portal_token");
      localStorage.removeItem(PROFILE_CACHE_KEY);
      portalView.classList.add("hidden");
      loginView.classList.remove("hidden");
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
    state.token=""; state.profile=null; localStorage.removeItem("o360_portal_token"); localStorage.removeItem(PROFILE_CACHE_KEY);
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