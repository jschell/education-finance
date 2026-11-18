# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl==3.1.5", "xlrd==2.0.2"]
# ///
"""Extract bounded official source rows; never replace original panel/source bytes.

--fetch fills an ignored cache (absent files only); --verify-excerpts checks the
committed small extracts against cached archives without writing them. Field years
come exclusively from year-specific dictionary text. Archive mismatches are
retained under their actual hash and explicitly identified as newer revisions.
"""
from pathlib import Path
from html import unescape
import csv,hashlib,io,json,re,sys,urllib.request,zipfile
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache/price-trace'
OUT=ROOT/'data/calibration-diagnostics/price-trace-sources.json'
def sha(b):return hashlib.sha256(b).hexdigest()
def clean(x):return re.sub(r'\s+',' ',unescape(re.sub('<[^>]+>',' ',str(x or '')))).strip()
def academic_year(title):
    matches=re.findall(r'\b((?:19|20)\d{2})\s*[-–]\s*(\d{4}|\d{2})\b',title)
    if len(matches)!=1:return None
    start,end=matches[0];start=int(start);end=int(end) if len(end)==4 else (start//100)*100+int(end)
    if end<start:end+=100
    return start if end==start+1 else None

def dictionary_fields(path,member,supplement=None):
    with zipfile.ZipFile(path) as z:b=z.read(member)
    if member.lower().endswith(('.htm','.html')):
        text=b.decode('cp1252');fields={}
        pattern=r'(?<![A-Z0-9])(CHG[235]AY\d+)-(\d+)-([^<\r\n]+)\s*<br>(.*?)<!-- BEGIN CLASS'
        for m in re.finditer(pattern,text,re.S|re.I):
            name=m[1].upper();title=clean(m[3]);desc=clean(re.split('<table',m[4],flags=re.I)[0])
            flag=re.search(r'X'+name+r'-Imputation field for '+name+r'-\d+-[^<\r\n]+(.*?)<hr>',text,re.S|re.I)
            codes={k:clean(v) for k,v in re.findall(r'<td[^>]*>([A-Z])</td>\s*<td[^>]*>([^<]+)</td>',flag[1],re.I)} if flag else {}
            fields[name]={'title':title,'academicYear':academic_year(title),'descriptionExcerpt':desc[:500],'descriptionSha256':sha(desc.encode()),'flag':'X'+name,'codes':codes}
        if not fields:raise ValueError('Missing HTML price fields')
        return fields
    if member.lower().endswith('.xls'):
        import xlrd
        w=xlrd.open_workbook(file_contents=b);sheets={s.name.lower():[s.row_values(i) for i in range(s.nrows)] for s in w.sheets()}
    else:
        import openpyxl
        w=openpyxl.load_workbook(io.BytesIO(b),read_only=True,data_only=True);sheets={s.title.lower():list(s.values) for s in w}
    descs={clean(r[1]).upper():clean(r[2]) for r in sheets.get('description',[])[1:] if len(r)>2}
    codes={clean(r[0]):clean(r[1]) for r in sheets.get('imputation values',[]) if len(r)>1 and re.fullmatch('[A-Z]',clean(r[0]))}
    if not codes and supplement:
        import openpyxl
        with zipfile.ZipFile(ROOT/supplement['path']) as z:
            w=openpyxl.load_workbook(io.BytesIO(z.read(supplement['member'])),read_only=True,data_only=True)
            rows=list(w[supplement['sheet']].values)
        codes={clean(r[0]):clean(r[1]) for r in rows if len(r)>1 and re.fullmatch('[A-Z]',clean(r[0]))}
    fields={}
    for r in sheets['varlist'][1:]:
        name=clean(r[1]).upper()
        if re.fullmatch(r'CHG[235]AY\d+',name):
            title=clean(r[6]);desc=descs.get(name,'')
            fields[name]={'title':title,'academicYear':academic_year(title),'descriptionExcerpt':desc[:500],'descriptionSha256':sha(desc.encode()),'flag':clean(r[5]).upper(),'codes':codes}
    return fields

def get_archive(source,fetch):
    CACHE.mkdir(parents=True,exist_ok=True);p=CACHE/source['file']
    if not p.exists():
        # A changed source is never stored under the pinned-original cache name.
        revisions=sorted(CACHE.glob(source['file']+'.*.zip'))
        if len(revisions)>1:raise ValueError('Multiple cached revisions require explicit selection: '+source['file'])
        if revisions:p=revisions[0]
        elif fetch:
            b=urllib.request.urlopen(source['url'],timeout=45).read();actual=sha(b)
            if actual!=source['sha256']:p=CACHE/(source['file']+'.'+actual+'.zip')
            p.write_bytes(b)
        else:raise FileNotFoundError('Missing archive; use --fetch: '+source['file'])
    b=p.read_bytes();actual=sha(b)
    return source|{'path':str(p.relative_to(ROOT)),'sha256':actual,'pinnedSha256':source['sha256'],'bytes':len(b),'matchesPinned':actual==source['sha256']}

def rows_for(archive,ids):
    with zipfile.ZipFile(ROOT/archive['path']) as z:
        if archive['member'] not in z.namelist():raise ValueError('Pinned member unavailable: '+archive['member'])
        reader=csv.DictReader(io.StringIO(z.read(archive['member']).decode('cp1252')));rows=[]
        for index,raw in enumerate(reader,2):
            row={str(k).strip().lstrip('\ufeff').upper():str(v or '').strip() for k,v in raw.items() if k is not None}
            if row.get('UNITID','').isdigit() and int(row['UNITID']) in ids:
                keep={k:v for k,v in row.items() if (re.fullmatch(r'X?CHG\d+AY\d+|X?(?:TUITION|FEE)\d+|X?(?:ROOMAMT|BOARDAMT|RMBRDAMT)',k) or k in ['UNITID','INSTNM','SECTOR','CONTROL','ICLEVEL','STABBR','HLOFFER','DEGGRANT','ROOM','BOARD','ROOMCAP','MEALSWK'])}
                rows.append({'unitid':int(row['UNITID']),'csvRecord':index,'fields':keep})
        if len({r['unitid'] for r in rows})!=len(rows):raise ValueError('Duplicate UNITID')
        return rows

def build(fetch=False):
    registry=json.loads((ROOT/'data/calibration-diagnostics/price-trace-registry.json').read_text());manifest=json.loads((ROOT/'data/raw/ipeds/sources.json').read_text());dictionary=json.loads((ROOT/'data/ipeds-price-dictionaries.json').read_text())
    ids={year:{e['unitid'] for e in registry['events'] if e['year']<=year<=e['year']+3} for year in registry['archiveYears']}
    wanted=[s for s in manifest['files'] if s['year'] in ids]
    with ThreadPoolExecutor(max_workers=4) as pool:archives=list(pool.map(lambda s:get_archive(s,fetch),wanted))
    snapshots=[]
    for d in dictionary['years']:
        year=d['year']
        if year not in ids:continue
        if sha((ROOT/d['path']).read_bytes())!=d['sha256']:raise ValueError('Dictionary hash mismatch')
        if d['supplement'] and sha((ROOT/d['supplement']['path']).read_bytes())!=d['supplement']['sha256']:raise ValueError('Supplement hash mismatch')
        fields=dictionary_fields(ROOT/d['path'],d['member'],d['supplement'])
        snapshots.append({'year':year,'dictionary':{k:d[k] for k in ['path','member','url','sha256']},'supplement':d['supplement'],'fields':fields,
            'archives':[a|{'rows':rows_for(a,ids[year])} for a in archives if a['year']==year]})
    body={'id':'price-trace-source-excerpts-v1','retrieved':'2026-11-17','registryHash':registry['sha256'],'extractorSha256':sha(Path(__file__).read_bytes()),'snapshots':snapshots,
      'limitations':['Retrieval is of revised historical files, not their original publication vintages. Hash agreement establishes pinned-byte identity only.','Same academic year across annual files uses dictionary title/description; missing or ambiguous field years remain null.','Raw source strings and imputation flags are retained; excerpts are not corrected observations.','CSV record is the parsed record ordinal with header counted as record 1, not a byte offset or physical line number.']}
    return body
if __name__=='__main__':
    body=build('--fetch' in sys.argv);text=json.dumps(body,sort_keys=True,indent=2)+'\n'
    if '--verify-excerpts' in sys.argv:
        if text!=OUT.read_text():raise ValueError('Committed source excerpts differ from archives/extractor')
    else:OUT.write_text(text)
    print(json.dumps({'snapshots':len(body['snapshots']),'archiveMismatches':sum(not a['matchesPinned'] for s in body['snapshots'] for a in s['archives']),'priceRows':sum(len(a['rows']) for s in body['snapshots'] for a in s['archives'] if a['kind']=='prices')}))
