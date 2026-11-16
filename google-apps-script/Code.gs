/**
 * Atul & Disha wedding RSVP endpoint.
 * 1) Create a Google Sheet and copy its spreadsheet ID.
 * 2) In Apps Script, set SHEET_ID below (or set script property SHEET_ID).
 * 3) Deploy as a Web app: Execute as Me; Who has access: Anyone.
 * 4) Paste the deployed /exec URL into RSVP_SCRIPT_URL in index.html.
 *
 * Keep the spreadsheet private. This endpoint appends submissions only;
 * it does not expose sheet contents or provide admin/delete operations.
 */
const SHEET_ID = ''; // Set this to your Google Spreadsheet ID.
const SHEET_NAME = 'RSVP Responses';

function doGet() {
  return json_({ ok: true, service: 'Atul & Disha RSVP', message: 'RSVP endpoint is running.' });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};

    // Honeypot used to filter basic automated submissions.
    if (p.website) return json_({ ok: true });

    const guestName = String(p.guestName || '').trim().slice(0, 120);
    const guestCount = String(p.guestCount || '').trim().slice(0, 10);
    const reply = String(p.reply || '').trim().slice(0, 40);
    const phone = String(p.phone || '').trim().slice(0, 40);
    const events = String(p.events || '').trim().slice(0, 120);
    const note = String(p.note || '').trim().slice(0, 1000);

    if (!guestName || !reply) {
      return json_({ ok: false, error: 'Name and response are required.' });
    }
    if (!['Joyfully accepts', 'Regretfully declines'].includes(reply)) {
      return json_({ ok: false, error: 'Invalid RSVP response.' });
    }

    const id = SHEET_ID || PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!id) throw new Error('Configure SHEET_ID in the script.');

    const ss = SpreadsheetApp.openById(id);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Submitted At', 'Guest Name', 'Guest Count', 'Response', 'Contact Number', 'Events', 'Message']);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([new Date(), guestName, guestCount, reply, phone, events, note]);
    return json_({ ok: true, message: 'RSVP saved.' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Unable to save RSVP.' });
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
