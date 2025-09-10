GameSetupHub - PoC

Questo repository contiene un Proof-of-Concept per "GameSetupHub": una piattaforma per condividere e valutare configurazioni di gioco.

Servizi inclusi:
- users-service: registrazione e autenticazione (JWT)
- configs-service: upload, ricerca per gioco, visualizzazione, like
- frontend: single-page static che usa le API
- mongo: database

Istruzioni rapide
1. Copia `.env.example` in `.env` e imposta `JWT_SECRET`.
2. Avvia con Docker Compose:
   docker-compose up --build

Endpoint principali
- POST /api/auth/register  {username,password}
- POST /api/auth/login     {username,password} -> returns token
- POST /api/configs        (auth, body: game, description, content, tags)
- GET  /api/configs?game=  search by game
- GET  /api/configs/:id    view config
- POST /api/configs/:id/like  (auth) increment like

Note
- Questo PoC è semplificato per dimostrare i requisiti minimi richiesti.
- Per sviluppo locale senza Docker, installa Node.js e avvia ciascun servizio nella sua cartella.
