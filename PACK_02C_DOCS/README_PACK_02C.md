# Orizzonte360 Customer Portal — PACK 02C

Modulo Enterprise per ticket reali integrato con FastAPI.

## Funzioni incluse
- Ticket persistenti e isolati per utente
- Codice ticket univoco O360
- Categorie, priorità e stati
- Commenti e cronologia eventi
- Allegati protetti fino a 10 MB
- Download allegati autenticato
- Assegnazione e gestione avanzata per ruoli admin/support
- Notifiche persistenti con stato letto/non letto
- Chiusura ticket da parte del cliente
- API e interfaccia Customer Portal complete

## File backend nuovi
- `backend/portal_ticket_models.py`
- `backend/routers/portal_ticket_router.py`

## File backend modificati
- `backend/main.py`
- `backend/create_tables.py`

## File portal modificati
- `CustomerPortal/js/portal.js`
- `CustomerPortal/css/portal.css`

Gli allegati vengono salvati in `backend/portal_ticket_uploads/`, creata automaticamente al primo avvio.
