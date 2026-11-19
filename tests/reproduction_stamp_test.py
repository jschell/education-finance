import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('stamp',Path(__file__).resolve().parents[1]/'scripts/reproduction-stamp.py');stamp=importlib.util.module_from_spec(spec);spec.loader.exec_module(stamp)
class StampTests(unittest.TestCase):
    def invoke(self,*args):
        with patch.object(sys,'argv',['reproduction-stamp.py','estimator',*args]):stamp.main()
    def test_missing_corrupt_or_changed_inputs_cannot_restore_success(self):
        with tempfile.TemporaryDirectory() as tmp,patch.object(stamp,'ROOT',Path(tmp)),patch.object(stamp,'payload',return_value={'source':'a','toolchain':'v1'}) as payload:
            with self.assertRaises(ValueError):self.invoke('--check')
            self.invoke('--write');self.invoke('--check');payload.return_value={'source':'b','toolchain':'v1'}
            with self.assertRaises(ValueError):self.invoke('--check')
            self.invoke('--write');self.invoke('--check');payload.return_value={'source':'b','toolchain':'v2'}
            with self.assertRaises(ValueError):self.invoke('--check')
            (Path(tmp)/'.cache/reproductions/estimator/validated.json').write_text('{partial')
            with self.assertRaises(json.JSONDecodeError):self.invoke('--check')
    def test_keys_include_recursively_declared_evidence_dependencies(self):
        p=stamp.payload('estimator')
        for source in ['scripts/price-panel/views.mjs','scripts/calibration/schools.mjs','data/research/ipeds-price-snapshots/manifest.json','docs/revision-estimator-numerical-amendment.md']:
            self.assertIn(source,p['sources'])
        self.assertIn('numpy',p['toolchain']);self.assertIn('node',p['toolchain'])
if __name__=='__main__':unittest.main()
