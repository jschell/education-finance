"""Narrow, source-specific full-dictionary review; no price fitting."""
import argparse,hashlib,io,json,re,zipfile,gzip
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/research/evaluation-metadata-review.json'
def sha(b):return hashlib.sha256(b).hexdigest()
def normalized(text):
    text=re.sub(r'\b(?:19|20)\d{2}\s*[-–]\s*\d{2,4}\b','ACADEMIC_YEAR',str(text))
    text=re.sub(r'These data are published at the IPEDS (?:COOL \(College Opportunities On-Line\)|College Navigator) Web site\.?','',text,flags=re.I)
    return re.sub(r'\s+',' ',text).strip()
def generate():
    manifest=json.loads((ROOT/'data/research/ipeds-price-snapshots/manifest.json').read_text());snapshots={s['year']:s for s in manifest['snapshots']};descriptions={}
    for y in [2006,2007]:
        d=snapshots[y]['dictionary'];raw=(ROOT/d['path']).read_bytes()
        if sha(raw)!=d['sha256']:raise ValueError('Dictionary bytes differ')
        with zipfile.ZipFile(io.BytesIO(raw)) as z:w=openpyxl.load_workbook(io.BytesIO(z.read(d['member'])),read_only=True,data_only=True)
        rows=list(next(s for s in w if s.title.lower()=='description').values);descriptions[y]={str(r[1]).strip().upper():str(r[2]) for r in rows if len(r)>2}
    entries=[]
    for prefix in ['CHG2AY','CHG3AY','CHG5AY']:
        for target in [prefix+'2',prefix+'3']:
            field=prefix+'3';a=snapshots[2006]['fields'][field];b=snapshots[2007]['fields'][target];left=descriptions[2006][field];right=descriptions[2007][target]
            same=normalized(left)==normalized(right) and normalized(a['title'])==normalized(b['title']) and a['codes']==b['codes'] and all(a[k]==b[k] for k in ['component','residency','living','basis'])
            if 'full-time, first-time' not in normalized(left).lower():same=False
            entries.append({'id':f'2006:{field}:2007:{target}','type':'definition-only','decision':'unresolved','definitionConceptDecision':'approved' if same else 'unresolved','populationContinuity':'unsupported','bridgeApproved':False,'fromCollection':2006,'toCollection':2007,'fromField':field,'toField':target,'fromAcademicYear':a['academicYear'],'toAcademicYear':b['academicYear'],'fromSignature':a['semanticSignature'],'toSignature':b['semanticSignature'],'fromDictionary':snapshots[2006]['dictionary'],'toDictionary':snapshots[2007]['dictionary'],'fromFullText':left,'toFullText':right,'fromFullTextSha256':sha(left.encode()),'toFullTextSha256':sha(right.encode()),'normalizedFullTextSha256':sha(normalized(left).encode()),'flagVocabularyEqual':a['codes']==b['codes'],'cohortDefinitionEqual':same,'basisReview':'Published-charge concept and specified full-time first-time cohort match in full dictionary text; no claim of unchanged institution-specific campus aggregation.','independentInstrumentEvidence':{'url':'https://nces.ed.gov/ipeds/use-the-data/download-survey-material/2007/institutional%20characteristics/ic_2007.pdf','review':'NCES Part D instrument independently requests published tuition by residency and campus living costs for the specified first-time cohort, including 2006–07 and 2007–08.','captureKind':'reviewed official indexed instrument text; raw PDF bytes not pinned','originalVintageVerified':False},'rationale':'Full definitions match after removal of academic-year tokens and the explicitly identified website-publication sentence; all other economic/cohort/flag metadata agree. Exact directory labels do not independently establish reporting-population continuity. This definition lead authorizes no graph bridge.'})
    leads=json.loads((ROOT/'data/calibration-diagnostics/metadata-lead-review.json').read_text())
    ids=sorted(set(e['unitid'] for e in leads['caseOrSpacingExamples'] if e['year']==2004));directories={}
    for y in [2004,2005]:
        meta=snapshots[y];raw=(ROOT/meta['shard']).read_bytes()
        if sha(raw)!=meta['shardSha256']:raise ValueError('Directory shard differs')
        shard=json.loads(gzip.decompress(raw));directories[y]={row[shard['directoryColumns'].index('unitid')]:dict(zip(shard['directoryColumns'],row)) for row in shard['directories']}
    name_reviews=[]
    for unitid in ids:
        a=directories[2004][unitid];b=directories[2005][unitid]
        if re.sub(r'\s+',' ',a['name']).strip().upper()!=re.sub(r'\s+',' ',b['name']).strip().upper():raise ValueError('Lead was not case/spacing only')
        name_reviews.append({'unitid':unitid,'decision':'unresolved','from':a,'to':b,'fromDirectorySource':snapshots[2004]['sources']['directory'],'toDirectorySource':snapshots[2005]['sources']['directory'],'fromShardSha256':snapshots[2004]['shardSha256'],'toShardSha256':snapshots[2005]['shardSha256'],'reason':'Pinned directory records establish a case/spacing representation change. They do not independently certify unchanged campus aggregation or reporting population; no bridge is authorized.'})
    body={'id':'evaluation-metadata-review-v1','panelHash':manifest['sha256'],'sourceHashes':{p:sha((ROOT/p).read_bytes()) for p in ['scripts/review_evaluation_metadata.py','docs/complete-cost-evaluation-protocol.md','data/research/ipeds-price-snapshots/manifest.json','data/calibration-diagnostics/metadata-lead-review.json','data/research/ipeds-price-snapshots/2004.json.gz','data/research/ipeds-price-snapshots/2005.json.gz']},'entries':entries,'nameReview':{'years':[2004,2005],'institutionReviews':name_reviews,'decision':'unresolved','rationale':'Case/spacing-only names and stable identifiers identify representation leads, but no institution-specific reporting-population continuity evidence has been established. No name bridge is approved.','guidance':'https://nces.ed.gov/ipeds/use-the-data/institutional-groupings-in-ipeds'},'strictVintage':{'state':'unsupported','reason':'Retrieved files and current instrument copies are not verified original publication vintages.'},'historicalFits':0,'productionActivated':False}
    body['sha256']=sha(json.dumps(body,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode());return body
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args();r=generate();out=json.dumps(r,indent=2,ensure_ascii=False)+'\n'
    if args.verify:
        if OUT.read_text()!=out:raise ValueError('Metadata review differs')
    else:
        if OUT.exists():raise ValueError('Do not overwrite a prior review')
        OUT.write_text(out)
    print(json.dumps({'approvedDefinitionConceptPairs':sum(e['definitionConceptDecision']=='approved' for e in r['entries']),'unresolvedBridgePairs':sum(e['decision']!='approved' for e in r['entries']),'approvedNames':0,'strictVintage':'unsupported'}))
