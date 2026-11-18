# /// script
# requires-python = ">=3.11"
# dependencies = ["pypdf==6.21.4"]
# ///
"""Explicitly pin bounded public institutional documents into ignored cache.

Requires pypdf only for this source-capture step, not tests/application/runtime.
The committed evidence file includes short verified excerpts and page numbers,
not entire copyrighted documents. No cause is inferred automatically.
"""
from pathlib import Path
import hashlib,io,json,re,urllib.request
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
DOCS=[
 {'id':'miami-2008-board','url':'https://miamioh.edu/_files/documents/about-miami/president/bot/minutes-archive/Minutes_02-08-08.pdf','documentDate':'2008-02-08','needle':'at the net amount of $11,443','claim':'Board ordinance O2008-2 describes the single-tuition plan adopted in 2003, resident scholarships and net resident reporting. Its 2007-08 gross amount is $23,874 and resident net maximum $11,443.','limit':'Supports a gross/net definition mechanism, not an exact reconciliation of all selected annual-file amounts.'},
 {'id':'redwoods-2004-audit','url':'https://www.redwoods.edu/services/bo/reports/audited_financial_statement/2003-04_RedwoodsCCD_AuditFS.pdf','documentDate':'2004-06-30 fiscal year end','needle':'regular enrollment fee rate of $11','claim':'The district audit documents a state increase in the per-semester-unit enrollment fee from $11 in 2002-03 to $18 in 2003-04.','limit':'Supports a real fee-policy change in the selected transition; differing full-time credit loads/other fees and the exact $288/$641 totals remain unreconciled.'},
 {'id':'nces-2006-form','url':'https://nces.ed.gov/ipeds/use-the-data/download-survey-material/2006/institutional%20characteristics/icay_2yr_form.pdf','documentDate':'2006-07 survey','needle':'update or correct any 2004-05 or 2005-06','claim':'The contemporary survey permits correction of prior-year prices in the current collection and specifies full-academic-year reporting.','limit':'Explains why retrospective revisions exist; does not identify any individual revision as the economically true amount.'},
 {'id':'commerce-cds-2013','url':'https://inside.tamuc.edu/aboutus/ier/IR/documents/common-data-set/CDS_2013-2014.pdf','documentDate':'2013-2014 cover; G1 asks for 2014-2015 costs','needle':'2014-2015 academic year costs of attendance','claim':'G1 explicitly requests 2014-2015 costs despite the 2013-2014 cover; its on-campus room/board entry is $7,150.','limit':'Rejected as confirmation of academic-year 2013 or 2012 prices merely because the amount matches a revised endpoint. Event cause remains unresolved.'},
]
def capture():
 out=[];cache=ROOT/'.cache/price-trace/evidence';cache.mkdir(parents=True,exist_ok=True)
 for d in DOCS:
  p=cache/(d['id']+'.pdf')
  if not p.exists():
   try:p.write_bytes(urllib.request.urlopen(urllib.request.Request(d['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read())
   except Exception as error:
    out.append(d|{'binaryStatus':'unavailable','binaryError':str(error),'sha256':None,'bytes':None,'pdfPages':[],
      'excerpt':d['needle'],'excerptVerification':'Read in web PDF text; local binary unavailable. Do not claim archive-byte verification.'})
    continue
  b=p.read_bytes();reader=PdfReader(io.BytesIO(b));pages=[]
  for index,page in enumerate(reader.pages,1):
   text=re.sub(r'\s+',' ',page.extract_text() or '')
   if d['needle'] in text:pages.append(index)
  if not pages:raise ValueError('Expected excerpt absent: '+d['id'])
  out.append(d|{'binaryStatus':'verified','excerptVerification':'Verified against pinned PDF bytes','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'pdfPages':pages,'excerpt':d['needle']})
 body={'id':'price-trace-primary-context-v1','retrieved':'2026-11-17','documents':out,
  'annotations':[
   {'event':'public4:tuition:204024:2003','evidence':['miami-2008-board'],'status':'partial-definition-context','interpretation':'Gross tuition with resident scholarships is documented; exact endpoint amounts remain partly unresolved.'},
   {'event':'public4:tuition:204024:2006','evidence':['miami-2008-board'],'status':'partial-definition-context','interpretation':'Net resident reporting is documented and the first later value $11,443 matches the ordinance; neither original $10,554 nor later $11,875 is automatically repaired.'},
   {'event':'public2:tuition:121707:2002','evidence':['redwoods-2004-audit'],'status':'partial-policy-context','interpretation':'A real enrollment-fee increase is documented; the entire annual change is not numerically reconciled.'},
   *[{'event':f'{s}:housing:224554:{y}','evidence':['commerce-cds-2013'],'status':'rejected-academic-year-match','interpretation':'Matching $7,150 is insufficient: the expense section explicitly labels a different academic year.'} for s in ['public4','public4out'] for y in [2012,2013]]
  ],'limitations':['Independent context and source revision are separate classifications. No event receives a fully reconciled economic-cause label.','Modern aid descriptions or another campus budget cannot establish a historical price change at the selected institution.','Binary status explicitly distinguishes locally verified PDF bytes from web-reader-only review; full retrieved documents stay in an ignored cache.']}
 (ROOT/'data/calibration-diagnostics/price-trace-context.json').write_text(json.dumps(body,sort_keys=True,indent=2)+'\n')
 print(json.dumps({d['id']:d['pdfPages'] for d in out}))
if __name__=='__main__':capture()
