"""Full macro history, independent of tuition-series overlap; offline pinned inputs."""
from pathlib import Path
import csv,hashlib,json,math
from prepare_economy import fred,canonical
ROOT=Path(__file__).resolve().parents[1]
long,short=fred('GS5'),fred('TB3MS')
stock={r['month'][:4]+'-'+r['month'][4:6]:float(r['mktrf'])+float(r['rf']) for r in csv.DictReader((ROOT/'data/raw/french.csv').open())}
cpi={}
for r in csv.DictReader((ROOT/'data/raw/cpi.csv').open()):
    m,_,y=r['date'].split('/')
    if r['CPI']:cpi[f'{int(y):04}-{int(m):02}']=float(r['CPI'])
def months(year):return [f'{year+(m+8)//12:04}-{(m+8)%12+1:02}' for m in range(12)]
def previous(date):
    y,m=map(int,date.split('-'));return f'{y-1}-12' if m==1 else f'{y}-{m-1:02}'
def inflation(year):return math.prod(cpi[d]/cpi[previous(d)] for d in months(year))
years=[]
for year in range(1954,2024):
    dates=months(year);rates=[]
    for d in dates:
        prev=previous(d)
        if any(d not in source or prev not in source for source in [long,short]):raise ValueError('Missing rate '+d)
        rates.append([long[prev],long[d],short[prev],short[d]])
    returns=[[stock[d],0,0] for d in dates]
    years.append({'year':year,'months':returns,'rates':rates,'inflation':inflation(year),'previousInflation':math.log(inflation(year-1)),'stockLog':sum(math.log1p(m[0]) for m in returns)})
old=json.loads((ROOT/'site/data/economy.json').read_text())
body={**old,'id':'us-broad-macro-1954-2023-v1','macroYears':years,'fitting':{'regularized':True,'nonoverlapping':True},'trainingSpan':[1954,2023],'costSpan':[2000,2023],'additionalRawHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'data/raw/french.csv',ROOT/'data/raw/cpi.csv']}}
body['parameters']={**old['parameters'],'regularizationPriors':{'annualInflation':{'phi':.5,'observations':10},'monthlyYields':{'phi':.95,'observations':120}},'expectationWindowOverlap':False}
body['limitations']=[x for x in old['limitations'] if 'overlapping ten-year' not in x]+['Expectation variation uses seven disjoint ten-year blocks; disjoint periods are not guaranteed independent economic regimes.']
del body['sha256'];body['sha256']=hashlib.sha256(canonical(body).encode()).hexdigest()
(ROOT/'site/data/economy-broad.json').write_text(json.dumps(body,separators=(',',':'))+'\n')
print(json.dumps({'years':len(years),'span':body['trainingSpan'],'hash':body['sha256']}))
