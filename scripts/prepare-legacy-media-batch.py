import json, re, hashlib
from pathlib import Path
D=json.loads(Path('src/data/merged-content.json').read_text())
urls=set()
for x in D['articles']:
    if 'remradar.wordpress.com' not in (x.get('sourceUrl') or ''): continue
    text=' '.join(str(x.get(k) or '') for k in ('featuredImage','imageUrl','bodyHtml','body'))
    for u in re.findall(r'https?://[^\s"\'<>]+', text):
        u=u.rstrip('),.;')
        if 'wp-content' in u: urls.add(u.replace('http://','https://',1))
rows=[]
for u in sorted(urls):
    digest=hashlib.sha256(u.encode()).hexdigest()
    rows.append({'sourceUrl':u,'key':f'legacy/webp/{digest[:2]}/{digest}.webp'})
Path('legacy-media-migration-manifest.json').write_text(json.dumps({'source':'remradar.wordpress.com','count':len(rows),'objects':rows},indent=2)+'\n')
print(len(rows))
print(rows[:2])
print('bytes',Path('legacy-media-migration-manifest.json').stat().st_size)
if len(rows) != 897: raise SystemExit('unexpected URL count')
paths=Path('legacy-media-migration-manifest.json')
# Create a compact JavaScript literal for the Cloudflare MCP execution call.
Path('/tmp/legacy-media-urls.js').write_text(json.dumps(rows,separators=(',',':')))
print('js_literal_bytes',Path('/tmp/legacy-media-urls.js').stat().st_size)
Content=None
if False: print(Content)
# prevent accidental execution of migration from this helper
# This file only creates the manifest.
