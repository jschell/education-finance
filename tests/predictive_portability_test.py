import copy,json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from verify_predictive_reproduction import portable_verify
class PortableTests(unittest.TestCase):
    def test_exact_fixed_parameter_json_round_trip(self):
        actual={'sourceHashes':{'generator':'abc'},'fits':[{'fixedCoordinates':{2:0.},'parameters':[.02,.03],'status':'converged','objective':-100.}],'covered':True}
        stored=json.loads(json.dumps(actual));portable_verify(actual,stored)
        for key,value in [('fixedCoordinates',{'2':.1}),('fixedCoordinates',{'5':0.}),('status','nonconverged'),('parameters',[.01,.03])]:
            bad=copy.deepcopy(stored);bad['fits'][0][key]=value
            with self.assertRaises((ValueError,AssertionError)):portable_verify(actual,bad)
    def test_metadata_outcomes_missing_cells_and_sources_stay_exact(self):
        actual={'sourceHashes':{'generator':'abc'},'cells':[{'seed':100,'covered':True,'availableWorlds':24}]}
        for field,value in [('seed',101),('covered',False),('availableWorlds',23)]:
            bad=copy.deepcopy(actual);bad['cells'][0][field]=value
            with self.assertRaises(ValueError):portable_verify(actual,bad)
        bad=copy.deepcopy(actual);bad['cells']=[]
        with self.assertRaises(ValueError):portable_verify(actual,bad)
        bad=copy.deepcopy(actual);bad['sourceHashes']['generator']='xyz'
        with self.assertRaises(ValueError):portable_verify(actual,bad)
    def test_nonstandard_numeric_json_is_rejected(self):
        for value in [float('nan'),float('inf'),-float('inf')]:
            with self.assertRaises(ValueError):portable_verify({'drift':[value]}, {'drift':[.02]})
if __name__=='__main__':unittest.main()
