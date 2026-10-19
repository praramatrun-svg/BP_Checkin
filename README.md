# BP Check-in LIFF on Vercel

Prepared locally; not deployed. Existing Apps Script admin remains on `/exec?page=admin`.

LIFF ID: `2011802874-VSvGPhi7`. Channel ID: `2011802874`.

## Architecture

Employee browser → same-origin `/api/employee` Vercel Function → signed Apps Script `doPost` → existing attendance rules and Google Sheets.

The Function stores the Apps Script session in a Secure HttpOnly cookie. The browser never receives the session token in a JSON response. LINE ID tokens are verified by LINE on the Apps Script server, then matched against active `LineUserID` records in `BP_USERS_JSON`. Employee identity for attendance is derived from the authorized account, including manager accounts.

## Deployment order

1. For a company application, choose a Vercel plan that permits commercial use. The current account was observed on Hobby; no upgrade or payment has been performed.
2. Replace `Code.gs` in Apps Script with `apps-script/Code.gs` from the main project, which includes bcrypt and the signed API bridge. Keep existing Script Properties and Sheets data. Do not rerun the installer to update code.
3. Generate a fresh random secret (at least 32 characters) and set `BP_API_SECRET` in Apps Script Script Properties. Keep it out of Git, frontend code and chat. Configure the same secret in Vercel Environment Variables.
4. Deploy a new Apps Script version at the existing `/exec` URL. Keep execution as the owner and the existing public web-app endpoint; the API verifies HMAC, timestamp, nonce, account authorization and GPS before a write.
5. Import this `vercel` folder as the Vercel project root (or set Root Directory to `vercel` in a repository containing the full project). Framework: Other. Build Command: `npm run build`. Output Directory: `public`. The `api/employee.js` Function must be included; do not deploy only the static public folder.
6. Configure production environment variables:

| Key | Value |
| --- | --- |
| `GAS_WEB_APP_URL` | `https://script.google.com/macros/s/AKfycbz9PtQ0X1ZyM9MFgJo2kpFd4woXTgVLKeWSi9JVfKB4flPOb-nBE5veeAUp635u0FTh3Q/exec` |
| `BP_API_SECRET` | The same random secret from step 3 |
| `APP_ORIGIN` | The exact production origin, e.g. `https://bp-checkin-liff.vercel.app`, without trailing slash |

7. Redeploy after setting environment variables. Never prefix `BP_API_SECRET` with `NEXT_PUBLIC_` or expose it in a static file.
8. In LINE Developers → Channel `2011802874` → LIFF → `2011802874-VSvGPhi7`, change Endpoint URL to the production Vercel URL with a trailing slash. Enable `openid` and `profile`; view size Full. The OAuth Callback URL for the existing Apps Script popup login is a separate setting and remains the Apps Script `/exec` URL.
9. Keep the LIFF link `https://liff.line.me/2011802874-VSvGPhi7`. Test inside LINE on an actual phone, allow identity consent, press ตรวจตำแหน่ง, and confirm check-in/check-out.

## Employee mapping

The account must already appear in `BP_ALLOWED_EMAILS` and `BP_USERS_JSON`, with the correct `EmployeeID`, `BranchCode`, `Role`, `IsActive` and `LineUserID`. A LINE account without a mapping is denied and shown its LINE User ID for the administrator to bind. Do not grant admin access merely from a LINE display name or email in an unverified profile.

## Build and tests

From the main project root:

```text
node scripts/prepare-vercel.cjs
node --test vercel/tests/api.cjs
node tests/gateway.cjs
node tests/liff.cjs
node tests/vercel-browser.cjs
```

`prepare-vercel.cjs` refreshes `src/` from the current Employee template and creates `public/`. The standalone folder builds without access to parent directories or third-party npm dependencies. The browser test uses mocked LINE, Sheets and GPS; it does not prove real LINE login, Google authorization, phone GPS or production latency.

The employee page requires a user action for GPS access. Sessions expire after at most six hours, and every RPC rechecks account authorization. Google Maps receives the coordinates shown on the map. Local GPS coordinates are not proof against device GPS spoofing.
