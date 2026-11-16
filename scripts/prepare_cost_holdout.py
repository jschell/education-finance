"""New 2024–25 price check, holding old institution membership fixed."""
from pathlib import Path
import gzip,hashlib,json,math,statistics
from prepare_ipeds import read_archive,positive
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/economy'
panel=json.loads((ROOT/'site/data/ipeds-panel.json').read_text())
records=json.loads(gzip.decompress((ROOT/'data/ipeds-institutions.json.gz').read_bytes()))
# The raw subset includes separate component panels, including institutions without housing.
import csv,io
old={}
for r in csv.DictReader(io.StringIO(gzip.decompress((ROOT/'data/raw/ipeds/selected.csv.gz').read_bytes()).decode())):
    old[(int(r['YEAR']),int(r['UNITID']))]=r
prices={int(r['UNITID']):r for r in read_archive(RAW/'COST1_2024.zip')[0]}
directory={int(r['UNITID']):r for r in read_archive(RAW/'HD2024.zip')[0]}
series={}
for name,meta in [('public4',('1','CHG2AY3')),('public4out',('1','CHG3AY3')),('public2',('4','CHG2AY3')),('public2out',('4','CHG3AY3')),('private4',('2','CHG2AY3'))]:
    sector,tuition=meta;groups={};counts={}
    for key,field in [('tuition',tuition),('housing','CHG5AY3')]:
        original=panel['panels'][name][key]
        eligible=[u for u in original if directory.get(u,{}).get('SECTOR')==sector and positive(prices.get(u,{}).get(field)) is not None]
        groups[key]=(field,eligible);counts[key]={'original':len(original),'eligible':len(eligible),'excludedMissingOrChanged':len(original)-len(eligible)}
    training=[]
    for year in range(2000,2024):
        level={key:math.exp(statistics.mean(math.log(float(old[(year,u)][field])) for u in ids)) for key,(field,ids) in groups.items()}
        training.append({'year':year,**level,'deflator':panel['prices'][name][year-2000]['deflator']})
    actual={key:math.exp(statistics.mean(math.log(float(prices[u][field])) for u in ids)) for key,(field,ids) in groups.items()}
    series[name]={'training':training,'actual':actual,'counts':counts}
body={'id':'ipeds-final-2024-check-v1','asOf':'2026-11-16','targetYear':2024,'panelHash':panel['sha256'],'series':series,'sources':[{'url':'https://nces.ed.gov/ipeds/complete-data-files/COST1_2024.zip','member':'cost1_2024.csv','sha256':hashlib.sha256((RAW/'COST1_2024.zip').read_bytes()).hexdigest()},{'url':'https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip','sha256':hashlib.sha256((RAW/'HD2024.zip').read_bytes()).hexdigest()},{'url':'https://nces.ed.gov/ipeds/complete-data-files/COST1_2024_Dict.zip','sha256':hashlib.sha256((RAW/'COST1_2024_Dict.zip').read_bytes()).hexdigest()}],'limitations':['Only one new independent target-year shock. No 18-year test is feasible.','Missing/reclassified 2024 institutions are excluded; training levels are recomputed over that same remaining component membership to avoid composition jumps. No new institutions are admitted.','Current-year CHG2AY3/CHG3AY3 include required fees; CHG5AY3 is on-campus food/housing. New dictionary confirms 2024–25.','Residual corrections fitted at two/five years are held for the whole future path; extrapolation beyond five years is unvalidated.']}
(ROOT/'data/cost-holdout-2024.json').write_text(json.dumps(body,separators=(',',':'))+'\n')
print(json.dumps({k:v['counts'] for k,v in series.items()}))
