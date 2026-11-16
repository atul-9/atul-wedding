# Wedding Gallery Media

This folder is reserved for Atul and Disha's real photographs and video files.

## Add photographs
1. Upload optimized image files to this folder (WebP or JPG recommended).
2. Add an entry to the `GALLERY_ITEMS` array in the gallery script in `index.html`:

```js
{ type: 'photo', src: 'assets/gallery/photo-name.webp', title: 'A short caption', alt: 'A brief description' }
```

## Add videos
For a small, web-ready MP4 file, upload it here and add:

```js
{ type: 'video', src: 'assets/gallery/film-name.mp4', poster: 'assets/gallery/film-cover.webp', title: 'A short caption' }
```

Use a compressed MP4 and a separate poster image. Avoid committing original high-resolution video masters to the repository; large video files increase repository size and page loading time. For longer or high-resolution films, use a video hosting service and adapt the player to that host.

Only add photographs and videos supplied or approved by the couple. Do not use stock or generated couple imagery.

**Visibility:** This website is public. Any media placed in this folder and linked from the gallery will be publicly accessible. Do not upload private or sensitive photographs.
