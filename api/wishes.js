// Private guest-wishes endpoint. This function only appends messages;
// it has no public read/list endpoint. Credentials remain in Vercel server env.
const crypto = require('crypto');

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const WISHES_TAB = 'Guest Wishes';

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
  return Buffer.from(value).toString('base64')
    .replace(/=/g, '')
    .split('+').join('-')
    .split('/').join('_');
}

function createServiceAssertion(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = String(serviceAccount.private_key || '').replace(/\\n/g, '\n');
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
  return unsigned + '.' + base64url(signer.sign(privateKey));
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
    console.error('Wishes Google token exchange failed with status:', response.status);
    throw new Error('Google authentication failed.');
  }
  return result.access_token;
}

async function googleRequest(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function ensureWishesTab(spreadsheetId, token) {
  const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId);
  const inspect = async () => {
    const response = await googleRequest(baseUrl + '?fields=sheets.properties.title', token);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.sheets)) {
      console.error('Wishes spreadsheet metadata request failed with status:', response.status);
      throw new Error('Could not inspect RSVP spreadsheet.');
    }
    return data.sheets.some(sheet => sheet.properties && sheet.properties.title === WISHES_TAB);
  };

  if (!(await inspect())) {
    const createResponse = await googleRequest(baseUrl + ':batchUpdate', token, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{addSheet: {properties: {title: WISHES_TAB}}}]
      })
    });

    // If a simultaneous first submission created it, the second metadata check succeeds.
    if (!createResponse.ok && !(await inspect())) {
      console.error('Could not create Guest Wishes tab. Google status:', createResponse.status);
      throw new Error('Could not create Guest Wishes tab.');
    }
  }

  // Add a header row only when the tab is empty; never overwrite a guest message.
  const headerRange = encodeURIComponent("'Guest Wishes'!A1:C1");
  const headerUrl = baseUrl + '/values/' + headerRange;
  const headerRead = await googleRequest(headerUrl, token, {method: 'GET'});
  const headerData = await headerRead.json().catch(() => ({}));
  if (!headerRead.ok) {
    console.error('Could not inspect Guest Wishes header. Google status:', headerRead.status);
    throw new Error('Could not prepare Guest Wishes tab.');
  }

  if (!Array.isArray(headerData.values) || headerData.values.length === 0) {
    const headerWrite = await googleRequest(headerUrl + '?valueInputOption=RAW', token, {
      method: 'PUT',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [['Submitted At', 'Guest Name', 'Wish']]
      })
    });
    if (!headerWrite.ok) {
      console.error('Could not initialize Guest Wishes header. Google status:', headerWrite.status);
      throw new Error('Could not prepare Guest Wishes tab.');
    }
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok: false, error: 'Method not allowed.'});
  }

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
    try { body = JSON.parse(body); }
    catch (error) { return res.status(400).json({ok: false, error: 'Invalid request body.'}); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ok: false, error: 'Invalid request body.'});
  }

  if (cleanText(body.website, 200)) return res.status(200).json({ok: true});

  const guestName = cleanText(body.guestName, 100);
  const wish = cleanText(body.wish, 1200);
  if (!guestName) return res.status(400).json({ok: false, error: 'Please enter your name.'});
  if (!wish) return res.status(400).json({ok: false, error: 'Please write a wish for the couple.'});

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!spreadsheetId || !serviceAccountJson) {
    return res.status(503).json({ok: false, error: 'The wishes guestbook is not configured yet. Please try again later.'});
  }
  if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) {
    console.error('Invalid GOOGLE_SHEET_ID configuration for wishes.');
    return res.status(500).json({ok: false, error: 'The wishes guestbook configuration is invalid.'});
  }

  let serviceAccount;
  try { serviceAccount = JSON.parse(serviceAccountJson); }
  catch (error) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON for wishes.');
    return res.status(500).json({ok: false, error: 'The wishes service configuration is invalid.'});
  }
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('Service Account JSON is missing required fields for wishes.');
    return res.status(500).json({ok: false, error: 'The wishes service configuration is invalid.'});
  }

  let failureStage = 'google_authentication';
  try {
    const token = await getAccessToken(serviceAccount);
    failureStage = 'guest_wishes_tab';
    await ensureWishesTab(spreadsheetId, token);

    failureStage = 'google_sheets_append';
    const range = encodeURIComponent("'Guest Wishes'!A:C");
    const endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/' +
      encodeURIComponent(spreadsheetId) + '/values/' + range +
      ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';

    const response = await googleRequest(endpoint, token, {
      method: 'POST',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [[new Date().toISOString(), guestName, wish]]
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.updates || !result.updates.updatedRange) {
      console.error('Guest Wishes append failed with status:', response.status);
      return res.status(response.status === 429 ? 429 : 502).json({
        ok: false,
        error: 'We could not save your wishes. Please try again or contact the family.'
      });
    }

    return res.status(200).json({ok: true, message: 'Wish saved privately.'});
  } catch (error) {
    console.error('Guest Wishes service failed at stage:', failureStage, 'error:', error && error.message ? error.message : error);
    return res.status(502).json({
      ok: false,
      error: 'Your wish could not be saved just now. Please try again.'
    });
  }
};
