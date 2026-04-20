# MoveMint (web + API)

Monorepo: **backend** API w `dyplom-app/backend`, **frontend** w `dyplom-web`. Opcjonalnie klient mobilny: `dyplom-app` (Expo).

## Wymagania

- **Node.js** 18+
- **MongoDB** (lokalnie lub [Atlas](https://www.mongodb.com/atlas))

## Struktura

```
dyplom_hryhorii/
├── dyplom-web/                 # React (Vite)
└── dyplom-app/
    ├── backend/                # Express + MongoDB (README w środku)
    └── … (Expo / React Native — opcjonalnie)
```

## Backend

```powershell
cd dyplom-app\backend
npm install
Copy-Item .env.example .env
```

W pliku `.env` ustaw min. **`MONGODB_URI`** i **`JWT_SECRET`**.

```powershell
npm run dev
```

Domyślnie API: **http://localhost:3000** (port: **`PORT`** w `.env`).

Sprawdzenie:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

## Frontend web

W drugim terminalu (backend uruchomiony):

```powershell
cd dyplom-web
npm install
Copy-Item .env.example .env
```

W `.env` ustaw **`VITE_API_URL=http://localhost:3000`** (bez końcowego `/`).

```powershell
npm run dev
```

Domyślnie: **http://localhost:5173**

| Polecenie | Opis |
|-----------|------|
| `npm run build` | Build (`dist/`) |
| `npm run preview` | Podgląd buildu |

## Zmienne `.env`

**Backend** — szablon: `dyplom-app/backend/.env.example`. Minimalny przykład:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/dyplom-app
JWT_SECRET=długi-losowy-ciag-min-32-znaki
PORT=3000
NODE_ENV=development
```

**Frontend** — szablon: `dyplom-web/.env.example`:

```env
VITE_API_URL=http://localhost:3000
```

Opcjonalnie mapa: **`VITE_GOOGLE_MAPS_API_KEY`** (patrz `.env.example`).

Więcej (CORS, S3, e-mail): [`dyplom-app/backend/README.md`](dyplom-app/backend/README.md).

## Produkcja (skrót)

- Frontend: `dyplom-web` → `npm run build` → hosting statyczny; **`VITE_API_URL`** = publiczny URL API.
- Backend: Node.js na hoście z tymi samymi zmiennymi; **`CORS_ORIGIN`** = domena frontendu — szczegóły w `backend/README.md`.

## Aplikacja mobilna (opcjonalnie)

```powershell
cd dyplom-app
npm install
npx expo start
```

## Bezpieczeństwo

Nie commituj plików **`.env`** z sekretami — w repo tylko **`.env.example`**.
