# NEPA Website – How to Update It Safely

Read this once. Keep it with the website. Every task below is a recipe: follow the steps and the site will not break.

---

## 1. The three golden rules

1. **Header, footer and back-to-top live in ONE place each** (`partials/`). Never copy them into a page.
2. **After editing anything in `partials/`, run `python build_partials.py`.** (It refreshes the fast copy of the header/footer.)
3. **Before uploading, run `python check_site.py`. Upload only when it says `PASS`.**

That is the whole safety system. If you only remember these three, you are safe.

---

## 2. How the page loading works (so you know what NOT to touch)

```
Browser opens a page
  │
  ├─ <head>  partials/loader.js      shows the loading screen immediately
  ├─ <head>  js/partials-bundle.js   a copy of header + footer text (already in memory)
  ├─ <head>  js/include.js           puts header/footer into the page the moment the browser reads
  │                                  each placeholder  (<div data-include="partials/header.html">)
  │
  ├─ <body>  page content appears
  │
  └─ end of body
       js/main.js        menu, accessibility panel, ticker, slider, photo viewer
       js/lang.js        Hindi / English switch (downloads js/lang-hi.js ONLY when Hindi is needed)
       partials/backtotop.js   back-to-top button
```

**Why it is fast now:** the header/footer no longer wait for a network request, and the 300 KB Hindi
file is no longer downloaded by English visitors. (Measured on a slow 1.6 Mbps connection: header
visible in about 0.6 s instead of about 2.9 s.)

**Why it does not break – every part has a fallback:**

| If this fails…                         | …this happens instead                                              |
|----------------------------------------|--------------------------------------------------------------------|
| `js/partials-bundle.js` is missing     | header/footer are fetched from `partials/*.html`                   |
| …and the `partials/*.html` are missing | a small built-in header/footer with the main links is shown        |
| `js/main.js` fails                     | header/footer still show; each feature starts on its own, so one broken feature cannot stop the others |
| `js/lang-hi.js` fails to download      | the site stays in English, nothing crashes                         |
| `js/include.js` fails                  | the loading screen still disappears (5 s limit) and page text is readable |
| JavaScript is switched off             | the page text is readable; a note says JavaScript is needed        |
| Page opened by double-click (file://)  | works – the copy inside the bundle is used                         |

---

## 3. Folder map

```
index.html, about.html, …     the pages (one file per page)
_template.html                copy this to make a new page
partials/
  header.html                 ★ the header + menu     (edit here, then run build_partials.py)
  footer.html                 ★ the footer            (edit here, then run build_partials.py)
  backtotop.html / .css / .js the back-to-top button
  loader.js / loader.css      the loading screen
js/
  partials-bundle.js          ✋ AUTO-GENERATED – never edit by hand
  include.js                  puts header/footer on the pages   (do not edit)
  main.js                     menu, accessibility, slider …     (edit only for behaviour changes)
  lang.js                     language switch logic             (rarely edited)
  lang-hi.js                  ★ the Hindi translations – add new pairs here
  rr-search.js, media.js      page-only scripts
css/style.css                 the site design (colours at the top, in :root)
build_partials.py             refreshes the bundle
check_site.py                 safety check – run before every upload
docs/HOW-TO-UPDATE.md         this file
```

Not included in the zip I received: the `images/` and `pdfs/` folders. Keep them next to the pages when you upload.

---

## 4. Recipes

### A. Change the menu or header (add / rename / remove a menu item)
1. Open `partials/header.html`, change the link text or `href`.
2. `python build_partials.py`
3. `python check_site.py` → must say PASS
4. Upload `partials/header.html` **and** `js/partials-bundle.js`.

> Do not rename or delete these ids/classes – the scripts need them: `site-nav`, `menu-toggle`, `a11y-panel`, `ticker`, `data-lang`. `check_site.py` will warn you if they go missing.

### B. Change the footer (address, phone, links)
Same as A, but edit `partials/footer.html`.

### C. Change the email address shown in footer / Contact page
The address is stored in two pieces so spam robots cannot read it:
`data-user="name"` and `data-domain="example.gov.in"`. Change those two values.

### D. Add a new page
1. Copy `_template.html` → `my-new-page.html`.
2. Change only the lines marked `CHANGE ME` (title, description, content).
3. Add a link to it in `partials/header.html` (recipe A) and in `sitemap.html`.
4. `python check_site.py` → PASS.

### E. Edit text on an existing page
Open the page, change the text between `<main>` and `</main>`. Do not touch the `<head>` lines or the `<script>` lines at the bottom.
No build step is needed for page text.

### F. Add a news item / notice
Open `news-events.html` (and `recruitment.html` for recruitment notices). Copy an existing item block, paste it at the top of the list, change the date, title and PDF link. Put the PDF in `pdfs/…`. Run `check_site.py`.

### G. Add or change a Hindi translation
Open `js/lang-hi.js`. Each line is `"Exact English text": "Hindi text",`. Add a line (keep the comma, keep the quotes).
The English must match the page text exactly. For text with bold words/links, put `data-hi="…Hindi HTML…"` on the element instead.
To stop something being translated, add `data-no-i18n` to its tag.

### H. Add a photo or PDF
Copy the file into `images/…` or `pdfs/…` (lower-case names, no spaces) and link to it. For photos always write `width`, `height` and `alt` text.

### I. Add a script that only one page needs
Add the `<script src="…">` line at the very bottom of that page, **after** the three standard scripts. Never add it to the `<head>`, and never put it before `js/main.js`.

### J. Change colours / fonts
`css/style.css`, the `:root { … }` block at the top. The loading screen colours are in `partials/loader.css`.

### K. Change the loading screen
Logo and text: `partials/loader.js`. Look: `partials/loader.css`. The time limits are `MIN_MS` (shortest it is shown) and `MAX_MS` (longest, 5000 = 5 seconds).
Leave the `nepa-failsafe` lines in the CSS – they make the screen disappear on its own even if JavaScript breaks.

---

## 5. Before every upload (2 minutes)

```
python build_partials.py     # only needed if you changed anything in partials/
python check_site.py         # must end with PASS
```

Then open `index.html` in a browser and check: header shows, menu opens, footer shows, English ⇄ हिन्दी works.

`check_site.py` prints:
- **FAIL** – fix this first; it would break something.
- **WARN** – good to know (for example photos/PDFs that are not in your local folder); it does not break pages.

---

## 6. Troubleshooting

| What you see | Most likely cause | Fix |
|---|---|---|
| Old menu/footer text still shows after editing `partials/` | forgot to rebuild | `python build_partials.py`, upload `js/partials-bundle.js` too |
| Header/footer missing, plain "North Eastern Police Academy" bar instead of the real header | bundle and partial files both missing on the server | upload `js/partials-bundle.js` and the `partials/` folder |
| Loading screen stays for several seconds | very slow connection; it always leaves after 5 s | normal – nothing to fix |
| Hindi button does nothing | `js/lang-hi.js` not uploaded | upload it |
| Menu or slider not working on one page | the 3 standard scripts at the bottom of that page were deleted/reordered | copy the bottom block from `_template.html`; run `check_site.py` |
| Browser still shows old version after upload | browser cache | hard refresh (Ctrl+F5) |
| `check_site.py` says "bundle is OUT OF DATE" | partials edited without rebuild | `python build_partials.py` |

To see technical errors: open the page, press **F12**, open the **Console** tab. Messages starting with `[NEPA]` name the exact feature that failed.

---

## 7. Never do this

- ✘ Edit `js/partials-bundle.js` by hand.
- ✘ Paste header/footer HTML into a page.
- ✘ Move `js/include.js` or `partials/loader.js` out of `<head>`, or put `js/lang-hi.js` back in a `<script>` tag.
- ✘ Add a second `data-include="partials/backtotop.html"` to a page (the button would appear twice).
- ✘ Remove `id="site-nav"`, `a11y-panel`, `ticker` or `data-lang` from the header.
- ✘ Upload without `check_site.py` saying PASS.

---

## 8. What was changed in this version (v7 → fast/safe)

- **Faster header/footer:** `include.js` now runs in `<head>`, fills the header/footer from the bundle as soon as the browser reads each placeholder (no network request, no waiting for photos).
- **Faster pages:** the 309 KB Hindi file loads only when Hindi is chosen (it used to block every page).
- **Loading screen:** hides when the page and header/footer are ready (not after every photo has downloaded), cannot get stuck (JS timer + CSS timer).
- **No single point of failure:** three-layer header/footer loading; every start-up feature in `main.js` is isolated; null-checks added.
- **Fixed:** a missing script (`js/rr-search-lang.js`) referenced by `recruitment-rules.html`; the duplicate back-to-top placeholder on two faculty pages; the back-to-top script missing on 3 pages; an unused global function in `main.js`; every page now has the same script order.
- **Added:** `build_partials.py` (was mentioned in the old comments but missing), `check_site.py`, `_template.html`, this guide.
