#!/usr/bin/env python3
"""Stamp the staff app's shared files with a content fingerprint.

Pages link /assets/app/{shell,dashboard}.{css,js} and the marketing site's
/assets/site/site.{css,js} as "...?v=<hash>". GitHub
Pages lets browsers keep a file for 10 minutes, so without a fresh ?v= a
visitor right after a deploy can get new HTML with an old stylesheet (or the
other way round). Run this after editing any of those files, then commit:

    python3 tools/version-assets.py
"""
import hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = ['assets/app/shell.css', 'assets/app/shell.js', 'assets/app/dashboard.css', 'assets/app/dashboard.js',
         'assets/site/site.css', 'assets/site/site.js']
tags = {f: hashlib.sha1((ROOT / f).read_bytes()).hexdigest()[:8] for f in FILES}
changed = []
for page in sorted(ROOT.glob('*.html')):
    text = page.read_text()
    new = text
    for f, tag in tags.items():
        new = re.sub(r'(["\'])/' + re.escape(f) + r'(?:\?v=[0-9a-f]+)?\1', r'\1/' + f + '?v=' + tag + r'\1', new)
    if new != text:
        page.write_text(new)
        changed.append(page.name)
print('versions:', ', '.join(f'{pathlib.Path(f).name}={t}' for f, t in tags.items()))
print('updated:', ', '.join(changed) or 'nothing')
