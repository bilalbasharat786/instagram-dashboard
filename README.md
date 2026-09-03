# Instagram Electron Workflow Dashboard

Ye MERN + Electron dashboard authorized Instagram accounts ke manual follow workflow ke liye hai. App follow button automatically click nahi karti. System target profile ko har saved account session mein open karta hai; user Instagram par Follow manually click karta hai.

## Final Workflow

1. Dashboard user register/login karo.
2. `Accounts` page par Instagram username add karo.
3. Account detail page par `Open Login Session` dabao.
4. Electron us account ke liye isolated Instagram window open karega.
5. Us Instagram window mein manually login karo.
6. Dashboard mein `Mark Session Ready` dabao.
7. Ye har Instagram account ke liye sirf initial setup mein repeat karo.
8. Target workflow create karo, connected accounts select karo.
9. `Start Workflow` dabao. Current account ka target profile automatically open hoga.
10. Instagram window mein manually `Follow` dabao.
11. Follow click detect hote hi system current account complete mark karega aur next account ka target apne saved session mein automatically open karega.

Instagram target window ke top-right par floating `Next Account` button backup ke liye available hai. Agar Follow click detect na ho ya account already following ho, us button ko manually press karo.

## Persistence

Dashboard account records MongoDB mein save hote hain:

- database: configured `MONGO_URI`
- collection: `connectedaccounts`

Instagram login sessions Electron/Chromium persistent partitions mein save hoti hain:

```text
persist:instagram-{accountId}
```

Iska matlab:

- App/terminal band karke dobara open karne par 100 account records dobara add nahi karne padenge.
- Electron app same machine par same `accountId` ke liye saved Instagram session reuse karegi.
- Agar Instagram session expire, logout, checkpoint ya 2FA maange to sirf us account ko dobara login karna hoga.

## Important Safety Notes

- Instagram passwords database mein store nahi hotay.
- Follow button user manually click karta hai.
- Bot/follow automation, CAPTCHA bypass, proxy rotation, fingerprint spoofing ya detection bypass implement nahi hai.
- Accounts valuable hon to Electron app data aur MongoDB credentials secure rakho.

## Tech Stack

- Frontend: React, Vite, React Router, Axios
- Desktop shell: Electron
- Backend: Node.js, Express, MongoDB/Mongoose
- Auth: JWT + HTTP-only cookie support
- Security: Helmet, CORS, rate limiting, request sanitization, bcrypt password hashing

## Local Setup

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend/Electron:

```bash
cd frontend
npm install
npm run desktop
```

`npm run desktop` automatically Vite dev server start karta hai aur Electron app open karta hai.

Default URLs:

- Backend: `http://localhost:5000`
- Frontend dev server: `http://127.0.0.1:5173`

## Environment Variables

Backend `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/instagram_dashboard
JWT_SECRET=replace_with_long_random_secret
TOKEN_ENCRYPTION_KEY=replace_with_another_long_random_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Main Collections

- `users`: dashboard login users
- `connectedaccounts`: Instagram account records and desktop session status
- `workflows`: target workflow records
- `workflowitems`: per-account workflow progress
- `authenticationrecords`: login/session history
- `auditlogs`: important action logs

## Vercel Note

Frontend/backend web dashboard deploy ho sakta hai, lekin saved Instagram Electron sessions Vercel/mobile browser par available nahi hoti. The 100-account saved-session workflow is designed for the Electron desktop app on the same machine where accounts were logged in.
