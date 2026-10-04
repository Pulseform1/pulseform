# Beatdash's tab icon

The icon that shows on the browser tab (and when someone saves Beatdash to their phone's home screen)
is already built into `index.html`, so uploading `index.html` is all you need.

The files in this folder are the same icon, for other uses:

| File | Size | Used for |
|---|---|---|
| `pulseform-icon.svg` | any | The original drawing. Edit this to change the icon. |
| `favicon-32.png` | 32×32 | Browser tabs |
| `apple-touch-icon.png` | 180×180 | iPhone/iPad home screen |
| `icon-512.png` | 512×512 | Store listings, social posts, CrazyGames thumbnail |

## How a tab icon works

A web page names its icon with a `<link>` tag in the page's `<head>`:

```html
<link rel="icon" type="image/png" href="favicon-32.png">
```

`index.html` uses the same tags, but with the image written straight into the tag (a "data:" link), so
there is no separate file to upload.

## Using your own icon instead

1. Make a square image, at least 180×180 pixels. PNG is best. Keep it simple and bold: it is shown tiny.
   Free tools: Canva, Figma, or an online "favicon generator" (for example favicon.io or realfavicongenerator.net),
   which turn one picture into every size you need.
2. Upload it next to `index.html` on your site, for example as `favicon.png`.
3. In `index.html`, find the three lines that start with `<link rel="icon"` / `<link rel="apple-touch-icon"`
   (near the top) and replace them with:

   ```html
   <link rel="icon" type="image/png" href="favicon.png">
   <link rel="apple-touch-icon" href="favicon.png">
   ```

4. Upload `index.html`. Browsers remember icons, so if you still see the old one, do a hard refresh
   (Ctrl+Shift+R, or Cmd+Shift+R on a Mac), or close and reopen the tab.
