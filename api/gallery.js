// Vercel serverless endpoint for the public Google Drive wedding gallery.
// Required Vercel environment variables: GOOGLE_DRIVE_FOLDER_ID, GOOGLE_DRIVE_API_KEY
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  if (!folderId || !apiKey) {
    return res.status(503).json({
      error: 'Google Drive gallery is not configured yet. Add GOOGLE_DRIVE_FOLDER_ID and GOOGLE_DRIVE_API_KEY to Vercel Preview environment variables.'
    });
  }
  if (!/^[A-Za-z0-9_-]+$/.test(folderId)) {
    return res.status(500).json({ error: 'The configured Google Drive folder ID is invalid.' });
  }

  const params = new URLSearchParams({
    q: "'" + folderId + "' in parents and trashed = false",
    pageSize: '1000',
    orderBy: 'name',
    spaces: 'drive',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    fields: 'nextPageToken,files(id,name,mimeType,size,thumbnailLink,resourceKey,modifiedTime)',
    key: apiKey
  });

  if (typeof req.query.pageToken === 'string' && req.query.pageToken) {
    params.set('pageToken', req.query.pageToken);
  }

  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?' + params.toString(), {
      headers: {Accept: 'application/json'}
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Google Drive files.list failed:', response.status, payload.error && payload.error.message);
      return res.status(response.status === 429 ? 429 : 502).json({
        error: 'Google Drive could not list the gallery. Check Drive API access, folder sharing and API key settings.'
      });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      files: Array.isArray(payload.files) ? payload.files : [],
      nextPageToken: payload.nextPageToken || null
    });
  } catch (error) {
    console.error('Google Drive gallery endpoint error:', error && error.message);
    return res.status(500).json({error: 'The gallery service is temporarily unavailable.'});
  }
};
