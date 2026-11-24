# DEPLOY — SwapSetu 3D (remaining steps, need the user's browser/accounts)

Status at build time (24 Nov 2026): the app is complete and QA-passed
locally (21/21, see qa/QA_RESULTS.md). It is NOT yet deployed and NOT
yet submitted. Deployment and filing are approval-gated steps for the
user's own browser session. Do these in order.

## 1. Create the GitHub repo (user's signed-in browser)

1. Go to https://github.com/new — repo name: `swapsetu`
   (owner MSAbhishek22), public, no README/gitignore (this folder has
   its own README).
2. From this folder (`~/workspace/hackathons/hacksmart/swapsetu/`):
   ```
   git init && git add -A && git commit -m "SwapSetu 3D — battery-swap city model"
   git branch -M main
   git remote add origin https://github.com/MSAbhishek22/swapsetu.git
   git push -u origin main
   ```
   Record the commit SHA here after pushing: `____________`

## 2. Deploy to GitHub Pages

1. Repo → Settings → Pages → Source: Deploy from branch `main`, `/ (root)`.
2. Wait for the Pages build, open https://msabhishek22.github.io/swapsetu/
3. Verify as a stranger (signed-out / incognito): the model loads,
   riders move, one swap completes, Add station places a tower.
   Note: the vendored Three.js is 1.3 MB — first load on a slow
   connection takes a few seconds; that is expected.

## 3. Demo video (from the LIVE Pages URL, never local)

1. Screen-record the live URL: start at the morning peak, let queues
   form, show the worst-served zone turning red, add a station inside
   it, show the average wait falling. Keep it under 3 minutes.
2. Upload to YouTube as Public. Paste the link here: `____________`

## 4. Register for Hacksmart 2.0 (deadline 15 Dec 2026, 23:59 IST)

1. Open https://unstop.com/hackathons/hacksmart-20-geek-room-1799091
2. Register solo (teams of 1–4 are allowed; individual registration is
   explicitly welcome). Registration is free.
3. Save the registration confirmation / team ID here: `____________`

## 5. After shortlisting (idea round, January 2027)

- The online idea round follows the profile shortlist; the offline
  finale is 6–7 Feb 2027 at Battery Smart's office, Sector 62,
  Gurugram. Keep the live URL and video from steps 2–3 ready — the
  idea-round form will ask for the project link and description
  (text is ready in SUBMISSION_PACK.md).
