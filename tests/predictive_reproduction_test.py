import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from validate_predictive_depth import compare,specifications,summary

class ReproductionTests(unittest.TestCase):
    def test_exact_status_shape_and_numeric_contracts(self):
        a={'parameters':[.02,.03],'objective':-100.,'status':'converged','starts':[{'iterations':120}]}
        b=copy.deepcopy(a);b['parameters'][0]+=1e-9;b['starts'][0]['iterations']=121;compare(a,b)
        for field,value in [('status','nonconverged'),('parameters',[.02]),('objective',-100.1)]:
            b=copy.deepcopy(a);b[field]=value
            with self.assertRaises((ValueError,AssertionError)):compare(a,b)
        b=copy.deepcopy(a);b['parameters'][0]=float('nan')
        with self.assertRaises(ValueError):compare(a,b)
    def test_fixed_grid_has_all_worlds_and_school_year_controls(self):
        specs=specifications();self.assertEqual(len(specs),200);self.assertEqual(len(set(specs)),200)
        self.assertEqual(len({s[0] for s in specs}),24)
        for t in [3,7,12]:
            for n in [8,32]:self.assertEqual(sum(x[1:]==(t,n,'ideal') for x in specs),24)
        for t in [24,48]:self.assertEqual(sum(x[1:]==(t,8,'ideal') for x in specs),8)
    def test_missing_fits_cannot_supply_coverage(self):
        g=summary([{'transitions':3,'schools':8,'scenario':'ideal','predictions':{'reml':{'status':'nonconverged'}},'fits':{}}])[0]
        self.assertEqual(g['availableWorlds'],0)
        for row in g['rows']:self.assertEqual(row['worlds'],0);self.assertIsNone(row['billCoverage80']);self.assertIsNone(row['coverageWilson95'])

if __name__=='__main__':unittest.main()
