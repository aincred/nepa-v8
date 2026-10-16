"""Builds the three Media pages: media.html (overview), images.html (year-wise photo gallery) and videos.html.

HOW TO USE
IMAGES
1. Make one folder per year:  images/media/2026/, images/media/2025/ ...
2. Put the photos (.jpg/.jpeg/.png/.webp) in the year folder. The file name becomes the caption
   (indoor-class.jpg -> "Indoor class"). To write your own caption and picture description (alt text),
   add images/media/<year>/captions.json, for example:
     {"IMG_001.jpg": {"caption": "Passing out parade", "alt": "Probationers marching on the parade ground"}}
   Optional "title" for the year card:  {"_year": {"title": "Passing Out Parade 2026"}}
3. Optional: put cover.jpg in a year folder to choose the year card picture (otherwise the first photo is used).
VIDEOS
4. Put each .mp4 (H.264) in videos/ (an optional .webm with the same name is used as a fallback) and a poster picture in videos/posters/, then add one line for it in
   videos/videos.json (title, year, file, poster, duration, description, transcript; optional "captions" .vtt file,
   or "youtube" video ID instead of "file"). Newest year is shown first.
5. Run:  python build_media.py
   Needs Pillow (pip install pillow). Web copies of photos (full 1600 px, thumbnail 800 px) are written to
   images/media/_web/ so large camera photos load fast; your originals are never changed.
   Rewrites media.html, images.html and videos.html.
"""
import json, pathlib, re, html
from PIL import Image, ImageOps
root = pathlib.Path(__file__).parent
MEDIA = root/"images"/"media"; WEB = MEDIA/"_web"; VID = root/"videos"
EXTS = {".jpg",".jpeg",".png",".webp"}
def e(s): return html.escape(s, quote=True)
def nice(name):
    s = re.sub(r"[-_]+"," ",pathlib.Path(name).stem).strip()
    return s[:1].upper()+s[1:]
def save(img, path, w, q=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    im = ImageOps.exif_transpose(img).convert("RGB")
    if im.width > w: im = im.resize((w, round(im.height*w/im.width)), Image.LANCZOS)
    im.save(path, "JPEG", quality=q, optimize=True, progressive=True)
    return im.size
def count(n, word="photo"): return f"{n} {word}" if n==1 else f"{n} {word}s"

# ---------------------------------------------------------------- images data
years = sorted([d for d in MEDIA.iterdir() if d.is_dir() and re.fullmatch(r"\d{4}", d.name)], key=lambda d: d.name, reverse=True)
data = []
for yd in years:
    cap = {}
    cj = yd/"captions.json"
    if cj.exists(): cap = json.loads(cj.read_text(encoding="utf-8"))
    files = sorted([f for f in yd.iterdir() if f.suffix.lower() in EXTS and f.stem.lower()!="cover"], key=lambda f: f.name.lower())
    photos = []
    for f in files:
        c = cap.get(f.name, {}); caption = c.get("caption") or nice(f.name)
        alt = c.get("alt") or f"{caption} at North Eastern Police Academy"
        im = Image.open(f)
        full = WEB/yd.name/"full"/(f.stem+".jpg"); thumb = WEB/yd.name/"thumb"/(f.stem+".jpg")
        save(im, full, 1600); tw, th = save(im, thumb, 800)
        photos.append(dict(full=full.relative_to(root).as_posix(), thumb=thumb.relative_to(root).as_posix(), tw=tw, th=th, caption=caption, alt=alt))
    cover = None
    cf = next((f for f in yd.iterdir() if f.stem.lower()=="cover" and f.suffix.lower() in EXTS), None)
    if cf: cover = save(Image.open(cf), WEB/yd.name/"thumb"/"cover.jpg", 800) and (WEB/yd.name/"thumb"/"cover.jpg").relative_to(root).as_posix()
    elif photos: cover = photos[0]["thumb"]
    title = (cap.get("_year") or {}).get("title") or f"Photographs {yd.name}"
    if photos: data.append(dict(year=yd.name, title=title, cover=cover, photos=photos))

# ---------------------------------------------------------------- videos data
vids = []
vj = VID/"videos.json"
if vj.exists():
    for i, v in enumerate(json.loads(vj.read_text(encoding="utf-8")).get("videos", [])):
        v = dict(v); v["n"] = i + 1
        pw, ph = 960, 540
        if v.get("poster") and (VID/v["poster"]).exists():
            with Image.open(VID/v["poster"]) as pim: pw, ph = pim.size
        v["pw"], v["ph"] = pw, ph
        vids.append(v)
    vids.sort(key=lambda v: (v.get("year",""), v["n"]), reverse=True)
vyears = sorted({v.get("year","") for v in vids}, reverse=True)

# ---------------------------------------------------------------- page shell
def shell(fname, title, desc, crumbs, h1, toc_label, toc, body, scripts="", extra=""):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#00205b">
<title>{e(title)}</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<!-- Header (edit in partials/header.html) -->
<div data-include="partials/header.html"></div>

<main id="main" tabindex="-1" class="about-page aw-page pub-page tn-page rr-page md-page">

  <div class="page-banner">
    <img src="images/about/about-banner.jpg" alt="" width="1600" height="400" decoding="async">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><ol>
{crumbs}
        </ol></nav>
      <h1>{h1}</h1>
    </div>
  </div>

  <nav class="page-toc" aria-label="{toc_label}">
    <div class="wrap">
      <ul>
{toc}
      </ul>
    </div>
  </nav>

{body}

  <section class="ap-sec" aria-label="Navigation">
    <div class="wrap">
      <p class="ap-cta"><a class="btn-about btn-alt" href="index.html"><span>Back to Home</span></a></p>
    </div>
  </section>
{extra}
</main>

<!-- Footer (edit in partials/footer.html) -->
<div data-include="partials/footer.html"></div>

<noscript><p style="padding:16px;background:#fff3cd;color:#3b2f00;font-size:16px">JavaScript is needed to load the header and footer of this page. Please enable JavaScript.</p></noscript>
<script src="js/main.js"></script>
<script src="js/partials-bundle.js"></script>
<script src="js/lang-hi.js"></script>
<script src="js/lang.js"></script>
<script src="js/include.js"></script>
{scripts}</body>
</html>
'''
def crumb(*items):
    out = ['          <li><a href="index.html">Home</a></li>']
    for label, href in items[:-1]: out.append(f'          <li><a href="{href}">{label}</a></li>')
    out.append(f'          <li aria-current="page">{items[-1][0]}</li>')
    return "\n".join(out)

LIGHTBOX = '''
  <dialog id="md-lightbox" class="lb" aria-labelledby="md-cap">
    <div class="lb-inner">
      <button type="button" class="lb-btn lb-close" aria-label="Close photo viewer"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M4 4l14 14M18 4L4 18" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></button>
      <img class="lb-img" src="" alt="">
      <p class="lb-cap" id="md-cap" aria-live="polite"></p>
      <div class="lb-nav">
        <button type="button" class="lb-btn lb-prev" aria-label="Previous photo"><svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true"><path d="M13 3L6 10l7 7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <span class="lb-count" aria-hidden="true"></span>
        <button type="button" class="lb-btn lb-next" aria-label="Next photo"><svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3l7 7-7 7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>
  </dialog>
'''

# ---------------------------------------------------------------- images.html
toc = "\n".join(f'        <li><a href="#y{d["year"]}">{d["year"]}</a></li>' for d in data)
cards = "\n".join(f'''        <li class="md-year">
          <img src="{d["cover"]}" alt="" width="800" height="600" loading="lazy" decoding="async">
          <div class="md-year-body">
            <p class="md-yr" aria-hidden="true">{d["year"]}</p>
            <h3 id="yc{d["year"]}">{e(d["title"])}</h3>
            <p class="md-count">{count(len(d["photos"]))}</p>
            <a class="bc-btn" href="#y{d["year"]}" aria-describedby="yc{d["year"]}"><span>View photos<span class="sr-only"> of {d["year"]}</span></span></a>
          </div>
        </li>''' for d in data)
secs = []
for i,d in enumerate(data):
    lis = "\n".join(f'''          <li class="gal-li"><a class="gal-item md-item" href="{p["full"]}" data-cap="{e(p["caption"])}"><img src="{p["thumb"]}" alt="{e(p["alt"])}" width="{p["tw"]}" height="{p["th"]}" loading="lazy" decoding="async"><span class="gal-cap" data-no-i18n lang="en">{e(p["caption"])}</span><span class="sr-only">, open larger photo</span></a></li>''' for p in d["photos"])
    alt = " ap-alt" if i%2 else ""
    secs.append(f'''  <section id="y{d["year"]}" class="ap-sec md-sec{alt}" aria-labelledby="y{d["year"]}-h">
    <div class="wrap">
      <h2 id="y{d["year"]}-h" class="h2-plain">Photographs {d["year"]}</h2>
      <p class="md-count">{count(len(d["photos"]))}</p>
      <ul class="gal-grid md-grid">
{lis}
      </ul>
      <p class="md-top"><a href="#albums">Back to albums by year</a></p>
    </div>
  </section>''')
images_body = f'''  <section id="albums" class="ap-sec" aria-labelledby="albums-h">
    <div class="wrap">
      <h2 id="albums-h" class="h2-plain">Photo Gallery</h2>
      <p class="rr-lead">Photographs of the Academy are arranged year-wise. Select a year to see its photographs, then select any photograph to view it larger. Use the arrow keys to move between photographs and Escape to close.</p>
      <ul class="md-years">
{cards}
      </ul>
    </div>
  </section>

{chr(10).join(secs)}'''
images_toc = '        <li><a href="#albums">All years</a></li>\n' + toc
(root/"images.html").write_text(shell("images.html", "Images – North Eastern Police Academy",
    "Images of the North Eastern Police Academy (NEPA), Umsaw, Meghalaya: photo gallery arranged year-wise. Ministry of Home Affairs, Government of India.",
    crumb(("Media","media.html"),("Images",None)), "Images", "Years", images_toc, images_body,
    scripts='<script src="js/media.js"></script>\n', extra=LIGHTBOX), encoding="utf-8")

# ---------------------------------------------------------------- videos.html
PLAY = '<svg class="vd-play" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false"><circle cx="28" cy="28" r="27" fill="#00205b" fill-opacity=".85" stroke="#fff" stroke-width="2"/><path d="M22 17v22l18-11z" fill="#fff"/></svg>'
def player(v):
    n = v["n"]; t = e(v["title"])
    if v.get("youtube"):
        return f'<div class="vd-frame"><iframe src="https://www.youtube-nocookie.com/embed/{e(v["youtube"])}" title="{t}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
    poster = f' poster="videos/{e(v["poster"])}"' if v.get("poster") else ""
    track = f'\n      <track kind="captions" src="videos/{e(v["captions"])}" srclang="en" label="English" default>' if v.get("captions") else ""
    wb = pathlib.Path(v["file"]).with_suffix(".webm")
    webm = f'\n      <source src="videos/{e(wb.as_posix())}" type="video/webm">' if (VID/wb).exists() else ""
    return f'''<video class="vd-video" controls preload="none"{poster} width="{v["pw"]}" height="{v["ph"]}" aria-labelledby="v{n}-t">
      <source src="videos/{e(v["file"])}" type="video/mp4">{webm}{track}
      <a href="videos/{e(v["file"])}">Download the video: {t}</a>
    </video>'''
def vcard(v):
    n = v["n"]; meta = " · ".join(x for x in [v.get("year",""), v.get("duration","")] if x)
    tr = f'\n        <details class="vd-tr"><summary>Text description of the video</summary><p>{e(v["transcript"])}</p></details>' if v.get("transcript") else ""
    return f'''        <li class="vd-card">
          {player(v)}
          <div class="vd-body">
            <h3 id="v{n}-t">{e(v["title"])}</h3>
            <p class="md-count">{e(meta)}</p>
            <p>{e(v.get("description",""))}</p>{tr}
          </div>
        </li>'''
if vids:
    vsecs = []
    for i, y in enumerate(vyears):
        lis = "\n".join(vcard(v) for v in vids if v.get("year","")==y)
        n = sum(1 for v in vids if v.get("year","")==y)
        alt = " ap-alt" if i%2 else ""
        vsecs.append(f'''  <section id="v{y}" class="ap-sec md-sec{alt}" aria-labelledby="v{y}-h">
    <div class="wrap">
      <h2 id="v{y}-h" class="h2-plain">Videos {y}</h2>
      <p class="md-count">{count(n,"video")}</p>
      <ul class="vd-grid">
{lis}
      </ul>
    </div>
  </section>''')
    videos_body = '''  <section id="vintro" class="ap-sec" aria-labelledby="vintro-h">
    <div class="wrap">
      <h2 id="vintro-h" class="h2-plain">Video Gallery</h2>
      <p class="rr-lead">Videos of activities and events at the Academy, arranged year-wise. Select the play button to watch a video; videos do not start by themselves. Each video has a text description below it.</p>
    </div>
  </section>

''' + "\n\n".join(vsecs)
    videos_toc = "\n".join(f'        <li><a href="#v{y}">{y}</a></li>' for y in vyears)
else:
    videos_body = '''  <section class="ap-sec" aria-labelledby="vintro-h">
    <div class="wrap">
      <h2 id="vintro-h" class="h2-plain">Video Gallery</h2>
      <p class="rr-lead">Videos will be added here soon.</p>
    </div>
  </section>'''
    videos_toc = '        <li><a href="#vintro">Videos</a></li>'
(root/"videos.html").write_text(shell("videos.html", "Videos – North Eastern Police Academy",
    "Videos of the North Eastern Police Academy (NEPA), Umsaw, Meghalaya: activities and events arranged year-wise. Ministry of Home Affairs, Government of India.",
    crumb(("Media","media.html"),("Videos",None)), "Videos", "Years", videos_toc, videos_body), encoding="utf-8")

# ---------------------------------------------------------------- media.html (overview)
latest = []
for d in data:
    for p in d["photos"]: latest.append((d["year"], p))
latest = latest[:4]
img_lis = "\n".join(f'''          <li class="gal-li"><a class="gal-item" href="images.html#y{y}"><img src="{p["thumb"]}" alt="{e(p["alt"])}" width="{p["tw"]}" height="{p["th"]}" loading="lazy" decoding="async"><span class="gal-cap" data-no-i18n lang="en">{e(p["caption"])}</span></a></li>''' for y,p in latest)
total_photos = sum(len(d["photos"]) for d in data)
vprev = "\n".join(f'''        <li class="vd-card">
          <a class="vd-thumb" href="videos.html#v{v.get("year","")}"><img src="videos/{e(v["poster"])}" alt="" width="{v["pw"]}" height="{v["ph"]}" loading="lazy" decoding="async">{PLAY}<span class="sr-only">Go to the video: {e(v["title"])}</span></a>
          <div class="vd-body">
            <h3>{e(v["title"])}</h3>
            <p class="md-count">{e(" · ".join(x for x in [v.get("year",""), v.get("duration","")] if x))}</p>
            <p>{e(v.get("description",""))}</p>
          </div>
        </li>''' for v in vids[:3] if v.get("poster"))
hub_body = f'''  <section id="intro" class="ap-sec" aria-labelledby="intro-h">
    <div class="wrap">
      <h2 id="intro-h" class="h2-plain">Media of the Academy</h2>
      <p class="rr-lead">Photographs and videos of the activities, training and events at the North Eastern Police Academy. Select <strong>Images</strong> or <strong>Videos</strong> to see everything, arranged year-wise.</p>
    </div>
  </section>

  <section id="images" class="ap-sec ap-alt" aria-labelledby="images-h">
    <div class="wrap">
      <h2 id="images-h" class="h2-plain">Images</h2>
      <p class="md-count">{count(total_photos)} in {count(len(data),"year")}</p>
      <ul class="gal-grid">
{img_lis}
      </ul>
      <p class="ap-cta"><a class="bc-btn" href="images.html"><span>View all images</span></a></p>
    </div>
  </section>

  <section id="videos" class="ap-sec" aria-labelledby="videos-h">
    <div class="wrap">
      <h2 id="videos-h" class="h2-plain">Videos</h2>
      <p class="md-count">{count(len(vids),"video")}</p>
      <ul class="vd-grid">
{vprev}
      </ul>
      <p class="ap-cta"><a class="bc-btn" href="videos.html"><span>View all videos</span></a></p>
    </div>
  </section>'''
hub_toc = '        <li><a href="#images">Images</a></li>\n        <li><a href="#videos">Videos</a></li>'
(root/"media.html").write_text(shell("media.html", "Media – North Eastern Police Academy",
    "Media of the North Eastern Police Academy (NEPA), Umsaw, Meghalaya: images and videos of the Academy. Ministry of Home Affairs, Government of India.",
    crumb(("Media",None)), "Media", "Media sections", hub_toc, hub_body), encoding="utf-8")

print("Wrote images.html:", ", ".join(f'{d["year"]} ({len(d["photos"])})' for d in data))
print("Wrote videos.html:", count(len(vids),"video"))
print("Wrote media.html")
