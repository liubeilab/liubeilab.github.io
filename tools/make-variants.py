#!/usr/bin/env python3
"""Smaller WebP copies of the site's photos, for phones.

    python3 tools/make-variants.py        (needs Pillow; run from the repo root)

For every JPEG in assets/img (news, people and the page illustrations) this
writes assets/img/r/<same path>-480.webp and -900.webp, skipping any size the
original is not clearly larger than. build.mjs lists whatever exists here in
the <img srcset>, so a photo without copies still works - it is just served at
full size. Safe to re-run: existing copies newer than their original are kept.
The office PC has no Python; run this in a Claude cloud session after adding
photos, then commit assets/img/r.
"""
import os, sys
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img')
OUT = os.path.join(ROOT, 'r')
WIDTHS = (480, 900)
SKIP_DIRS = {'r', 'alumni'}           # alumni are shown at 84 px
SKIP_FILES = {'share-card.jpg'}       # link-preview card, never in an <img>

made = kept = 0
for base, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if not (base == ROOT and d in SKIP_DIRS)]
    for name in sorted(files):
        if not name.lower().endswith(('.jpg', '.jpeg')) or name in SKIP_FILES:
            continue
        src = os.path.join(base, name)
        rel = os.path.relpath(src, ROOT)
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            for w in WIDTHS:
                if im.width < w * 1.2:
                    continue
                dst = os.path.join(OUT, os.path.splitext(rel)[0] + f'-{w}.webp')
                if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
                    kept += 1
                    continue
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                h = round(im.height * w / im.width)
                im.resize((w, h), Image.LANCZOS).save(dst, 'WEBP', quality=80, method=6)
                made += 1
# drop copies whose original is gone
for base, _, files in os.walk(OUT):
    for name in files:
        stem = name.rsplit('-', 1)[0]
        rel = os.path.relpath(base, OUT)
        if not any(os.path.exists(os.path.join(ROOT, rel, stem + e)) for e in ('.jpg', '.jpeg', '.JPG')):
            os.remove(os.path.join(base, name)); print('removed orphan', name)
print(f'{made} written, {kept} already up to date')
