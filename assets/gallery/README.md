# Atul & Disha — Wedding Gallery Folder

The website automatically reads supported media files placed directly inside `assets/gallery/`.

## Supported formats
- Photos: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`
- Videos: `.mp4`, `.webm`

The file name becomes the caption. Use clear names such as `Atul-and-Disha-pre-wedding-01.webp`. Files appear in filename order. The README and unsupported file types are ignored.

## Git LFS is configured
The repository's root `.gitattributes` tracks the supported gallery media formats using Git Large File Storage (LFS). The actual media files are stored as LFS objects; Git stores small pointer files.

### One-time setup on Windows
1. Install [Git for Windows](https://git-scm.com/downloads).
2. Install [Git LFS](https://git-lfs.com/).
3. Open a new PowerShell or Git Bash window and run:

```bash
git lfs install
git clone https://github.com/atul-9/atul-wedding.git
cd atul-wedding
```

### Add or remove media
Copy photos/videos directly into `assets/gallery/` in the cloned folder. Then run:

```bash
git add .gitattributes
git add assets/gallery/
git commit -m "Add wedding gallery media"
git push origin main
```

To remove a photo/video, delete it from the folder and run the same add/commit/push steps. The gallery will reflect the folder after the push.

**Do not use GitHub's browser upload for large videos.** Use Git with Git LFS so the large file is uploaded to LFS storage. GitHub Free and Pro currently allow up to 2 GB per LFS file; GitHub Team allows 4 GB and Enterprise Cloud 5 GB. The included LFS storage and monthly download bandwidth are separate quotas. Check the GitHub LFS billing page before uploading a large library.

## Automatic updates and playback
The gallery reads the public GitHub folder when a visitor opens the page and checks for changes about every five minutes while the page remains open. Adding a supported image/video makes it appear automatically; deleting one removes it. Visitors can also use **Refresh gallery**.

Gallery media is delivered from GitHub's media CDN so LFS-backed files are served as media, not pointer text. Photos and videos open inside the website. Visitors can use Previous/Next, the left/right keyboard arrows, or swipe on touch devices.

## Media guidance and privacy
Use original 4K files only where needed. Large 4K videos consume storage and download bandwidth each time they are viewed. For public streaming at scale, dedicated object/video hosting is usually more suitable than Git LFS.

The website and this repository are public. Every supported image or video placed here is publicly accessible. Upload only media that Atul and Disha are comfortable sharing publicly; keep private or sensitive media elsewhere.
