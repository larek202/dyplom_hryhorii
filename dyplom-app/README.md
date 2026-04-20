# Dyplom App

React Native (Expo) application with a Node/Express backend.

## Requirements
- Node.js 18+
- npm
- Expo CLI
- MongoDB

## Project Structure
- `src/` - mobile app (Expo)
- `backend/` - API server (Express + MongoDB)
- `../dyplom-web/` - web client (Vite + React, см. README там)

## Backend Setup
1. `cd backend`
2. Copy `backend/.env.example` to `backend/.env` and fill in values.
3. `npm install`
4. `npm run dev`

## App Setup
1. `npm install`
2. Update API URL in `src/services/api.js` if needed.
3. `npm run start`

## Push Notifications (Android)
- Place `google-services.json` in the project root.
- Ensure `app.json` points to it via `android.googleServicesFile`.
- Create an EAS project and set `expo.extra.projectId` in `app.json`.

## Tests
- `npm test`

## Notes
- Do not commit `.env` or credentials.
- Restrict any API keys used in `app.json` in the provider console.




