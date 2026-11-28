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

The existing RSVP form sends submissions to the same-origin Vercel endpoint at `/api/rsvp`. The endpoint authenticates to Google Sheets using a dedicated Google Cloud Service Account. The Service Account has access only to the private RSVP spreadsheet; no Apps Script deployment is required.

### 1. Create a private Google Sheet

1. Create a Google Sheet in your personal Google account, for example `Atul & Disha RSVP Responses`.
2. Keep the spreadsheet private and share it only with the wedding organisers and the Service Account.
3. Create a tab named `RSVP Responses`.
4. Add this header row in row 1: `Submitted At | Guest Name | Guest Count | Response | Contact Number | Events | Message`.
5. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.

### 2. Enable Google Sheets API

In the same Google Cloud project used for the wedding gallery, enable **Google Sheets API**:
https://console.cloud.google.com/apis/library/sheets.googleapis.com

### 3. Create a dedicated Service Account

1. Open Google Cloud → **IAM & Admin → Service Accounts**.
2. Create a Service Account named `wedding-rsvp-writer`.
3. Do not grant it project-wide IAM roles.
4. Open the Service Account → **Keys → Add Key → Create new key → JSON**.
5. Download the JSON key file and keep it private.
6. Copy the Service Account's `client_email` value from the JSON file.
7. In Google Sheets, share only the RSVP spreadsheet with this email and grant **Editor** access.

The Service Account does not need access to your Gmail account or other Drive files. Its effective document access is limited to the spreadsheet you share with it. Do not share the JSON key file with guests or commit it to GitHub.

### 4. Configure Vercel Preview variables

In Vercel → project `atul_disha_wedding_site` → **Settings → Environment Variables**, add these for **Preview** only (select `feature/evol` if branch-specific targeting is available):

- `GOOGLE_SHEET_ID` = the spreadsheet ID.
- `GOOGLE_SERVICE_ACCOUNT_JSON` = the complete contents of the downloaded Service Account JSON file. Paste the entire JSON as one value; keep it server-side and do not use a `NEXT_PUBLIC_` or other public prefix.

Save the variables and redeploy the latest `feature/evol` Preview. Environment-variable changes apply to new deployments.

### 5. Test submissions

1. Open the Preview website and submit one clearly labelled test RSVP.
2. The form should display a success message only after Google Sheets confirms that the row was appended.
3. Verify that exactly one new row appears in the `RSVP Responses` tab, including timestamp, guest name, guest count, response, contact number, selected celebrations and note.
4. Delete the test row manually after verification.
5. Also test a declined response and confirm that invalid/missing fields are rejected.

The `/api/rsvp` endpoint is append-only; it has no public read, edit, or delete operations. No admin dashboard is included. After Preview testing, configure the same two variables for **Production** before merging this branch.

## Private guest wishes

The page includes a private guestbook section. Guests can submit their name and a wish through the same-origin Vercel endpoint `/api/wishes`. Submissions are stored in the private `Guest Wishes` tab of the same Google spreadsheet used for RSVPs. The endpoint creates the tab with a header row on the first successful write if it does not already exist.

The public website has no endpoint to read or display wishes. A guest can only submit a wish and receive a private confirmation on their own screen. The spreadsheet remains private and should only be accessible to the wedding organisers and the dedicated Google Service Account.

No additional Vercel environment variables are required; the wishes endpoint reuses `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON`. Preview testing should confirm the new `Guest Wishes` tab receives exactly one row with a timestamp, guest name and message.

## Security

- No admin dashboard is included.
- Do not commit spreadsheet IDs, credentials, private admin tokens, or any other secrets.
- Restrict access to the Google Sheet to the wedding organisers.


## Original 4K wedding film download

The **Download in 4K** button streams the original MP4 from Google Drive through the same-origin Vercel endpoint `/api/wedding-film-download`. The endpoint forwards browser byte-range requests and pipes the response directly to the browser, so the multi-gigabyte file is not buffered in server memory and guests are not sent to a Google Drive page.

For the `feature/evol` Preview deployment, add these server-side environment variables in Vercel:

- `GOOGLE_DRIVE_FILM_FILE_ID` = `1n6uF1rps3MoMsCt0HAdTJdATWnpCBGsF`
- `GOOGLE_DRIVE_API_KEY` = the existing Drive API key already used by the gallery

The MP4 in Google Drive must be shared as **Anyone with the link — Viewer** so the server can retrieve it using the API key. Keep the API key restricted to the Google Drive API. Do not put credentials in frontend code or commit them to GitHub. Redeploy the Preview after setting the variables, then test the download on desktop and mobile. Very large downloads still depend on the browser, network connection, Google Drive limits and Vercel's streaming/runtime limits.


## Original pre-wedding film download

The **Download Film** button streams the original MP4 from Google Drive through the same-origin Vercel endpoint `/api/prewedding-film-download`. The endpoint forwards browser byte-range requests and pipes the response directly to the browser, so the MP4 is not buffered in server memory and guests are not sent to a Google Drive page.

For the `feature/evol` Preview deployment, add this server-side environment variable in Vercel:

- `GOOGLE_DRIVE_PREWEDDING_FILE_ID` = `1tpO1Oae5GAbWcCI1MGOwbbZe39L5mfrF`
- `GOOGLE_DRIVE_API_KEY` = the existing Drive API key already used by the gallery and wedding film download

The MP4 in Google Drive must be shared as **Anyone with the link — Viewer** so the server can retrieve it using the API key. Keep the API key restricted to the Google Drive API. Do not put credentials in frontend code or commit them to GitHub. Redeploy the Preview after setting the variable, then test the download on desktop and mobile. Download performance depends on the browser, network connection, Google Drive limits and Vercel's streaming/runtime limits.
