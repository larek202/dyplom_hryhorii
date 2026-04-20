# MoveMint — dyplom (web + API)

Monorepo: **backend** (Express + MongoDB) w `dyplom-app/backend` oraz **frontend** (React + Vite) w `dyplom-web`.

### Zakres obrony

W obronie wchodzą wyłącznie **frontend web** (`dyplom-web`) oraz **backend API** (`dyplom-app/backend`).  
Aplikacja mobilna w katalogu `dyplom-app` (React Native) **nie jest** częścią obrony — możesz ją pominąć w dokumentacji i demo.

### Plan prac (kolejność)

1. **Rozwój i testy lokalne** — backend + `dyplom-web`, rejestracja, główne ścieżki użytkownika.  
2. **Stabilizacja** — `npm run build` (web), ewentualnie poprawki CORS / błędów przed produkcją.  
3. **Dokumentacja i scenariusz obrony** — README, krótki opis architektury, konto demo.  
4. **Na końcu: wdrożenie** — **Vercel** dla zbudowanego frontendu (statyczny hosting Vite).  
   Backend Express musi działać pod **publicznym adresem URL** (osobny hosting: np. Render, Railway, Fly.io, VPS). W Vercel ustawiasz `VITE_API_URL` na ten URL; w backendzie w produkcji ustaw **`CORS_ORIGIN`** na domenę z Vercel (patrz `dyplom-app/backend/README.md`).

## Wymagania

- **Node.js** 18 lub nowszy  
- **MongoDB** (lokalnie lub [Atlas](https://www.mongodb.com/atlas))

---

## Uruchomienie backendu

```powershell
cd dyplom-app\backend
npm install
```

Skopiuj plik środowiskowy i uzupełnij wartości (szczegóły w sekcji **Przykładowe zmienne `.env`** poniżej):

```powershell
Copy-Item .env.example .env
```

Minimalnie musisz ustawić **`MONGODB_URI`** oraz **`JWT_SECRET`** w pliku `.env`.

Uruchom serwer:

```powershell
npm run dev
```

Alternatywnie (bez automatycznego restartu przy zmianach plików):

```powershell
npm start
```

Domyślny adres API: **`http://localhost:3000`** (port można zmienić zmienną `PORT` w `.env`).

Sprawdzenie, czy API działa:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Szczegóły endpointów i zmiennych środowiskowych: [`dyplom-app/backend/README.md`](dyplom-app/backend/README.md).

---

## Uruchomienie frontendu

W osobnym terminalu (backend powinien już działać):

```powershell
cd dyplom-web
npm install
```

Skopiuj `.env` z przykładu:

```powershell
Copy-Item .env.example .env
```

Upewnij się, że **`VITE_API_URL`** wskazuje na ten sam host i port co backend (np. `http://localhost:3000`).

Uruchom aplikację deweloperską:

```powershell
npm run dev
```

Domyślnie Vite nasłuchuje pod adresem **`http://localhost:5173`**. W trybie deweloperskim backend zwykle akceptuje żądania z tego originu (CORS).

Inne przydatne skrypty:

| Polecenie        | Opis                    |
|------------------|-------------------------|
| `npm run build`  | Budowa produkcyjna      |
| `npm run preview`| Podgląd zbudowanej wersji |

---

## Przykładowe zmienne `.env`

### Backend — `dyplom-app/backend/.env`

Szablon znajduje się w **`dyplom-app/backend/.env.example`**. Minimalny przykład:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/dyplom-app
JWT_SECRET=uzyj-dlugiego-losowego-ciagu-min-32-znaki
PORT=3000
NODE_ENV=development
```

Dla **MongoDB Atlas** użyj connection stringa z panelu Atlas (SRV lub standardowy URI — patrz komentarze w `.env.example`).

Opcjonalnie: `CORS_ORIGIN`, zmienne **AWS S3** (uploady), **SendGrid** (e-maile) — opis w `.env.example` i w `backend/README.md`.

### Frontend — `dyplom-web/.env`

Szablon: **`dyplom-web/.env.example`**.

```env
VITE_API_URL=http://localhost:3000
```

Bez końcowego ukośnika w adresie.

---

## Użytkownik testowy

Aplikacja **nie tworzy automatycznie** gotowego konta w bazie — najpierw musisz **zarejestrować użytkownika** (formularz rejestracji w aplikacji web lub żądanie `POST /api/auth/register`).

Przykładowe dane do ręcznej rejestracji w środowisku lokalnym:

| Pole        | Przykład (do własnego użycia) |
|-------------|-------------------------------|
| Imię        | Jan                           |
| Nazwisko    | Kowalski                      |
| E-mail      | `test@example.com`            |
| Hasło       | co najmniej **6 znaków**, np. `haslo123` |

Po rejestracji możesz logować się tym samym adresem e-mail i hasłem. Konto ma domyślnie rolę **użytkownika** (`user`). Funkcje organizatora wymagają roli **organizer** — jeśli potrzebujesz jej lokalnie, ustaw pole `role` w dokumentcie użytkownika w MongoDB albo rozszerz proces rejestracji zgodnie z wymaganiami projektu.

---

## Struktura katalogów (skrót)

```
dyplom_hryhorii/
├── dyplom-app/
│   ├── backend/          # API Express — część obrony
│   └── …                 # m.in. aplikacja mobilna — poza obroną
└── dyplom-web/           # Frontend React (Vite) — część obrony
```

**Bezpieczeństwo:** nie commituj plików `.env` z prawdziwymi sekretami. W repozytorium powinny być tylko pliki `.env.example`.
