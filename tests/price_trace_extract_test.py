import importlib.util,io,json,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
SPEC=importlib.util.spec_from_file_location('extractor',Path(__file__).resolve().parents[1]/'scripts/extract_price_trace_sources.py')
m=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(m)
class Extraction(unittest.TestCase):
 def test_year_mapping(self):
  self.assertEqual(m.academic_year('Fees 1999-2000'),1999)
  self.assertEqual(m.academic_year('Fees 2007-08'),2007)
  self.assertIsNone(m.academic_year('Fees 2007-09'))
  self.assertIsNone(m.academic_year('Fees 2007-08 and 2008-09'))
 def test_html_uses_actual_definition_not_field_suffix(self):
  text='XCHG2AY1-Imputation field for CHG2AY1-1-Fees 1999-2000<table><td>R</td><td>Reported</td><td>C</td><td>Analyst corrected reported value</td></table><hr>CHG2AY1-1-Fees 1999-2000<br>Full academic year charges<!-- BEGIN CLASS'
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'dictionary.zip'
   with zipfile.ZipFile(p,'w') as z:z.writestr('IC2010.html',text)
   fields=m.dictionary_fields(p,'IC2010.html');self.assertEqual(fields['CHG2AY1']['academicYear'],1999);self.assertEqual(fields['CHG2AY1']['codes']['R'],'Reported')
 def test_changed_bytes_never_overwrite_a_pinned_original(self):
  with tempfile.TemporaryDirectory() as d,patch.object(m,'CACHE',Path(d)),patch.object(m,'ROOT',Path(d)):
   source={'file':'source.zip','sha256':'0'*64,'url':'https://example.org/synthetic-unit-test'}
   with patch.object(m.urllib.request,'urlopen',return_value=io.BytesIO(b'new revision')):
    result=m.get_archive(source,True)
   self.assertFalse(result['matchesPinned']);self.assertFalse((Path(d)/'source.zip').exists());self.assertEqual((Path(d)/result['path']).read_bytes(),b'new revision')
if __name__=='__main__':unittest.main()
