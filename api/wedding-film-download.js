// Stream the original wedding highlight film from Google Drive through this same-origin endpoint.
// Required Vercel environment variables:
//   GOOGLE_DRIVE_FILM_FILE_ID — ID of the original 4K MP4 in Google Drive
//   GOOGLE_DRIVE_API_KEY — existing Google Drive API key used by the gallery
// The Drive file must be shared as "Anyone with the link — Viewer".
const {Readable} = require('node:stream');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({error: 'Method not allowed.'});
  }

  const fileId = process.env.GOOGLE_DRIVE_FILM_FILE_ID;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  if (!fileId || !apiKey) {
    return res.status(503).json({
      error: 'The wedding film download is not configured. Add GOOGLE_DRIVE_FILM_FILE_ID and GOOGLE_DRIVE_API_KEY to Vercel Preview environment variables.'
    });
  }
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
    return res.status(500).json({error: 'The configured wedding film file ID is invalid.'});
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId));
  url.searchParams.set('alt', 'media');
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('key', apiKey);

  const headers = {Accept: 'video/mp4', 'Accept-Encoding': 'identity'};
  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      redirect: 'follow'
    });

    if (!upstream.ok && upstream.status !== 206) {
      const detail = await upstream.text().catch(() => '');
      console.error('Google Drive wedding film download failed:', upstream.status, detail.slice(0, 500));
      if (upstream.status === 404 || upstream.status === 403) {
        return res.status(502).json({
          error: 'The wedding film could not be accessed. Check that the Drive file is shared as Anyone with the link — Viewer and that the Drive API key is valid.'
        });
      }
      return res.status(502).json({error: 'The wedding film download is temporarily unavailable.'});
    }

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="Atul-and-Disha-Wedding-Film-4K.mp4"; filename*=UTF-8\'\'Atul-and-Disha-Wedding-Film-4K.mp4');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');

    for (const name of ['content-length', 'content-range']) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }

    if (req.method === 'HEAD') return res.end();
    if (!upstream.body) return res.end();

    // Pipe the upstream web stream directly; never buffer the multi-gigabyte MP4 in memory.
    Readable.fromWeb(upstream.body).on('error', error => {
      console.error('Wedding film stream error:', error && error.message);
      if (!res.headersSent) res.status(502);
      res.destroy(error);
    }).pipe(res);
  } catch (error) {
    console.error('Wedding film endpoint error:', error && error.message);
    if (!res.headersSent) return res.status(502).json({error: 'The wedding film download is temporarily unavailable.'});
    res.destroy(error);
  }
};
