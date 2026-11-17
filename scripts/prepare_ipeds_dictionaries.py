# /// script
# requires-python = ">=3.11"
# dependencies = ["openpyxl==3.1.5", "xlrd==2.0.2"]
# ///
"""Pin and extract official year-specific price-field and flag dictionaries.

Run uv run scripts/prepare_ipeds_dictionaries.py [--fetch]. No application dependency.
Existing archives are never refreshed implicitly; --fetch downloads absent files only.
"""
from pathlib import Path
from html import unescape
import hashlib,io,json,re,sys,urllib.request,zipfile
ROOT=Path(__file__).resolve().parents[1]
FIELDS=['CHG2AY3','CHG3AY3','CHG5AY3']
RAW=ROOT/'data/raw/ipeds/dictionaries'

def digest(b):return hashlib.sha256(b).hexdigest()
def clean(x):return re.sub(r'\s+',' ',unescape(str(x or ''))).strip()
def extract(content,member):
    if member.lower().endswith(('.html','.htm')):
        text=content.decode('cp1252');fields={}
        for field in FIELDS:
            match=re.search(r'X'+field+r'-Imputation field for '+field+r'-\d+-([^<\r\n]+)',text,re.I)
            if not match:raise ValueError('Missing field linkage: '+field)
            section=text[match.end():].split('<!-- END CLASS')[0]
            codes={code:clean(label) for code,label in re.findall(r'<td[^>]*>([A-Z])</td>\s*<td[^>]*>([^<]+)</td>',section,re.I)}
            if not {'R','C'}.issubset(codes):raise ValueError('Missing flag codes: '+field)
            fields[field]={'flag':'X'+field,'title':clean(match.group(1)),'codes':codes}
        return fields
    if member.lower().endswith('.xlsx'):
        import openpyxl
        w=openpyxl.load_workbook(io.BytesIO(content),read_only=True,data_only=True)
        sheets={s.title.lower():list(s.values) for s in w}
    elif member.lower().endswith('.xls'):
        import xlrd
        w=xlrd.open_workbook(file_contents=content)
        sheets={s.name.lower():[s.row_values(i) for i in range(s.nrows)] for s in w.sheets()}
    else:raise ValueError('Unsupported dictionary format: '+member)
    flagrows=sheets.get('imputation values',[])
    codes={clean(row[0]):clean(row[1]) for row in flagrows if len(row)>1 and re.fullmatch('[A-Z]',clean(row[0]))}
    # IC2014_AY omits the legend; build() attaches the same-year IC legend explicitly.
    fields={}
    for row in sheets['varlist'][1:]:
        if clean(row[1]).upper() in FIELDS:
            field=clean(row[1]).upper();flag=clean(row[5]).upper()
            if flag!='X'+field:raise ValueError('Unexpected flag linkage')
            fields[field]={'flag':flag,'title':clean(row[6]),'codes':codes}
    if set(fields)!=set(FIELDS):raise ValueError('Incomplete current price fields')
    return fields

def build(fetch=False):
    RAW.mkdir(parents=True,exist_ok=True);years=[]
    for year in range(2000,2024):
        path=RAW/f'IC{year}_AY_Dict.zip';url=f'https://nces.ed.gov/ipeds/datacenter/data/IC{year}_AY_Dict.zip'
        if not path.exists():
            if not fetch:raise FileNotFoundError(str(path)+'; run with --fetch')
            path.write_bytes(urllib.request.urlopen(url,timeout=30).read())
        b=path.read_bytes()
        with zipfile.ZipFile(io.BytesIO(b)) as z:
            names=[n for n in z.namelist() if n.lower().endswith(('.xls','.xlsx','.html','.htm'))]
            if len(names)!=1:raise ValueError('Ambiguous archive members')
            member=names[0];fields=extract(z.read(member),member)
        supplement=None
        if not all({'R','C'}.issubset(v['codes']) for v in fields.values()):
            if year!=2014:raise ValueError('Unclassified dictionary year '+str(year))
            sp=RAW/'IC2014_Dict.zip';su='https://nces.ed.gov/ipeds/datacenter/data/IC2014_Dict.zip'
            if not sp.exists():
                if not fetch:raise FileNotFoundError(str(sp))
                sp.write_bytes(urllib.request.urlopen(su,timeout=30).read())
            import openpyxl
            sb=sp.read_bytes()
            with zipfile.ZipFile(io.BytesIO(sb)) as sz:
                sn=sz.namelist()[0];sw=openpyxl.load_workbook(io.BytesIO(sz.read(sn)),read_only=True,data_only=True)
                rows=list(sw['Sheet1'].values)
            if clean(rows[0][0])!='Code values for item imputation variables Xvarname':raise ValueError('Unexpected supplemental legend')
            codes={clean(row[0]):clean(row[1]) for row in rows if len(row)>1 and re.fullmatch('[A-Z]',clean(row[0]))}
            if not {'R','C'}.issubset(codes):raise ValueError('Incomplete supplemental codes')
            for v in fields.values():v['codes']=codes
            supplement={'url':su,'path':str(sp.relative_to(ROOT)),'member':sn,'sheet':'Sheet1','sha256':digest(sb),'bytes':len(sb),'reason':'AY workbook omits the legend; same-year IC table explicitly defines Xvarname codes. NCES Handbook states all IPEDS components use the same imputation flags.','methodologyUrl':'https://nces.ed.gov/statprog/handbook/ipeds_surveydesign.asp'}
        years.append({'year':year,'supplement':supplement,'url':url,'path':str(path.relative_to(ROOT)),'member':member,'bytes':len(b),'sha256':digest(b),'fields':fields})
    body={'id':'ipeds-price-dictionaries-2000-2023-v1','retrieved':'2026-11-17','extractorSha256':digest(Path(__file__).read_bytes()),'years':years,
          'limitations':['These are retrieved current dictionaries for revised historical data, not original publication vintages.','Code meanings are attached separately to each field/year; unlisted values remain unclassified.']}
    (ROOT/'data/ipeds-price-dictionaries.json').write_text(json.dumps(body,sort_keys=True,indent=2)+'\n')
    print(json.dumps({'years':len(years),'archivesBytes':sum(r['bytes'] for r in years),'fields':len(FIELDS)}))
if __name__=='__main__':build('--fetch' in sys.argv)
