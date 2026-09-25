import json, subprocess, time
from pathlib import Path
manifest=json.loads(Path('legacy-media-migration-manifest.json').read_text())['objects']
base=Path('legacy-media-migration-results.jsonl')
start=0
if base.exists():
    start=sum(1 for _ in base.open())
print(f'starting_at={start} total={len(manifest)}', flush=True)
for offset in range(start, len(manifest), 20):
    rows=manifest[offset:offset+20]
    Path('/tmp/legacy-migration-batch.json').write_text(json.dumps(rows))
    for attempt in range(3):
        try:
            p=subprocess.run(['curl','-sS','--fail-with-body','--max-time','120','-X','POST','https://radarsite-legacy-media-migrator.radarcharts-cache.workers.dev','-H','content-type: application/json','--data-binary','@/tmp/legacy-migration-batch.json'],capture_output=True,text=True,timeout=135)
            if p.returncode == 0:
                data=json.loads(p.stdout); break
            data={'ok':False,'results':[{'ok':False,'error':p.stderr or p.stdout}]}
        except Exception as e:
            data={'ok':False,'results':[{'ok':False,'error':str(e)}]}
        time.sleep(2 ** attempt)
    for row in data.get('results',[]):
        base.open('a').write(json.dumps(row)+'\n')
    good=sum(bool(r.get('ok')) for r in data.get('results',[]))
    print(f'offset={offset} count={len(rows)} ok={good} failed={len(rows)-good}', flush=True)
    if not data.get('ok'):
        print('batch_failed_continue=true', flush=True)
print('complete=true', flush=True)
