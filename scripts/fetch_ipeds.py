"""Explicit source refresh; browser runtime never downloads IPEDS.

Downloads official annual archives into .cache/ipeds, then pins only required
original fields in a compressed CSV with archive URLs/member names/SHA-256.
Run prepare_ipeds.py and compare_cost_models.mjs after reviewing any refresh.
"""
from pathlib import Path
import csv,gzip,hashlib,io,json,urllib.request,zipfile
from prepare_ipeds import read_archive
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/ipeds'
CACHE=ROOT/'.cache/ipeds'

def extract(cache,raw):
    logs=[];output=io.StringIO();columns=['YEAR','UNITID','SECTOR','CHG2AY3','CHG3AY3','CHG5AY3','XCHG2AY3','XCHG3AY3','XCHG5AY3']
    writer=csv.DictWriter(output,fieldnames=columns,lineterminator='\n');writer.writeheader()
    for year in range(2000,2024):
        data={}
        for kind in ['prices','directory']:
            name=f'IC{year}_AY' if kind=='prices' else (f'FA{year}HD' if year<2002 else f'HD{year}')
            path=cache/(name+'.zip');url='https://nces.ed.gov/ipeds/datacenter/data/'+name+'.zip'
            if not path.exists():path.write_bytes(urllib.request.urlopen(url,timeout=60).read())
            rows,member=read_archive(path);data[kind]={int(r['UNITID']):r for r in rows}
            logs.append({'year':year,'kind':kind,'file':path.name,'url':url,'member':member,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        for unit,row in sorted(data['prices'].items()):
            directory=data['directory'].get(unit,{})
            writer.writerow({'YEAR':year,'UNITID':unit,'SECTOR':directory.get('SECTOR',''),**{k:row.get(k,'Unavailable' if k.startswith('X') else '') for k in columns[3:]}})
    selected=gzip.compress(output.getvalue().encode(),mtime=0)
    (raw/'selected.csv.gz').write_bytes(selected)
    (raw/'sources.json').write_text(json.dumps({'retrieved':'2026-11-16','extraction':'Original current-year fields only; names normalized to uppercase and whitespace stripped. Source X flags retained. Full source archives are cached locally, not published.','selectedSha256':hashlib.sha256(selected).hexdigest(),'files':logs},indent=2)+'\n')
if __name__=='__main__':
    RAW.mkdir(parents=True,exist_ok=True);CACHE.mkdir(parents=True,exist_ok=True);extract(CACHE,RAW)
