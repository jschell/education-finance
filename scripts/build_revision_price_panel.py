# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl==3.1.5", "xlrd==2.0.2"]
# ///
"""Build research-only annual snapshot shards. Never modify prior panel/evidence.

--fetch downloads absent pinned sources into the existing ignored source cache.
--verify rebuilds and compares all committed bytes without writing outputs.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import csv,gzip,hashlib,io,json,re,sys,zipfile
from extract_price_trace_sources import dictionary_fields,get_archive,sha
from prepare_ipeds import canonical as identity_canonical
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/research/ipeds-price-snapshots'
DCOLS=['unitid','csvRecord','name','sector','control','level','state']
OCOLS=['unitid','csvRecord','field','raw','flag','value','status']
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)
def amount(raw):
    if raw is None:return None,'missing-field'
    if not raw.strip():return None,'blank'
    if raw.strip()=='.':return None,'dot-missing-marker'
    try:n=float(raw)
    except ValueError:return None,'invalid-number'
    if not __import__('math').isfinite(n):return None,'invalid-number'
    if n<0:return n,'unavailable-code'
    return int(n) if n.is_integer() else n,'zero' if n==0 else 'observed'
def rows(archive):
    with zipfile.ZipFile(ROOT/archive['path']) as z:
        content=z.read(archive['member'])
        try:text=content.decode('utf-8-sig');encoding='utf-8-sig'
        except UnicodeDecodeError:text=content.decode('cp1252');encoding='cp1252'
        reader=csv.DictReader(io.StringIO(text))
        header=[k.strip().lstrip('\ufeff').upper() for k in reader.fieldnames];out={}
        for i,raw in enumerate(reader,2):
            row={str(k).strip().lstrip('\ufeff').upper():str(v or '').strip() for k,v in raw.items() if k is not None}
            unitid=int(row['UNITID'])
            if unitid in out:raise ValueError('Duplicate institution/source: '+str(unitid))
            out[unitid]=(i,row)
    return header,out,encoding
def semantics(field,d):
    prefix=re.match(r'CHG([235])AY',field)[1]
    def norm(s):return re.sub(r'\s+',' ',re.sub(r'\b(?:19|20)\d{2}\s*[-–]\s*(?:\d{4}|\d{2})\b','ACADEMIC_YEAR',s or '')).lower().strip()
    return sha(canonical([prefix,norm(d.get('title')),norm(d.get('descriptionExcerpt'))]).encode())
def pack(body):
    b=io.BytesIO()
    with gzip.GzipFile(filename='',mode='wb',fileobj=b,mtime=0,compresslevel=9) as z:z.write((canonical(body)+'\n').encode())
    return b.getvalue()
def build(fetch=False,verify=False):
    OUT.mkdir(parents=True,exist_ok=True)
    original=json.loads((ROOT/'data/raw/ipeds/sources.json').read_text());dictionary=json.loads((ROOT/'data/ipeds-price-dictionaries.json').read_text())
    with ThreadPoolExecutor(max_workers=4) as pool:archives=list(pool.map(lambda s:get_archive(s,fetch),original['files']))
    if any(not a['matchesPinned'] for a in archives):raise ValueError('Pinned source unavailable: a newer revision was retained separately; cannot reconcile the original panel.')
    snapshots=[]
    for d in dictionary['years']:
        year=d['year'];source={a['kind']:a for a in archives if a['year']==year}
        if sha((ROOT/d['path']).read_bytes())!=d['sha256']:raise ValueError('Dictionary hash mismatch')
        if d['supplement'] and sha((ROOT/d['supplement']['path']).read_bytes())!=d['supplement']['sha256']:raise ValueError('Supplement hash mismatch')
        definitions=dictionary_fields(ROOT/d['path'],d['member'],d['supplement'])
        header,prices,priceEncoding=rows(source['prices']);_,directory,directoryEncoding=rows(source['directory'])
        for field in header:
            if re.fullmatch(r'CHG[235]AY\d+',field) and field not in definitions:
                definitions[field]={'academicYear':None,'title':None,'descriptionExcerpt':None,'descriptionSha256':None,'flag':'X'+field if 'X'+field in header else None,'codes':{}}
        for field,definition in definitions.items():
            definition['semanticSignature']=semantics(field,definition);definition['basis']='published-charge; gross/net continuity unreviewed'
            definition['component']='housing' if field.startswith('CHG5') else 'tuition'
            definition['residency']='not-applicable' if field.startswith('CHG5') else 'in-state' if field.startswith('CHG2') else 'out-of-state'
            definition['living']='on-campus' if field.startswith('CHG5') else 'not-applicable'
        dirs=[[uid,index,r.get('INSTNM'),r.get('SECTOR'),r.get('CONTROL'),r.get('ICLEVEL'),r.get('STABBR')] for uid,(index,r) in sorted(directory.items())]
        observations=[];statuses={}
        for uid in sorted(set(prices)|set(directory)):
            index,row=prices.get(uid,(None,None))
            for field,definition in sorted(definitions.items()):
                raw=row.get(field) if row is not None else None;value,status=amount(raw)
                if row is None:status='missing-source-row'
                statuses[status]=statuses.get(status,0)+1
                observations.append([uid,index,field,raw,row.get(definition['flag']) if row is not None else None,value,status])
        payload={'schema':1,'year':year,'directoryColumns':DCOLS,'observationColumns':OCOLS,'directories':dirs,'observations':observations}
        b=pack(payload);path=OUT/f'{year}.json.gz'
        if verify:
            if not path.exists() or path.read_bytes()!=b:raise ValueError('Shard differs: '+str(year))
        else:path.write_bytes(b)
        sources={kind:{**{k:a[k] for k in ['year','kind','file','url','member','bytes','sha256','pinnedSha256','matchesPinned']},
            'encoding':priceEncoding if kind=='prices' else directoryEncoding,'retrieved':'2026-11-17','pinnedManifestRetrieved':original['retrieved'],'publicationDate':None,'originalVintageVerified':False,'availabilityEvidence':None} for kind,a in source.items()}
        snapshots.append({'year':year,'sources':sources,'dictionary':{k:d[k] for k in ['path','member','url','sha256']},'supplement':d['supplement'],
            'fields':definitions,'shard':str(path.relative_to(ROOT)),'shardSha256':sha(b),'bytes':len(b),'observations':len(observations),'priceInstitutions':len(prices),'directoryInstitutions':len(directory),'statuses':statuses})
        print(json.dumps({'year':year,'observations':len(observations),'bytes':len(b)}),flush=True)
    paths=['docs/revision-aware-price-panel-plan.md','docs/revision-aware-panel-execution.md','scripts/build_revision_price_panel.py','scripts/extract_price_trace_sources.py','scripts/prepare_ipeds.py','data/raw/ipeds/sources.json','data/ipeds-price-dictionaries.json']
    body={'id':'revision-aware-price-panel-v1','schema':1,'scope':'All annual archive institutions, 2000–2023; not a stable or representative school population',
      'sourceHashes':{p:sha((ROOT/p).read_bytes()) for p in paths},'snapshots':snapshots,
      'limitations':['Revised retrieved annual files are not original publication vintages. Strict historical as-of support is unavailable without independent availability evidence.','Semantic signatures detect text changes, not undocumented gross/net or population changes. An unreviewed basis is explicit.','Missing source rows include institutions not reporting the academic-year component, not necessarily reporting errors.','Manifest/shard hashes pin research versions; newly retrieved bytes require a new panel version. Original data/forecasts remain unchanged.']}
    body['sha256']=sha(identity_canonical(body).encode());text=json.dumps(body,sort_keys=True,indent=2,ensure_ascii=False)+'\n';p=OUT/'manifest.json'
    if verify:
        if p.read_text()!=text:raise ValueError('Manifest differs')
    else:p.write_text(text)
    print(json.dumps({'observations':sum(x['observations'] for x in snapshots),'bytes':sum(x['bytes'] for x in snapshots),'hash':body['sha256']}))
if __name__=='__main__':build('--fetch' in sys.argv,'--verify' in sys.argv)
