# Backup e sicurezza

## Database
Eseguire un backup PostgreSQL prima di ogni deploy:

```powershell
pg_dump "$env:DATABASE_URL" -Fc -f "orizzonte360_pre_pack02c.dump"
```

## Allegati
Copiare regolarmente la cartella `portal_ticket_uploads`. Gli allegati non devono essere versionati su GitHub.

## Sicurezza implementata
- autenticazione Bearer obbligatoria;
- accesso ticket limitato al proprietario o ai ruoli di supporto;
- nomi file normalizzati;
- estensioni consentite esplicitamente;
- limite 10 MB;
- percorsi download verificati contro la directory autorizzata;
- nomi storage casuali e non prevedibili.

## `.gitignore` consigliato

```gitignore
.env
*.db
venv/
__pycache__/
portal_ticket_uploads/*
!portal_ticket_uploads/.gitkeep
```
