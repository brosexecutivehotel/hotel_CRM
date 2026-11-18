# Deployment (Vercel)

Project: **bros-executive-hotel/hotel-crm** (`prj_fvhKeAMkBZw9jW6mqma9lBAYCUZY`)  
Production URL: **https://hotel-crm-omega.vercel.app**

## Deploy to production

Run from the repo root (`C:\ProjectFiles\Bros Executive\hotel_CRM`). This deploys the **current local working tree**.

### Option 1 — npx (recommended if `vercel` is not on PATH)
```powershell
npx vercel deploy --prod
```

### Option 2 — full path to installed Vercel CLI (Windows)
```powershell
& "C:\Users\moses.tutu\AppData\Roaming\npm\vercel.CMD" deploy --prod
```

### Option 3 — if `vercel` is on PATH
```powershell
vercel deploy --prod
```

## Notes

- **GitHub auto-deploys:** Vercel may skip Git-triggered deployments if the commit author’s GitHub account isn’t linked/authorized on the Vercel team. If a push doesn’t deploy automatically, use one of the commands above to deploy from local.
- **Preview deploy (non-production):**
  ```powershell
  npx vercel deploy
  ```
- **Check deployment / logs (examples):**
  ```powershell
  npx vercel inspect <deployment-url> --logs
  npx vercel curl https://hotel-crm-omega.vercel.app
  ```
- **Repo & branch:** `https://github.com/brosexecutivehotel/hotel_CRM.git` (`main`). Ensure changes are committed/pushed as needed; CLI deploy uploads local files, but keeping GitHub in sync is recommended.

## Quick reference
```powershell
cd "C:\ProjectFiles\Bros Executive\hotel_CRM"
npx vercel deploy --prod
```
