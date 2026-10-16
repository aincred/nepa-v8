#!/usr/bin/env python3
"""
check_site.py - safety check. Run it BEFORE you upload the website, every time.

    python check_site.py

It prints  PASS  or a list of  FAIL  lines that tell you exactly what to fix.
(Lines marked WARN are worth a look but will not break pages.)

What it checks
  1. js/partials-bundle.js is up to date with partials/*.html      (else: python build_partials.py)
  2. Every page loads the scripts in the right order
  3. Every page has exactly one header, one footer, one back-to-top slot
  4. Every JavaScript file has no syntax error (needs Node.js; skipped if not installed)
  5. Every local CSS / JS / page / PDF link points to a file that really exists
  6. The header still contains the parts main.js needs (menu button, accessibility panel, ticker)
"""
import json, os, re, subprocess, sys, shutil, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
fails, warns = [], []
def fail(m): fails.append(m)
def warn(m): warns.append(m)
def read(p): return open(p, encoding="utf-8", errors="replace").read()

# ---- 1. bundle in sync ------------------------------------------------------
parts = {}
for f in sorted(os.listdir("partials")):
    if f.endswith(".html"):
        parts["partials/" + f] = read("partials/" + f).replace("\r\n", "\n").replace("\r", "\n")
try:
    b = read("js/partials-bundle.js")
    obj = json.loads(b[b.index("{"): b.rindex("}") + 1].replace("<\\/", "</"))
    for k, v in parts.items():
        if k not in obj: fail("bundle is missing %s  ->  run: python build_partials.py" % k)
        elif obj[k] != v: fail("bundle is OUT OF DATE for %s  ->  run: python build_partials.py" % k)
    for k in obj:
        if k not in parts: warn("bundle contains %s which no longer exists in partials/" % k)
except Exception as e:
    fail("js/partials-bundle.js is unreadable (%s)  ->  run: python build_partials.py" % e)

# ---- 2/3. pages -------------------------------------------------------------
HEAD_ORDER = ["partials/loader.js", "js/partials-bundle.js", "js/include.js"]
TAIL_NEED = ["js/main.js", "js/lang.js", "partials/backtotop.js"]
def scripts(html): return re.findall(r'<script[^>]*\ssrc="([^"]+)"', html)
pages = sorted(glob.glob("*.html"))
for p in pages:
    if p.startswith("_") and p != "_template.html": continue
    h = read(p)
    if "data-include" not in h:
        if "http-equiv=\"refresh\"" not in h: warn("%s has no header/footer includes (redirect page?)" % p)
        continue
    head, _, body = h.partition("</head>")
    hs = scripts(head)
    pos = [hs.index(x) if x in hs else -1 for x in HEAD_ORDER]
    if -1 in pos or pos != sorted(pos):
        fail("%s: <head> must load, in this order: %s" % (p, ", ".join(HEAD_ORDER)))
    if "partials/loader.css" not in head: fail("%s: <head> is missing partials/loader.css" % p)
    bs = scripts(body)
    for need in TAIL_NEED:
        if need not in bs: fail("%s: end of page is missing <script src=\"%s\">" % (p, need))
    for banned in ("js/lang-hi.js", "js/include.js", "js/partials-bundle.js"):
        if banned in bs: fail("%s: <script src=\"%s\"> must NOT be at the end of the page (lang.js / <head> load it)" % (p, banned))
    for slot in ("header", "footer", "backtotop"):
        n = len(re.findall(r'data-include="partials/%s\.html"' % slot, h))
        if n != 1: fail("%s: has %d x partials/%s.html placeholders (must be exactly 1)" % (p, n, slot))
    if h.find('data-include="partials/header.html"') > h.find('data-include="partials/footer.html"'):
        fail("%s: header placeholder must come before footer placeholder" % p)

# ---- 4. JS syntax -----------------------------------------------------------
if shutil.which("node"):
    for jf in sorted(glob.glob("js/*.js") + glob.glob("partials/*.js")):
        r = subprocess.run(["node", "--check", jf], capture_output=True, text=True)
        if r.returncode: fail("JavaScript syntax error in %s: %s" % (jf, r.stderr.strip().splitlines()[0] if r.stderr else "?"))
else:
    warn("Node.js not installed - JavaScript syntax check skipped")

# ---- 5. local references ----------------------------------------------------
# Code and pages (css / js / html) must exist: a miss here is a FAIL.
# Photos and documents (images/, pdfs/, ...) are reported as a WARN count only, because they
# are large and often kept outside the code folder.
from urllib.parse import unquote
missing_media, seen_fail = {}, set()
for p in pages + ["partials/header.html", "partials/footer.html", "partials/backtotop.html"]:
    h = read(p)
    for m in re.finditer(r'(?:src|href)="([^"#?]+)', h):
        u = m.group(1).strip()
        if re.match(r'(https?:|mailto:|tel:|javascript:|data:|//)', u, re.I): continue
        if "{" in u or "'" in u: continue
        path = unquote(u).lstrip("/")
        if path.startswith("./"): path = path[2:]
        if os.path.exists(path): continue
        ext = os.path.splitext(path)[1].lower()
        if ext in (".css", ".js", ".html", ".htm", ""):
            if (p, path) not in seen_fail:
                seen_fail.add((p, path)); fail("%s links to %s which does not exist" % (p, path))
        else:
            missing_media.setdefault(path.split("/")[0], set()).add(path)
for folder, files in sorted(missing_media.items()):
    warn("%d file(s) in %s/ are linked but not found in this folder (e.g. %s)" % (len(files), folder, sorted(files)[0]))

# ---- 6. header hooks main.js needs -----------------------------------------
hd = parts.get("partials/header.html", "")
for label, needle in [("menu  id=\"site-nav\"", 'id="site-nav"'), ("menu button  class \"menu-toggle\"", "menu-toggle"),
                      ("accessibility panel  id=\"a11y-panel\"", 'id="a11y-panel"'), ("language buttons  data-lang", "data-lang="),
                      ("ticker  id=\"ticker\"", 'id="ticker"')]:
    if needle not in hd: fail("partials/header.html no longer contains the %s that the scripts use" % label)
if 'id="to-top"' not in parts.get("partials/backtotop.html", ""): fail('partials/backtotop.html must contain id="to-top"')

# ---- result -----------------------------------------------------------------
for w in warns: print("WARN  " + w)
for f in fails: print("FAIL  " + f)
if fails:
    print("\n%d problem(s). Fix them before uploading." % len(fails)); sys.exit(1)
print("\nPASS  %d pages checked, header/footer scripts are in good shape." % len([p for p in pages if not p.startswith('_')]))
