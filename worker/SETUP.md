# Sign-ups by email: setup (about 15 minutes)

Every sign-up is saved in a Cloudflare database (D1) and emailed straight to the internships inbox. Each email has the student's details, quiz answers and match, and **Reply** goes straight to the student.
If the email limit is reached on a busy day, the sign-up is still saved, and a CSV of anything not emailed arrives that evening.

Nothing private goes in the code. The inbox address and keys are only typed into the Cloudflare and Resend dashboards.

---

## 1. Resend (the service that sends the emails)
Without a domain of your own, Resend only delivers to the address the Resend account was made with, so **make the account with the internships Gmail** (the inbox that should receive the sign-ups).

1. Go to **resend.com** → **Sign up**, using the internships Gmail. Open the confirmation email in that inbox and click the link.
2. In Resend, click **API Keys** in the left menu → **Create API Key**.
3. Name: `impact-fair`. Permission: **Sending access**. Click **Add**.
4. Copy the key (it starts with `re_`). It is shown **only once**: keep the tab open until step 4 below.

Free plan: 100 emails a day, 3,000 a month.

## 2. The database (D1)
1. Log in at **dash.cloudflare.com**.
2. Left menu: **Storage & databases** → **D1 SQL database** → **Create database**.
3. Name: `impact-fair` → **Create**.
4. Open the **Console** tab, paste everything from `worker/schema.sql`, and click **Execute**.

## 3. The Worker
1. Left menu: **Compute (Workers)** → **Workers & Pages** → **Create** → **Create Worker** (start from "Hello World").
2. Name: `impact-fair` → **Deploy**.
3. Click **Edit code**. Delete everything in the editor, paste everything from `worker/worker.js`, and click **Deploy**.

## 4. Connect everything (Worker → Settings)
**Bindings** → **Add binding** → **D1 database**:
- Variable name: `DB`
- Database: `impact-fair` → **Add binding**

**Variables and Secrets** → **Add**, one at a time:

| Type   | Name             | Value |
|--------|------------------|-------|
| Text   | `LEAD_TO`        | the real inbox address itself, e.g. `name@gmail.com` (the same address the Resend account uses) |
| Text   | `ALLOWED_ORIGINS`| `https://debruynbrycedbb.github.io,http://localhost:8767` |
| Secret | `RESEND_API_KEY` | the `re_…` key from step 1 |

Click **Deploy** after adding them.

**Triggers** (or **Trigger events**) → **Add** → **Cron Trigger** → `0 20 * * *` (every evening at 20:00 UTC; this sends the catch-up CSV, but only if something was not emailed).

## 5. Check it
Open the Worker's address (shown at the top, like `https://impact-fair.<your-name>.workers.dev`). You should see:

```
{"ok":true,"database":true,"table":true,"inbox_set":true,"sends_with":"resend","allowed_sites":2}
```

Then send that address to Claude: it goes into `js/data.js` as `worker: '…'`, and the site starts sending sign-ups.

---

## Later: all-Cloudflare email (no Resend)
Only if a domain is moved to Cloudflare. Onboard it in **Email Service**, verify the internships Gmail as a destination, add a **send_email** binding named `EMAIL`, a Text variable `MAIL_FROM` (for example `fair@yourdomain`), then delete `RESEND_API_KEY`. The Worker switches by itself; the check page will say `"sends_with":"cloudflare"`.

## Good to know
- **Privacy:** the consent box still needs the real privacy notice link (`[Privacy notice link]` in `index.html`). Data is stored in Cloudflare (D1) and in the Gmail inbox.
- **See or export everything:** D1 → `impact-fair` → **Console** → `SELECT * FROM fair_leads ORDER BY received_at DESC;`
- **Only the site can send:** the Worker refuses sign-ups from any other site address (`ALLOWED_ORIGINS`), checks every field, and limits floods.
