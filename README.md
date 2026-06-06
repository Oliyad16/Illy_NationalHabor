# illy Caffe Branch Clone

Static branch clone of `https://www.illy.com/en-us`.

## What is Included

- `index.html`: local homepage clone.
- `assets/`: mirrored CSS, JavaScript, images, fonts, SVGs, PDFs, and product imagery.
- `source-capture.html`: backup of the captured source before asset rewriting.
- `asset-manifest.json`: remote-to-local asset map and any failed downloads.
- `docs/site-breakdown.md`: structure breakdown of the page.
- `scripts/mirror-assets.mjs`: repeatable asset mirror/rewrite script.

## Branch Details

Edit `branch-config.js` to update:

- Branch name
- Phone number
- Address lines
- Hours

Run locally:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

If port `4173` is already in use, choose another port:

```sh
python3 -m http.server 4174
```
