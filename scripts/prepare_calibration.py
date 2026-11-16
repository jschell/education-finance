"""Rebuild the calibration bundle offline from pinned public source snapshots.

Standard-library-only XLSX/HTML extraction. Refresh raw sources deliberately;
changing a snapshot changes the bundle checksum and requires model review.
"""
from pathlib import Path
from html import unescape
import csv,gzip,hashlib,json,math,re,statistics,zipfile
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/calibration'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def xlsx_rows(path):
 with zipfile.ZipFile(path) as z:
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   shared=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
  sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'));out=[]
  for row in sheet.findall('.//m:sheetData/m:row',NS):
   vals={}
   for cell in row.findall('m:c',NS):
    pos=re.match(r'([A-Z]+)',cell.attrib['r'])[1];col=0
    for char in pos:col=col*26+ord(char)-64
    value=cell.find('m:v',NS)
    if value is None:
     inline=cell.find('m:is',NS);v=''.join(inline.itertext()) if inline is not None else None
    elif cell.get('t')=='s':v=shared[int(value.text)]
    elif cell.get('t') in ['str','e']:v=value.text
    else:
     try:v=float(value.text)
     except (TypeError,ValueError):v=value.text
    vals[col-1]=v
   out.append([vals.get(i) for i in range(max(vals,default=-1)+1)])
  return out

def number(x):return isinstance(x,(int,float)) and math.isfinite(x)
def text(x):return ' '.join(unescape(re.sub('<[^>]+>',' ',x)).split())
def dollars(x):
 value=re.sub(r'[$,\s]','',x)
 return float(value) if re.fullmatch(r'\d+(?:\.\d+)?',value) else None

def extract_prices():
 html=gzip.decompress((RAW/'nces33010-2024.html.gz').read_bytes()).decode('utf-8-sig',errors='replace')
 section=None;sectors={'public4':[],'public2':[],'private4':[]};deflators={}
 for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',html,re.S|re.I):
  cells=[text(v) for v in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',row,re.S|re.I)]
  if not cells:continue
  label=cells[0].strip()
  if label in ['All institutions','Public institutions','Private institutions','Nonprofit','For-profit']:section=label;continue
  m=re.fullmatch(r'(\d{4})[-–](\d{2}|\d{4})',label)
  if not m or len(cells)!=25:continue
  year=int(m[1]);vals=[dollars(v) for v in cells[1:]]
  if section=='All institutions':
   ratios=[a/b for a,b in zip(vals[:12],vals[12:]) if a and b];deflators[year]=statistics.median(ratios)
  for key,level,owner in [('public4',1,'Public institutions'),('public2',2,'Public institutions'),('private4',1,'Nonprofit')]:
   if section!=owner or year<1986:continue
   tuition=vals[3+level];room=vals[6+level];board=vals[9+level]
   if tuition and room and board:sectors[key].append({'year':year,'tuition':tuition,'housing':room+board})
 for key,rows in sectors.items():
  for r in rows:r['deflator']=deflators[r['year']]
  assert all(b['year']==a['year']+1 for a,b in zip(rows,rows[1:])),key
 assert sectors['public4'][-1]['tuition']==9872
 assert sectors['private4'][-1]['tuition']==39408
 assert sectors['public4'][-1]['housing']==13304
 return sectors

def quantile(values,p):
 values=sorted(values);at=(len(values)-1)*p;i=int(at);w=at-i
 return values[i] if i==len(values)-1 else values[i]*(1-w)+values[i+1]*w

def macro_data():
 rates={}
 for name in ['STOCK10','BOND10','BILL10']:
  rates[name]={(int(r[0]),int(r[1])):r[2]/100 for r in xlsx_rows(RAW/f'Median_{name}_Level.xlsx')[1:] if len(r)>=3 and all(number(v) for v in r[:3])}
 rates['CPI10']={(int(r[0]),int(r[1])):r[4]/100 for r in xlsx_rows(RAW/'spf-inflation.xlsx')[1:] if len(r)>=5 and number(r[0]) and number(r[1]) and number(r[4])}
 common=max(set.intersection(*(set(v) for v in rates.values())))
 spread={}
 for name in rates:
  row=next(r for r in xlsx_rows(RAW/f'Dispersion_{name}.xlsx') if r and r[0]==f'{common[0]}Q{common[1]}')
  assert number(row[1]) and number(row[2]);spread[name]=[row[1]/100,rates[name][common],row[2]/100]
 cross=json.loads((RAW/'equity-crosscheck.json').read_text());low_stock=min(spread['STOCK10'][0],cross['nominalAnnualizedRange'][0])
 cases=[
  {'id':'cautious','name':'Lower returns / higher costs','anchors':dict(zip(['stocks','bonds','cash','inflation'],[low_stock,spread['BOND10'][0],spread['BILL10'][0],spread['CPI10'][2]])),'costShift':1},
  {'id':'central','name':'Central assumptions','anchors':{k:spread[n][1] for k,n in [('stocks','STOCK10'),('bonds','BOND10'),('cash','BILL10'),('inflation','CPI10')]},'costShift':0},
  {'id':'favorable','name':'Higher returns / lower costs','anchors':{k:spread[n][2 if k!='inflation' else 0] for k,n in [('stocks','STOCK10'),('bonds','BOND10'),('cash','BILL10'),('inflation','CPI10')]},'costShift':-1}]
 return {'commonVintage':f'{common[0]}Q{common[1]}','horizonYears':10,'surveyQuartiles':spread,'equityCrosscheck':cross,'cases':cases,'interpretation':'Named assumption cases, not probability-weighted scenarios. Survey quartiles measure forecaster disagreement, not predictive coverage. BOND10 is expected Treasury yield used as a provisional return anchor, not a measured fund-return forecast.'}

prices=extract_prices();history=json.loads((ROOT/'site/data/history.json').read_text());monthly={r[0]:r[1:4] for r in history['observations']}
changes={}
for key,rows in prices.items():
 changes[key]={b['year']:{'tuition':b['tuition']/a['tuition'],'housing':b['housing']/a['housing'],'inflation':b['deflator']/a['deflator']} for a,b in zip(rows,rows[1:])}
common=sorted(set.intersection(*(set(v) for v in changes.values())))
annual=[]
for year in common:
 months=[f'{year+(m+8)//12:04}-{(m+8)%12+1:02}' for m in range(12)]
 if any(m not in monthly for m in months):continue
 assert len({round(changes[k][year]['inflation'],8) for k in changes})==1
 annual.append({'year':year,'months':[monthly[m] for m in months],'inflation':changes['public4'][year]['inflation'],'sectors':{k:{name:changes[k][year][name] for name in ['tuition','housing']} for k in changes}})
assert [x['year'] for x in annual]==list(range(2000,2024))
source={'name':'NCES Digest 2024 Table 330.10','url':'https://nces.ed.gov/programs/digest/d24/tables/dt24_330.10.asp','prepared':'2024-11','coverage':'Sector-average published tuition/required fees and on-campus room/board, not net prices or individual-school forecasts. Public fees use in-district charges; out-of-state growth is a proxy. Private series is nonprofit four-year.','deflator':'Academic-year CPI deflator implied by current/constant-dollar columns; median across 12 reported ratios reduces rounding noise.','breaks':['Start at 1986 to exclude earlier board-definition break.','Institution population definition changes after 1995–96; retained and disclosed.','Aggregates reflect enrollment/composition changes and later revisions, not a fixed-school panel.']}
bundle={'id':'us-sector-calibration-2026-11-16-v1','asOf':'2026-11-16','source':source,'historyDataset':history['id'],'historyHash':history['observationsSha256'],'macro':macro_data(),'prices':prices,'annual':annual,'rawHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.iterdir()) if p.is_file()},'notes':['24 common academic-year transitions, 2000–2023. Each carries 12 consecutive September–August market months. Block starts align to model years, not calendar months.','General inflation is interpolated monthly from the source academic-year deflator; it is not observed monthly CPI in this model.','Other expenses use general inflation. Off-campus/at-home housing uses CPI; on-campus housing uses published room/board growth.','Treasury returns retain the existing reconstructed nominal bond proxy; total-market stocks use S&P 500 expectations as a broad-equity proxy.','Data-calibrated assumptions and retrospective sector checks do not establish calibrated individual-family success probabilities.']}
def canonicalize(value):
 if value is None:return 'null'
 if isinstance(value,bool):return 'true' if value else 'false'
 if isinstance(value,(int,float)):return format(0 if value==0 else value,'.10f')
 if isinstance(value,str):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
 if isinstance(value,list):return '['+','.join(canonicalize(v) for v in value)+']'
 return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+canonicalize(value[k]) for k in sorted(value))+'}'
bundle['sha256']=hashlib.sha256(canonicalize(bundle).encode()).hexdigest()
(ROOT/'site/data/calibration.json').write_text(json.dumps(bundle,separators=(',',':'),ensure_ascii=False)+'\n')
(ROOT/'data/calibration-manifest.json').write_text(json.dumps({k:v for k,v in bundle.items() if k not in ['prices','annual']},indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'id':bundle['id'],'years':len(annual),'macro':bundle['macro']['commonVintage'],'anchors':[x['anchors'] for x in bundle['macro']['cases']],'priceYears':{k:[v[0]['year'],v[-1]['year']] for k,v in prices.items()},'sha256':bundle['sha256']}))
