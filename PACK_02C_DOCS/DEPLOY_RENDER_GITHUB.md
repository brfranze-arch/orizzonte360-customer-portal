# Deploy PACK 02C — GitHub e Render

## 1. Backup locale
Da PowerShell, nella cartella del progetto:

```powershell
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Compress-Archive -Path .\oracle_business_ai, .\Orizzonte360\CustomerPortal -DestinationPath ".\BACKUP_PRE_PACK_02C_$stamp.zip"
```

## 2. Copia file
Sostituire le cartelle `oracle_business_ai/backend` e `Orizzonte360/CustomerPortal` con quelle contenute nel pacchetto, mantenendo il proprio `.env` locale.

## 3. Aggiornamento database locale

```powershell
cd .\oracle_business_ai\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python create_tables.py
```

Il comando crea solo le nuove tabelle e non cancella i dati esistenti.

## 4. Test locale backend

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Aprire `http://127.0.0.1:8000/docs` e verificare il gruppo `Customer Portal Tickets`.

## 5. GitHub

```powershell
git status
git add backend/portal_ticket_models.py backend/routers/portal_ticket_router.py backend/main.py backend/create_tables.py
git commit -m "Customer Portal PACK 02C ticket enterprise"
git push origin main
```

Nel repository separato Customer Portal:

```powershell
git status
git add js/portal.js css/portal.css PACK_02C_DOCS README.md DEPLOY.md TEST_CHECKLIST.md
git commit -m "Customer Portal PACK 02C frontend"
git push origin main
```

Non caricare `.env`, database locali, `venv`, `__pycache__` o allegati dei clienti.

## 6. Render backend
1. Aprire il servizio backend Orizzonte360 su Render.
2. Verificare che il branch sia `main`.
3. Eseguire `Manual Deploy > Deploy latest commit` se l'auto deploy non parte.
4. Attendere il completamento del comando di avvio.
5. Controllare `/` e `/docs`.

`Base.metadata.create_all()` crea automaticamente le nuove tabelle all'avvio. Per PostgreSQL non vengono cancellati dati.

## 7. Persistenza allegati su Render
Il filesystem standard di Render può essere effimero. Per produzione configurare un Persistent Disk montato nella directory:

```text
/opt/render/project/src/backend/portal_ticket_uploads
```

In alternativa, nel futuro si potrà collegare uno storage S3 compatibile senza modificare l'interfaccia del portale.

## 8. Deploy Customer Portal
Eseguire il deploy con la stessa procedura già usata per il PACK 02B. Verificare in `js/config.js` che `apiUrl` punti al backend Render corretto.

## 9. Rollback
Ripristinare lo ZIP `BACKUP_PRE_PACK_02C_*.zip` e ridistribuire il commit precedente. Le nuove tabelle possono rimanere nel database senza interferire con PACK 02B.
