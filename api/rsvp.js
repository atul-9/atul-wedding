// Same-origin RSVP endpoint using a Google Service Account and Sheets API.
// Required server-side environment variables:
//   GOOGLE_SHEET_ID
//   GOOGLE_SERVICE_ACCOUNT_JSON
const crypto = require('crypto');

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ALLOWED_COUNTS = new Set(['1', '2', '3', '4', '5+']);
const ALLOWED_REPLIES = new Set(['Joyfully accepts', 'Regretfully declines']);
const ALLOWED_EVENTS = new Set([
  'Wedding day (25 November)',
  'All celebrations (19–25 November)',
  'Pre-wedding celebrations (19–24 November)',
  "I'll confirm with the family"
]);

function cleanText(value, limit) {
  return String(value == null ? '' : value)
    .split('')
    .filter(ch => {
      const code = ch.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('')
    .trim()
    .slice(0, limit);
}

function base64url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .split('+').join('-')
    .split('/').join('_');
}
function createServiceAssertion(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({alg: 'RS256', typ: 'JWT'}));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + '.' + payload;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return unsigned + '.' + base64url(signer.sign(serviceAccount.private_key));
}

async function getAccessToken(serviceAccount) {
  const assertion = createServiceAssertion(serviceAccount);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }).toString()
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    console.error('Google token exchange failed with status:', response.status);
    throw new Error('Google authentication failed.');
  }
  return result.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok: false, error: 'Method not allowed.'});
  }

  // Accept same-origin browser submissions only.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ok: false, error: 'This submission is not allowed.'});
      }
    } catch (error) {
      return res.status(403).json({ok: false, error: 'This submission is not allowed.'});
    }
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({ok: false, error: 'Invalid request body.'});
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ok: false, error: 'Invalid request body.'});
  }

  // Honeypot submissions are ignored without writing to the Sheet.
  if (cleanText(body.website, 200)) return res.status(200).json({ok: true});

  const guestName = cleanText(body.guestName, 120);
  const guestCount = cleanText(body.guestCount, 10);
  const reply = cleanText(body.reply, 40);
  const phone = cleanText(body.phone, 40);
  const events = cleanText(body.events, 120);
  const note = cleanText(body.note, 1000);

  if (!guestName) return res.status(400).json({ok: false, error: 'Please enter your name.'});
  if (!ALLOWED_COUNTS.has(guestCount)) return res.status(400).json({ok: false, error: 'Please select a valid guest count.'});
  if (!ALLOWED_REPLIES.has(reply)) return res.status(400).json({ok: false, error: 'Please select a valid response.'});
  if (!ALLOWED_EVENTS.has(events)) return res.status(400).json({ok: false, error: 'Please select which celebrations you will attend.'});

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!spreadsheetId || !serviceAccountJson) {
    return res.status(503).json({ok: false, error: 'RSVP is not configured yet. Please contact the family directly.'});
  }
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) {
    console.error('Invalid GOOGLE_SHEET_ID configuration.');
    return res.status(500).json({ok: false, error: 'RSVP storage configuration is invalid.'});
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    return res.status(500).json({ok: false, error: 'RSVP authentication configuration is invalid.'});
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('Service Account JSON is missing required fields.');
    return res.status(500).json({ok: false, error: 'RSVP authentication configuration is invalid.'});
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);
    const range = encodeURIComponent("'RSVP Responses'!A:G");
    const endpoint =
      'https://sheets.googleapis.com/v4/spreadsheets/' +
      encodeURIComponent(spreadsheetId) +
      '/values/' + range +
      ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';

    const values = [[
      new Date().toISOString(),
      guestName,
      guestCount,
      reply,
      phone,
      events,
      note
    ]];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({majorDimension: 'ROWS', values})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.updates || !result.updates.updatedRange) {
      console.error('Google Sheets append failed with status:', response.status);
      return res.status(response.status === 429 ? 429 : 502).json({
        ok: false,
        error: 'We could not save your RSVP. Please try again or contact the family.'
      });
    }

    return res.status(200).json({ok: true, message: 'RSVP saved.'});
  } catch (error) {
    console.error('RSVP service error:', error && error.message ? error.message : error);
    return res.status(502).json({
      ok: false,
      error: 'The RSVP service is temporarily unavailable. Please try again.'
    });
  }
};
