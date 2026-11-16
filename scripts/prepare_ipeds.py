"""Offline fixed-institution price panels from pinned annual IPEDS archives."""
from pathlib import Path
import csv,gzip,hashlib,io,json,math,statistics,zipfile
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/ipeds'
YEARS=list(range(2000,2024))
FIELDS=['CHG2AY3','CHG3AY3','CHG5AY3']

def read_archive(path):
    with zipfile.ZipFile(path) as archive:
        names=[n for n in archive.namelist() if n.lower().endswith('.csv')]
        # Prefer revised/final when the archive contains multiple versions.
        name=next((n for n in names if '_rv' in n.lower()),names[0])
        reader=csv.DictReader(io.StringIO(archive.read(name).decode('utf-8-sig',errors='replace')))
        rows=[{k.strip().upper():v.strip() for k,v in r.items() if k is not None} for r in reader]
        return rows,name

def positive(value):
    try:
        n=float(value)
        return n if math.isfinite(n) and n>0 else None
    except (TypeError,ValueError):return None

def canonical(value):
    if value is None:return 'null'
    if isinstance(value,bool):return 'true' if value else 'false'
    if isinstance(value,(int,float)):return format(0 if value==0 else value,'.10f')
    if isinstance(value,str):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
    if isinstance(value,list):return '['+','.join(canonical(v) for v in value)+']'
    return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+canonical(value[k]) for k in sorted(value))+'}'

def build():
    source=json.loads((RAW/'sources.json').read_text());source['files']=sorted(source['files'],key=lambda r:(r['year'],r['kind']))
    archive_log=source['files']
    selected=(RAW/'selected.csv.gz').read_bytes()
    if hashlib.sha256(selected).hexdigest()!=source['selectedSha256']:
        raise ValueError('IPEDS source subset hash mismatch')
    yearly={year:{} for year in YEARS}
    for row in csv.DictReader(io.StringIO(gzip.decompress(selected).decode())):
        year=int(row['YEAR']);unit=int(row['UNITID']);sector=row['SECTOR']
        if sector not in ['1','2','4']:continue
        yearly[year][unit]={'sector':sector,'values':[positive(row.get(f)) for f in FIELDS],'flags':[row.get('X'+f,'Unavailable') for f in FIELDS]}
    all_ids=set.union(*(set(y) for y in yearly.values()))
    stable={u for u in all_ids if all(u in yearly[y] for y in YEARS) and len({yearly[y][u]['sector'] for y in YEARS})==1}
    calibration=json.loads((ROOT/'site/data/calibration.json').read_text());deflators={r['year']:r['deflator'] for r in calibration['prices']['public4']}
    prices={};panels={};counts={};records={}
    for name,sector,field in [('public4','1',0),('public4out','1',1),('public2','4',0),('public2out','4',1),('private4','2',0)]:
        ids=sorted(u for u in stable if yearly[2000][u]['sector']==sector)
        groups={k:[u for u in ids if all(yearly[y][u]['values'][i] is not None for y in YEARS)] for k,i in [('tuition',field),('housing',2)]}
        if any(len(v)<10 for v in groups.values()):raise ValueError('Too few comparable institutions: '+name)
        prices[name]=[]
        for year in YEARS:
            level={key:math.exp(statistics.mean(math.log(yearly[year][u]['values'][field if key=='tuition' else 2]) for u in group)) for key,group in groups.items()}
            prices[name].append({'year':year,**level,'deflator':deflators[year]})
        panels[name]=groups
        flag_counts={}
        for key,group in groups.items():
            for year in YEARS:
                for u in group:
                    flag=yearly[year][u]['flags'][field if key=='tuition' else 2]
                    flag_counts[flag]=flag_counts.get(flag,0)+1
        candidates={u for y in YEARS for u,r in yearly[y].items() if r['sector']==sector}
        counts[name]={'everInSector':len(candidates),'stableSector':len(ids),'tuitionInstitutions':len(groups['tuition']),'housingInstitutions':len(groups['housing']),'jointInstitutions':len(set(groups['tuition'])&set(groups['housing'])),'excludedUnstableOrAbsent':len(candidates-set(ids)),'excludedTuitionMissing':len(ids)-len(groups['tuition']),'excludedHousingMissing':len(ids)-len(groups['housing']),'sourceFlags':flag_counts}
        joint=sorted(set(groups['tuition'])&set(groups['housing']))
        records[name]=[{'unitid':u,'tuition':[yearly[y][u]['values'][field] for y in YEARS],'housing':[yearly[y][u]['values'][2] for y in YEARS]} for u in joint]
    body={'id':'ipeds-fixed-panel-2000-2023-v1','asOf':'2026-11-16','start':2000,'end':2023,'source':{'name':'NCES IPEDS annual academic-year student charges, 2000–2023','url':'https://nces.ed.gov/ipeds/use-the-data','coverage':'Fixed UNITID panels; separate public in-state/out-of-state tuition and required fees, private nonprofit tuition, and on-campus room/board. Equal-school geometric price levels, not national enrollment-weighted prices.','prepared':'2026-11-16'},'fields':{'tuitionInState':'CHG2AY3','tuitionOutOfState':'CHG3AY3','housing':'CHG5AY3','classification':'SECTOR: 1 public four-year, 2 private nonprofit four-year, 4 public two-year'},'prices':prices,'panels':panels,'counts':counts,'raw':archive_log,'selectedSha256':source['selectedSha256'],'limitations':['Complete-record survivorship selection: closed, reclassified and incomplete institutions are excluded using full-window membership. Tests are retrospective, not real-time vintage experiments.','Tuition and housing panel membership differs. Housing is on-campus budget, not local rents. Source imputation flags are retained and counted, not silently treated as directly observed quotes.','School counts do not multiply independent economic periods. Public/private and residency series share institutions and macro history.']}
    body['sha256']=hashlib.sha256(canonical(body).encode()).hexdigest()
    (ROOT/'site/data/ipeds-panel.json').write_text(json.dumps(body,separators=(',',':'))+'\n')
    (ROOT/'data/ipeds-institutions.json.gz').write_bytes(gzip.compress(json.dumps({'years':YEARS,'series':records},separators=(',',':')).encode(),mtime=0))
    (ROOT/'data/ipeds-manifest.json').write_text(json.dumps({k:v for k,v in body.items() if k not in ['prices','panels']},indent=2)+'\n')
    print(json.dumps(counts,indent=2))
if __name__=='__main__':build()
