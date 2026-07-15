# DEPLOY — Orizzonte360 Customer Portal Pack 01

## 1. Estrazione

Crea:

```text
C:\Users\brfra\OneDrive\Desktop\Orizzonte360\CustomerPortal
```

Estrai il contenuto dello ZIP direttamente dentro questa cartella.

La struttura deve essere:

```text
CustomerPortal
├── index.html
├── favicon.ico
├── assets
├── css
├── data
├── js
├── README.md
├── DEPLOY.md
└── TEST_CHECKLIST.md
```

## 2. Test locale

```powershell
cd C:\Users\brfra\OneDrive\Desktop\Orizzonte360\CustomerPortal
python -m http.server 5600
```

Apri:

```text
http://127.0.0.1:5600
```

Accedi con:

```text
demo@orizzonte360.it
Demo123!
```

## 3. Repository GitHub

Crea su GitHub:

```text
orizzonte360-customer-portal
```

Non aggiungere README, licenza o `.gitignore` da GitHub.

Poi:

```powershell
cd C:\Users\brfra\OneDrive\Desktop\Orizzonte360\CustomerPortal
git init
git add .
git commit -m "Launch Orizzonte360 Customer Portal Pack 01"
git branch -M main
git remote add origin https://github.com/TUO_ACCOUNT/orizzonte360-customer-portal.git
git push -u origin main
```

Se `origin` esiste già:

```powershell
git remote set-url origin https://github.com/TUO_ACCOUNT/orizzonte360-customer-portal.git
git push -u origin main
```

## 4. Render Static Site

```text
Render
→ New
→ Static Site
```

Collega il repository.

Imposta:

```text
Name: orizzonte360-customer-portal
Branch: main
Build Command: vuoto
Publish Directory: .
Plan: Free
```

## 5. Verifica

Apri l’indirizzo Render e testa tutte le sezioni.

Non collegare ancora `portal.orizzonte360.it` fino a quando il test non è completo.

## 6. Aggiornamenti futuri

Dopo ogni modifica:

```powershell
git add .
git commit -m "Update customer portal"
git push
```

Render aggiornerà automaticamente il portale.
