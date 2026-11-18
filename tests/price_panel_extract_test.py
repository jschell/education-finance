import importlib.util,io,json,tempfile,unittest,zipfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import build_revision_price_panel as m
class PanelExtraction(unittest.TestCase):
 def test_raw_amount_statuses_preserve_codes_and_zero(self):
  for raw,expected in [(None,(None,'missing-field')),('',(None,'blank')),('.',(None,'dot-missing-marker')),('-1',(-1,'unavailable-code')),('0',(0,'zero')),('bad',(None,'invalid-number')),('NaN',(None,'invalid-number')),('123.45',(123.45,'observed'))]:self.assertEqual(m.amount(raw),expected)
 def test_encoding_and_source_record_identity(self):
  with tempfile.TemporaryDirectory() as d:
   for content in ['\ufeffUNITID,INSTNM\n1,École\n'.encode('utf8'),'UNITID,INSTNM\n1,École\n'.encode('cp1252')]:
    p=Path(d)/'source.zip'
    with zipfile.ZipFile(p,'w') as z:z.writestr('source.csv',content)
    _,rows,encoding=m.rows({'path':str(p),'member':'source.csv'});self.assertEqual(rows[1][1]['INSTNM'],'École');self.assertEqual(rows[1][0],2)
    self.assertIn(encoding,['utf-8-sig','cp1252'])
 def test_duplicates_fail_and_compression_is_deterministic(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'source.zip'
   with zipfile.ZipFile(p,'w') as z:z.writestr('source.csv','UNITID\n1\n1\n')
   with self.assertRaises(ValueError):m.rows({'path':str(p),'member':'source.csv'})
  self.assertEqual(m.pack({'observations':[[1,2,'raw']]}),m.pack({'observations':[[1,2,'raw']]}))
if __name__=='__main__':unittest.main()
