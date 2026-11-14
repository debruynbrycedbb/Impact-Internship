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
- `js/data.js`: all text, questions, scoring, the eight roles (description, six tasks, where each runs), photo choices, timers and the (empty) database settings. **Change content here.**
- `js/land.js`: the contour landscape (Perlin noise + marching squares) and the 1080×1350 print.
- `js/app.js`: quiz flow, live match meter, form, saving sign-ups, kiosk timers, staff panel.
- `css/style.css`: the design. Colours are at the top (brand slate `#3a4a6b` and orange `#f2712a`, taken from the logo).
- `img/`: photos from the company folder, resized for the web.

## Sign-ups
- Saved in the browser (`localStorage`, key `ii-fair:v1:leads`).
- **Staff panel:** hold the logo for 3 seconds, or add `#admin` to the address. It lists sign-ups and has **Download CSV** and **Delete all sign-ups**.
- To send sign-ups to a database instead, fill `supabase.url` and `supabase.key` (publishable key only) in `js/data.js` and create a `fair_leads` table with the columns from the CSV. Unsent sign-ups retry when the device is back online.

## Placeholders and things to confirm
- `[Privacy notice link]` in the consent checkbox.
- Photo captions in the intro stack ("Rwanda" / "South Africa") are my guesses from the photos: confirm.
- Environmental Studies is set to Kigali only, because its role sheet talks about Rwanda only. If it also runs in Cape Town, add `'sa'` to its `places` in `js/data.js`.
- The role sheets still list "Hoedspruit, South Africa" in their contact details; the site uses Cape Town as asked.
- The thank-you screen says the team will email the match file: someone has to actually send it (or an automated email has to be set up).
- The QR code points at the page's own address, so it only works for phones once the site is hosted.
