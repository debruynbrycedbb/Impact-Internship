# Find Your Impact (Impact Internship job-fair quiz)

A one-page quiz for the Impact Internship stand at job fairs. Visitors answer seven quick questions, see a live topographic landscape take shape from their answers, get an internship match (one of the eight roles from the company's role sheets, in Kigali, Rwanda or Cape Town, South Africa), and leave their details to receive their "match file" and a landscape print.

Prototype, November 2026. Not published yet.

## Run it
Plain HTML/CSS/JS, no build step. Serve the folder and open it:

```
python3 -m http.server 8767
```

- `http://localhost:8767/` is the phone version (what the QR code opens).
- `http://localhost:8767/?kiosk` is the stand version: a bigger font, a QR code on the start screen, "Still exploring?" after 45 s of no touching, and an automatic reset 20 s after a sign-up.

## Where things are
- `js/data.js`: all text, questions, scoring, the eight roles (description, six tasks, where each runs), photo choices, timers and the Worker address. **Change content here.**
- `worker/`: the Cloudflare Worker that saves and emails sign-ups (`worker.js`), its table (`schema.sql`) and the setup steps (`SETUP.md`).
- `js/land.js`: the contour landscape (Perlin noise + marching squares) and the 1080×1350 print.
- `js/app.js`: quiz flow, live match meter, form, saving sign-ups, kiosk timers, staff panel.
- `css/style.css`: the design. Colours are at the top (brand slate `#3a4a6b` and orange `#f2712a`, taken from the logo).
- `img/`: photos from the company folder, resized for the web.

## Sign-ups
- Each sign-up is sent to a Cloudflare Worker, which saves it in a D1 database and emails it to the internships inbox (through Resend, or Cloudflare's own email once a domain is on Cloudflare). Setup: [worker/SETUP.md](worker/SETUP.md). The Worker address goes in `js/data.js` (`worker`).
- A copy also stays in the browser (`localStorage`, key `ii-fair:v1:leads`) until the Worker confirms it; unsent ones retry every minute and when the device is back online.
- **Staff panel:** hold the logo for 3 seconds, or add `#admin` to the address. It shows how many are still waiting to be sent, and has **Download CSV** and **Delete all sign-ups**.

## Placeholders and things to confirm
- `privacy.html` (linked from the consent checkbox) is a draft written from what the site actually does. Impact Internship has no privacy policy on its website, so the company must fill its placeholders: legal company name and registration, legal basis, retention period, when stand-screen copies are deleted, the no-sharing promise, where to complain, and the date.
- Photo captions in the intro stack ("Rwanda" / "South Africa") are my guesses from the photos: confirm.
- Environmental Studies is set to Kigali only, because its role sheet talks about Rwanda only. If it also runs in Cape Town, add `'sa'` to its `places` in `js/data.js`.
- The role sheets still list "Hoedspruit, South Africa" in their contact details; the site uses Cape Town as asked.
- The thank-you screen says the team will email the match file: someone has to actually send it (or an automated email has to be set up).
- The QR code points at the page's own address, so it only works for phones once the site is hosted.
