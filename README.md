# Orizzonte360 — CUSTOMER PORTAL PACK 01

Portale clienti statico e responsive, pronto per test locali e pubblicazione su Render.

## Stato del pacchetto

Questo PACK 01 è una versione funzionante in **modalità demo locale**.

Funziona davvero per:

- login demo;
- navigazione completa;
- dashboard cliente;
- licenze;
- download demo;
- release center;
- documentazione;
- academy;
- ticket salvati in `localStorage`;
- notifiche;
- billing informativo;
- profilo;
- export JSON/TXT;
- collegamento alla piattaforma Orizzonte360.

Non contiene ancora autenticazione reale, Stripe Customer Portal reale, download protetti o ticket salvati nel backend. Queste integrazioni saranno il contenuto del **CUSTOMER PORTAL PACK 02**.

## Credenziali demo

```text
Email: demo@orizzonte360.it
Password: Demo123!
```

## Configurazione

Apri:

```text
js/config.js
```

Controlla:

```javascript
window.ORIZZONTE_PORTAL_CONFIG = {
  productUrl: "https://oracle-business-ai-frontend.onrender.com",
  websiteUrl: "https://orizzonte360.it",
  supportEmail: "support@orizzonte360.it",
  portalName: "Orizzonte360 Customer Portal",
  demoMode: true
};
```

Per il PACK 01 lascia `demoMode: true`.

## Test locale

Apri PowerShell nella cartella del portale:

```powershell
cd C:\Users\brfra\OneDrive\Desktop\Orizzonte360\CustomerPortal
python -m http.server 5600
```

Apri:

```text
http://127.0.0.1:5600
```

## Pubblicazione consigliata

Crea un repository GitHub separato:

```text
orizzonte360-customer-portal
```

Poi:

```powershell
git init
git add .
git commit -m "Launch Orizzonte360 Customer Portal Pack 01"
git branch -M main
git remote add origin URL_REPOSITORY_GITHUB
git push -u origin main
```

Su Render:

```text
New
→ Static Site
→ collega il repository
```

Impostazioni:

```text
Build Command: vuoto
Publish Directory: .
```

## Dominio consigliato

Non collegare subito il dominio principale `orizzonte360.it`.

Per il portale usa in futuro:

```text
portal.orizzonte360.it
```

Prima verifica il sito `.onrender.com`.

## Sicurezza

Questo PACK 01 è per demo e validazione grafica.

Non usarlo ancora per clienti reali perché:

- le credenziali demo sono nel frontend;
- la sessione è solo `sessionStorage`;
- ticket e notifiche sono locali;
- i download sono dimostrativi;
- non esistono controlli server-side.

Il PACK 02 collegherà il portale al backend FastAPI e ai dati reali del cliente.

## File principali

- `index.html`: struttura del portale;
- `css/portal.css`: design responsive;
- `js/config.js`: collegamenti e configurazione;
- `data/demo-data.js`: dati demo;
- `js/portal.js`: logica dell’interfaccia;
- `TEST_CHECKLIST.md`: test da eseguire;
- `DEPLOY.md`: pubblicazione passo passo.
