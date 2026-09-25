import json, re
from pathlib import Path

snapshot=Path('src/data/merged-content.json')
manifest=json.loads(Path('legacy-media-migration-manifest.json').read_text())['objects']
results=[json.loads(line) for line in Path('legacy-media-migration-results.jsonl').read_text().splitlines() if line.strip()]
if len(results)!=len(manifest) or not all(r.get('ok') for r in results): raise SystemExit('migration results are incomplete')
by_source={r['sourceUrl'].replace('http://','https://',1): r['deliveryUrl'] for r in results}
by_base={k.split('?',1)[0]:v for k,v in by_source.items()}

def replacement(url):
    if not isinstance(url,str) or 'wp-content' not in url: return url
    normalized=url.replace('http://','https://',1)
    return by_source.get(normalized) or by_base.get(normalized.split('?',1)[0]) or url

def rewrite(value):
    if not isinstance(value,str): return value
    return re.sub(r'https?://[^\s"\'<>]+', lambda m: replacement(m.group(0).rstrip('),.;')), value)

D=json.loads(snapshot.read_text())
changed=0; refs=0; unresolved=[]
for article in D.get('articles',[]):
    if 'remradar.wordpress.com' not in (article.get('sourceUrl') or ''): continue
    before=json.dumps(article,ensure_ascii=False)
    for key in ('imageUrl','featuredImage','bodyHtml','body'):
        article[key]=rewrite(article.get(key))
    after=json.dumps(article,ensure_ascii=False)
    if before!=after: changed+=1
    refs += after.count('https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev/legacy/webp/')
    for u in re.findall(r'https?://[^\s"\'<>]+', after):
        if 'wp-content' in u and u not in by_source and u not in by_base: unresolved.append(u)
snapshot.write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
report={'migration_objects':len(results),'successful_uploads':sum(bool(r.get('ok')) for r in results),'legacy_articles_changed':changed,'r2_webp_references':refs,'unresolved_wordpress_urls':sorted(set(unresolved))}
Path('legacy-media-migration-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if unresolved: raise SystemExit('unresolved URLs remain')
