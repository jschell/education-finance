"""Offline rates/state bundle from original FRED tables and pinned market data."""
from pathlib import Path
import gzip,hashlib,json,math,re
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/economy'

def fred(name):
    s=gzip.decompress((RAW/(name+'.html.gz')).read_bytes()).decode()
    values={}
    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',s,re.S|re.I):
        cells=[re.sub('<[^>]+>','',c).strip() for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>',row,re.S|re.I)]
        if len(cells)==2 and re.fullmatch(r'\d{4}-\d{2}-\d{2}',cells[0]):
            try:values[cells[0][:7]]=float(cells[1])/100
            except ValueError:pass
    # FRED renders table rows beyond the first 1,000 as date|value text.
    for date,value in re.findall(r'#(\d{4}-\d{2}-\d{2})\|\s*([\d.]+)',s):values[date[:7]]=float(value)/100
    return values

def canonical(v):
    if v is None:return 'null'
    if isinstance(v,bool):return 'true' if v else 'false'
    if isinstance(v,(int,float)):return format(0 if v==0 else v,'.10f')
    if isinstance(v,str):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
    if isinstance(v,list):return '['+','.join(canonical(x) for x in v)+']'
    return '{'+','.join(json.dumps(k,ensure_ascii=False)+':'+canonical(v[k]) for k in sorted(v))+'}'

def build():
    long,short=fred('GS5'),fred('TB3MS')
    common=sorted(set(long)&set(short));latest=common[-1]
    if latest<'2024-12':raise ValueError('Rate table extraction lost recent rows')
    history=json.loads((ROOT/'site/data/history.json').read_text());monthly={r[0]:r[1:] for r in history['observations']}
    old=json.loads((ROOT/'site/data/calibration.json').read_text());panel=json.loads((ROOT/'site/data/calibration-panel.json').read_text())
    academic={r['year']:r['inflation'] for r in old['annual']}
    def levels(year):
        dates=[f'{year+(m+8)//12:04}-{(m+8)%12+1:02}' for m in range(12)]
        previous=f'{year}-08'
        rates=[]
        for date in dates:
            if date not in monthly or date not in long or date not in short or previous not in long or previous not in short:return None
            rates.append([long[previous],long[date],short[previous],short[date]]);previous=date
        return dates,rates
    validation=[]
    for year in range(1979,2024):
        current=levels(year);prior=levels(year-1)
        if current is None or prior is None:continue
        dates,rates=current
        inflation=math.prod(1+monthly[d][3] for d in dates)
        previous=math.prod(1+monthly[d][3] for d in prior[0])
        months=[monthly[d][:3] for d in dates]
        validation.append({'year':year,'months':months,'rates':rates,'inflation':inflation,'previousInflation':math.log(previous),'stockLog':sum(math.log1p(m[0]) for m in months)})
    production=[]
    for row in panel['annual']:
        dates,rates=levels(row['year'])
        production.append({**row,'rates':rates,'previousInflation':math.log(academic[row['year']-1]),'stockLog':sum(math.log1p(m[0]) for m in row['months'])})
    body={'id':'us-economic-state-2026-11-16-v1','asOf':'2026-11-16','historyHash':history['observationsSha256'],'panelHash':panel['panel']['hash'],'rateDate':latest,'initial':{'long':long[latest],'short':short[latest]},'productionYears':production,'validationYears':validation,'sources':[{'name':'Federal Reserve H.15 via FRED GS5','url':'https://fred.stlouisfed.org/data/GS5','units':'Annual investment-basis yield, decimal fraction; monthly average'},{'name':'Federal Reserve H.15 via FRED TB3MS','url':'https://fred.stlouisfed.org/data/TB3MS','units':'Annual bank-discount quote, decimal fraction; monthly average'}],'parameters':{'maturityYears':5,'billDays':91,'persistenceCap':.995,'rateBounds':[0,.25],'inflationGrossBounds':[.8,1.3],'conditioningFloor':.25,'expectationWindowYears':10},'rawHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.glob('*.html.gz'))},'limitations':['Treasury exposure is a hypothetical monthly-rolled five-year instrument with semiannual coupons and monthly-average yields, not an actual fund return.','Cash accrues at the start-of-month bill quote; the 91-day/365-day equivalent is a reinvestment approximation.','State-conditioned blocks change source-year weights, not a structural causal model. Parameter bounds are explicit numerical model limits, not predictive guarantees.','Persistent expectation dispersion comes from overlapping ten-year windows; no independent probability calibration follows.']}
    body['sha256']=hashlib.sha256(canonical(body).encode()).hexdigest()
    (ROOT/'site/data/economy.json').write_text(json.dumps(body,separators=(',',':'))+'\n')
    (ROOT/'data/economy-manifest.json').write_text(json.dumps({k:v for k,v in body.items() if k not in ['productionYears','validationYears']},indent=2)+'\n')
    print(json.dumps({'rateDate':latest,'initial':body['initial'],'productionYears':len(production),'validationYears':len(validation),'hash':body['sha256']}))
if __name__=='__main__':build()
