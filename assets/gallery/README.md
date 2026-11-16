# Google Drive wedding gallery — feature/evol

This feature branch switches the gallery source to a dedicated Google Drive folder. The website lists media through a same-origin Vercel API endpoint; the Google API key stays server-side.

## 1. Create the Drive folder
1. Create a dedicated folder for the public wedding gallery.
2. In **Share → General access**, select **Anyone with the link → Viewer**.
3. Put only photographs and videos approved for public viewing directly inside this folder. Additions and deletions are detected automatically.
4. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/FOLDER_ID`.

Google documents listing a publicly shared folder through Drive API v3 using an API key and the query `'FOLDER_ID' in parents and trashed = false`:
https://developers.google.com/workspace/drive/api/guides/search-files

## 2. Enable Drive API and create a key
1. Open https://console.cloud.google.com/.
2. Create or select a Google Cloud project.
3. Enable **Google Drive API**.
4. Create an API key under **APIs & Services → Credentials**.
5. Restrict the key to the **Google Drive API**. The key is used only by Vercel and is not exposed to browser JavaScript or committed to Git.

## 3. Configure Vercel Preview variables
In Vercel → project `atul_disha_wedding_site` → **Settings → Environment Variables**, add these variables for **Preview** only:

- `GOOGLE_DRIVE_FOLDER_ID` = the Drive folder ID
- `GOOGLE_DRIVE_API_KEY` = the Google Cloud API key

Save and redeploy the `feature/evol` Preview deployment. Do not put the real key in `index.html`, GitHub, or a public environment variable.

The Vercel endpoint is `/api/gallery`. It returns image/video metadata, supports pagination and uses a short CDN cache.

## 4. Automatic updates and viewing
The gallery loads when a visitor opens the site, offers a manual **Refresh gallery** button, and checks for changes every five minutes while open. New supported files and deletions are reflected automatically. Captions are generated from filenames.

Supported file types are Drive images (`image/*`) and videos (`video/*`). Put files directly in the selected folder (not nested subfolders). Media can be uploaded to Drive via the website or Drive desktop app; no Git commit is needed for media changes.

A click opens a Google Drive preview inside the website's full-screen viewer. Visitors can use Previous/Next, keyboard arrows, touch swipes and Escape/Close without leaving the wedding website.

## 5. 4K and privacy notes
- Google Drive can store videos at any resolution, subject to available account storage, but Drive's in-browser video preview plays at a maximum of **1920 × 1080**. A 4K original is retained in Drive, but the embedded player will not stream it in 4K. For actual 4K streaming on the site, use a dedicated streaming/transcoding service.
- An Anyone-with-the-link folder is public. Anyone who can access the wedding gallery can view its files. Do not put private or sensitive media here.
- Drive account storage and API quotas still apply.

## Verification before merge
This work is isolated on `feature/evol`. Configure the Vercel Preview variables and test listing, thumbnails, image/video playback, and additions/deletions before merging. Nothing from this branch is merged into `main`.
