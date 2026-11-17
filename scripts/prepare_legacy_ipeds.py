"""Pin a definition-audited tuition extension; never splice it into production.
Run with --fetch to retrieve official archives. Cached archives are SHA-pinned in
manifest output. No family data. Housing is explicitly excluded from continuity.
"""
import argparse,csv,gzip,hashlib,html,io,json,re,urllib.request,zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--fetch',action='store_true');args=p.parse_args()
names={1990:'IC90D',1991:'ic1991_d',1992:'IC1992_B',1993:'IC1993_B',1994:'IC1994_B',1995:'ic9596_B',1996:'ic9697_B',1997:'ic9798_D',1998:'IC98_D',1999:'IP1999AY'}
cache=Path('.cache/legacy');cache.mkdir(parents=True,exist_ok=True)
manifest=[];tables={};dictionary={}
for year,name in names.items():
 for suffix in ['', '_Dict']:
  file=cache/(name+suffix+'.zip');url='https://nces.ed.gov/ipeds/datacenter/data/'+file.name
  if args.fetch and not file.exists():file.write_bytes(urllib.request.urlopen(url,timeout=60).read())
  body=file.read_bytes();z=zipfile.ZipFile(io.BytesIO(body));member=z.namelist()[0]
  manifest.append(dict(year=year,url=url,sha256=hashlib.sha256(body).hexdigest(),member=member))
  text=z.read(member).decode('utf-8-sig',errors='replace')
  if suffix:
   text=html.unescape(re.sub('<[^>]*>',' ',text));text=re.sub(r'\s+',' ',text)
   fields=['TUITION1','TUITION2','TUITION3'] if year<1999 else ['CHG2AY3','CHG3AY3','CHG5AY3']
   excerpts={}
   for field in fields:
    matches=list(re.finditer(field+r'[- ]\d',text,re.I));match=matches[-1];excerpts[field]=text[match.start():match.start()+420]
   dictionary[str(year)]=excerpts
  else:tables[year]={int(r['unitid']):r for r in csv.DictReader(io.StringIO(text))}
panel=json.load(gzip.open('data/ipeds-institutions.json.gz','rt'))
ids=set()
for schools in panel['series'].values():
 ids.update(r['unitid'] for r in schools if all(v is not None and v>0 for v in r['tuition']) and all(v is not None and v>0 for v in r['housing']))
def positive(row,key):
 try:v=float(row.get(key,''));return v if v>0 else None
 except ValueError:return None
def flag(row,key):return row.get('x'+key,'unavailable')
def quantile(xs,q):
 xs=sorted(xs)
 return xs[int((len(xs)-1)*q)] if xs else None
records=[];counts=[]
for year,table in tables.items():
 n=0
 for unitid in sorted(ids):
  row=table.get(unitid)
  if row is None:continue
  a,z=('tuition2','tuition3') if year<1999 else ('chg2ay3','chg3ay3')
  inside,outside=positive(row,a),positive(row,z)
  if inside is None and outside is None:continue
  records.append([year,unitid,inside,outside,flag(row,a),flag(row,z)]);n+=1
 counts.append(dict(year=year,rawInstitutions=len(table),matchedWithPositiveTuition=n))
path=Path('data/legacy-tuition-panel.csv')
with path.open('w',newline='')as f:
 writer=csv.writer(f,lineterminator='\n');writer.writerow(['year','unitid','instate','outstate','instateFlag','outstateFlag']);writer.writerows(records)
boundaries=[]
for year,suffix in [(1997,1),(1998,2)]:
 for key,old in [('chg2ay','tuition2'),('chg3ay','tuition3')]:
  ratios=[]
  for unitid in ids:
   a=tables[year].get(unitid,{});b=tables[1999].get(unitid,{})
   v,w=positive(a,old),positive(b,key+str(suffix))
   if v and w:ratios.append(w/v)
  boundaries.append(dict(year=year,field=old,comparison='IP1999AY retrospective first-time first-year attendance price',n=len(ratios),exactMatches=sum(abs(x-1)<1e-9 for x in ratios),p10=quantile(ratios,.1),median=quantile(ratios,.5),p90=quantile(ratios,.9)))
report=dict(id='legacy-ipeds-definition-audit-v1',asOf='2026-11-16',source='Official NCES archives and dictionaries',archives=manifest,dictionary=dictionary,counts=counts,bridgeAudit=boundaries,selectedInstitutions=len(ids),selectedFile=str(path),selectedSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
 fieldContract={'1990-1998':'TUITION2/3: full-time, full-year undergraduate tuition and required fees, in-state/out-of-state. TUITION1 is in-district and is never substituted.', '1999':'IP1999AY CHG2AY3/CHG3AY3: published first-time first-year degree-seeking tuition and fees. IC99_D tuition alone excludes separately reported fees and is not used.', 'identity':'Exact UNITID matches to existing joint-complete surviving panels; no fuzzy identity joins or claim of unchanged sector/status.', 'flags':'Preserve supplied X flags; earlier absent flags are unavailable, never reported. Positive values may include imputations.', 'housing':'Unavailable for this bridge: typical room/board and combined-charge fields cannot be treated as unchanged first-year on-campus attendance budgets. No missing combined amounts are synthesized.'},
 status='Research tuition bridge only; definition breakpoint and survivor selection retained. Not active in production or whole-plan calibration.',limitations=['1999 changes the student population definition; exact same-year overlap disagreements are reported, not adjusted away.','Revised archives and future-selected surviving institution IDs do not reconstruct publication vintages.','No new independent 18-year whole-plan funding outcomes; tuition-only history does not supply comparable housing or joint macro outcomes.'])
Path('data/legacy-ipeds-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'institutions':len(ids),'rows':len(records),'counts':counts,'boundary':boundaries}))
