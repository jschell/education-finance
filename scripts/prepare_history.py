"""Build the pinned joint monthly dataset from committed, attributed raw inputs."""
from pathlib import Path
import csv,json,hashlib,math,datetime
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data'/'raw'
def read_csv(name):
 with (RAW/name).open(newline='') as f:return list(csv.DictReader(f))
def ym(s):
 if '/' in s:
  m,_,y=s.split('/');return f'{int(y):04}-{int(m):02}'
 if '-' in s:return s[:7]
 return s[:4]+'-'+s[4:6]
def prev(s):
 y,m=map(int,s.split('-'));return f'{y-1:04}-12' if m==1 else f'{y:04}-{m-1:02}'
if (RAW/'bonds.csv').exists():
 source=(RAW/'bonds.csv').read_bytes();rows=[r for r in read_csv('bonds.csv') if r['country']=='US']
 with (RAW/'us-bonds.csv').open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=['date','country','trHedgedUSD']);w.writeheader();w.writerows(rows)
 (RAW/'bonds-original.sha256').write_text(hashlib.sha256(source).hexdigest()+'\n')
stock={ym(r['month']):(float(r['mktrf'])+float(r['rf']),float(r['rf'])) for r in read_csv('french.csv')}
bond={ym(r['date']):float(r['trHedgedUSD']) for r in read_csv('us-bonds.csv')}
cpi={ym(r['date']):float(r['CPI']) for r in read_csv('cpi.csv') if r['CPI']}
tuition={}
for path in sorted(RAW.glob('tuition*.json')):
 j=json.loads(path.read_text());assert j['status']=='REQUEST_SUCCEEDED'
 series=j['Results']['series'][0];assert series['seriesID']=='CUUR0000SEEB01'
 for r in series['data']:
  if r['period'].startswith('M') and 1<=int(r['period'][1:])<=12:
   tuition[f"{r['year']}-{int(r['period'][1:]):02}"]=float(r['value'])
rows=[]
for y in range(1978,2025):
 for m in range(1,13):
  d=f'{y}-{m:02}'
  prior=prev(d)
  assert all(d in x for x in [stock,bond,cpi,tuition]),f'Missing observation {d}'
  assert prior in cpi and prior in tuition,f'Missing index predecessor {prior}'
  equity,cash=stock[d]
  row=[d,equity,bond[d],cash,cpi[d]/cpi[prior]-1,tuition[d]/tuition[prior]-1]
  assert all(math.isfinite(v) and -.99<v<2 for v in row[1:]),row
  rows.append([d]+[round(v,10) for v in row[1:]])
assert len(rows)==564
assert next(r[1] for r in rows if r[0]=='1987-10')<-.15
assert math.prod(1+r[2] for r in rows if r[0].startswith('2022'))-1<-.1
manifest={
 'id':'us-joint-monthly-1978-2024-v1','asOf':'2026-11-15','start':rows[0][0],'end':rows[-1][0],
 'columns':['month','stocks','bonds','cash','inflation','tuition'],'units':'Nominal monthly simple returns / monthly index changes, decimal fractions',
 'sources':[
 {'name':'Fama/French US market total return and RF, legacy FIZ snapshot','url':'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html','snapshotUrl':'https://raw.githubusercontent.com/travlake/retirement_viz/71dc93acd53b521af01b587867027a5c5ff58f1f/mktrf.csv','transform':'stocks = mktrf + rf; cash = rf. Snapshot columns already decimal fractions.','rights':'Copyright Eugene F. Fama and Kenneth R. French; separate attribution from MIT application code.'},
 {'name':'ReturnDataFiles US 10-year sovereign bond nominal total-return proxy','url':'https://github.com/birjusuketupatel/ReturnDataFiles/tree/7ca64f271c2022f4a022424c9d5173dbe6b68ce2','transform':'Filter US rows from custom/sov_bonds_erHedgedUSD_nominal_total.csv. Returns reconstructed from yields; not a traded fund.','rights':'CC0-1.0, repository declaration'},
 {'name':'BLS CPI-U all items, via ReturnDataFiles','url':'https://github.com/birjusuketupatel/ReturnDataFiles/blob/7ca64f271c2022f4a022424c9d5173dbe6b68ce2/other/US_CPI.csv','transform':'Monthly nonseasonally adjusted index ratio minus one. General CPI is the proxy for living/other expenses.','rights':'US government data; ReturnDataFiles CC0 declaration'},
 {'name':'BLS college tuition and fees CPI, CUUR0000SEEB01','url':'https://data.bls.gov/timeseries/CUUR0000SEEB01','transform':'Monthly nonseasonally adjusted index ratio minus one, retrieved through BLS public API in 10-year batches. National proxy includes some financial-aid adjustments.','rights':'US government data; attribution retained'}
 ],
 'rawHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.iterdir()) if p.is_file() and p.name!='bonds.csv'},
 'notes':['All five risk factors are aligned on the same observed month. No missing months are filled or fabricated.','1978–2024 is the common complete window; deliberately excludes the 2025 CPI data gap and partial recent years.','Bond returns are a reconstructed 10-year Treasury proxy and monthly-average yields can smooth movements.','Tuition CPI is a national price-change proxy, not a school quote or grant forecast. Housing and other costs use general CPI.','Dataset is a research snapshot, not a forecast. Original source data is not relicensed as MIT.']
}
canonical='\n'.join(row[0]+','+','.join(f'{(0 if v==0 else v):.10f}' for v in row[1:]) for row in rows);manifest['observationsSha256']=hashlib.sha256(canonical.encode()).hexdigest()
manifest['observations']=rows
out=ROOT/'site'/'data'/'history.json';out.write_text(json.dumps(manifest,separators=(',',':'))+'\n')
(ROOT/'data'/'manifest.json').write_text(json.dumps({k:v for k,v in manifest.items() if k!='observations'},indent=2)+'\n')
print(json.dumps({'months':len(rows),'start':rows[0][0],'end':rows[-1][0],'sha256':manifest['observationsSha256'],'bytes':out.stat().st_size}))
