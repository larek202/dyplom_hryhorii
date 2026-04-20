# Dyplom Web (MoveMint)

Frontend **React + Vite** (JavaScript) dla API z `../dyplom-app/backend`.

**UI:** Material UI (`@mui/material`) oraz komponenty w `src/ui/` (`Button`, `Input`, `Table`, `Modal`). Motyw: `src/theme/muiTheme.js`.

> **Zakres obrony:** liczy się ten folder (`dyplom-web`) oraz backend — aplikacja mobilna w `dyplom-app` poza obroną. Wdrożenie na **Vercel** zaplanuj na **sam koniec** projektu (po stabilnej wersji i `npm run build`).

## Uruchomienie lokalne

1. Skopiuj `.env.example` → `.env`.
2. W `.env` ustaw `VITE_API_URL=http://localhost:3000` (ten sam port co backend).
3. Uruchom backend: `cd ../dyplom-app/backend` → `npm install` → `npm run dev`.
4. Tutaj: `npm install` → `npm run dev` — w przeglądarce adres z terminala (zwykle http://localhost:5173).

W trybie deweloperskim backend zwykle zezwala na origin Vite (patrz `dyplom-app/backend/config/cors.js`).

## Skrypty

| Polecenie | Opis |
|-----------|------|
| `npm run dev` | Serwer deweloperski |
| `npm run build` | Build produkcyjny (pod Vercel / hosting statyczny) |
| `npm run preview` | Podgląd zbudowanej wersji lokalnie |
| `npm run lint` | ESLint |

Pełna instrukcja (backend, `.env`, użytkownik testowy): [README w katalogu głównym repozytorium](../README.md).
