# Atul & Disha Wedding Website

Static wedding website deployed through Vercel, connected to this repository's `main` branch.

## Current site assets

- `assets/wedding-monogram.png` — header and footer monogram
- `assets/invitation-couple-art.jpg` — invitation artwork
- `assets/kwikpic-qr.jpg` — guest photo-finder QR code
- `index.html` — website

The Kwikpic section uses the QR image and the short link:
https://qs2zce.s.gy/atuldishawedding

## RSVP: Google Sheets setup

The RSVP form in `index.html` is intentionally not presented as live until its Apps Script URL is configured. It currently contains the placeholder:

`PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

### Configure the backend

1. Create a Google Sheet and keep it private.
2. Open **Extensions → Apps Script** from that Sheet.
3. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor.
4. Set the spreadsheet ID in `SHEET_ID` at the top of the script (or in Script Properties under the key `SHEET_ID`).
5. Deploy as a **Web app**, choosing **Execute as: Me** and **Who has access: Anyone**.
6. Copy the deployed Web app URL ending in `/exec`.
7. Replace the placeholder assigned to `RSVP_SCRIPT_URL` in `index.html` with that URL.
8. Commit the updated `index.html` to `main`; Vercel will deploy it automatically.

The Apps Script endpoint only appends RSVP submissions. It does not expose spreadsheet rows, admin access, or deletion. The Sheet itself should remain private. Since the website uses `fetch(..., mode: 'no-cors')`, the browser cannot read the response body; the form displays a submission acknowledgement after the request is sent. Test using a non-sensitive test RSVP and confirm that a new row appears in the Sheet.

## Security

- No admin dashboard is included.
- Do not commit spreadsheet IDs, credentials, private admin tokens, or any other secrets.
- Restrict access to the Google Sheet to the wedding organisers.
