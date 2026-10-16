"""Downloads EVERY photo from the NEPA website gallery (https://www.nepa.gov.in/eng/gallery.html)
into this project, so the Media pages show them from your own folders (nothing loaded from the web).

RUN (needs internet once, and Pillow for the build step):
    pip install pillow
    python download_gallery.py          # download all photos + captions, then rebuild the Media pages
    python download_gallery.py --no-build   # download only
    python download_gallery.py --years 2023 2022   # only some years

What it does
1. Reads gallery.html and finds every monthly page (2018 - 2023).
2. On each monthly page it reads the album names (e.g. "Counter Insurgency and Jungle Warfare")
   and every photo link under them.
3. Saves photos to images/media/<year>/<month>-<album>-<nn>.jpg and writes images/media/<year>/captions.json
   (caption = "<Album> - <Month Year>").
4. Runs build_media.py, which makes the fast web copies and rewrites media.html, images.html and videos.html.
Safe to re-run: photos already downloaded are skipped.
"""
import json, re, sys, time, pathlib, subprocess, argparse
from html.parser import HTMLParser
from urllib.parse import urljoin, quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen
import ssl

BASE = "https://www.nepa.gov.in/eng/"
INDEX = BASE + "gallery.html"
root = pathlib.Path(__file__).parent
MEDIA = root / "images" / "media"
IMG_RE = re.compile(r"gallery-images", re.I)
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif")
MONTHS = {"jan":"January","feb":"February","mar":"March","apr":"April","may":"May","jun":"June","jul":"July",
          "aug":"August","sep":"September","oct":"October","nov":"November","dec":"December"}
CTX = ssl.create_default_context()
CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE   # some Indian gov sites have incomplete certificate chains

def fetch(url, binary=False, tries=3):
    url = fix_url(url)
    for i in range(tries):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0 (NEPA site local copy)"})
            with urlopen(req, timeout=40, context=CTX) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "ignore")
        except Exception as ex:
            if i == tries - 1: raise
            time.sleep(1.5 * (i + 1))

def fix_url(u):
    u = u.replace("\\", "/")                       # the site writes paths with backslashes
    p = urlsplit(u)
    return urlunsplit((p.scheme, p.netloc, quote(p.path, safe="/%"), p.query, ""))

class Page(HTMLParser):
    """Collects, in page order: album names (bold / headings) and photo links."""
    def __init__(self):
        super().__init__(); self.items = []; self.bold = 0; self.buf = []; self.in_a = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("b", "strong", "h5", "h6", "h4"): self.bold += 1; self.buf = []
        for k in ("href", "src", "data-src", "data-full"):
            v = a.get(k)
            if v and IMG_RE.search(v) and v.lower().split("?")[0].endswith(IMG_EXT):
                self.items.append(("img", v))
    def handle_endtag(self, tag):
        if tag in ("b", "strong", "h5", "h6", "h4") and self.bold:
            self.bold -= 1
            t = re.sub(r"\s+", " ", "".join(self.buf)).strip()
            if t and not self.bold: self.items.append(("album", t))
    def handle_data(self, d):
        if self.bold: self.buf.append(d)

def month_pages(index_html):
    seen, out = set(), []
    for m in re.finditer(r'href="([^"]*gallery_(\d{4})_([a-z]+)\.html)"', index_html, re.I):
        href, year, mon = m.group(1), m.group(2), m.group(3).lower()
        url = urljoin(INDEX, href)
        if url in seen: continue
        seen.add(url); out.append((year, mon, url))
    return out

def month_name(mon):
    return MONTHS.get(mon[:3], mon.title())

def slug(s, n=40):
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s[:n].strip("-") or "photos"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-build", action="store_true")
    ap.add_argument("--years", nargs="*")
    args = ap.parse_args()
    pages = month_pages(fetch(INDEX))
    if args.years: pages = [p for p in pages if p[0] in args.years]
    print(f"{len(pages)} monthly gallery pages found")
    total = got = failed = 0
    captions = {}
    for year, mon, url in pages:
        try: html = fetch(url)
        except Exception as ex: print("  !! cannot open", url, ex); continue
        parser = Page(); parser.feed(html)
        album, n, seen = "Photo gallery", {}, set()
        ydir = MEDIA / year; ydir.mkdir(parents=True, exist_ok=True)
        cap = captions.setdefault(year, {})
        for kind, val in parser.items:
            if kind == "album": album = val; continue
            full = urljoin(url, val.replace("\\", "/"))
            if full in seen: continue
            seen.add(full)
            ext = pathlib.PurePosixPath(urlsplit(full).path).suffix.lower() or ".jpg"
            n[album] = n.get(album, 0) + 1
            name = f"{year}-{mon[:3]}-{slug(album)}-{n[album]:02d}{ext if ext != '.jpeg' else '.jpg'}"
            dest = ydir / name; total += 1
            cap[name] = {"caption": f"{album} - {month_name(mon)} {year}",
                         "alt": f"{album}, North Eastern Police Academy, {month_name(mon)} {year}"}
            if dest.exists() and dest.stat().st_size > 0: got += 1; continue
            try:
                dest.write_bytes(fetch(full, binary=True)); got += 1
            except Exception as ex:
                failed += 1; print("  !! failed", full, ex)
        print(f"{year} {month_name(mon):<10} {sum(n.values()):>3} photos")
    for year, cap in captions.items():
        cj = MEDIA / year / "captions.json"
        old = json.loads(cj.read_text(encoding="utf-8")) if cj.exists() else {}
        old.update(cap); old.setdefault("_year", {"title": f"Photographs {year}"})
        cj.write_text(json.dumps(old, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone: {got}/{total} photos saved locally, {failed} failed (re-run to retry).")
    if not args.no_build:
        subprocess.run([sys.executable, str(root / "build_media.py")], check=True)

if __name__ == "__main__":
    main()
