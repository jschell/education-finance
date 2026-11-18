"""Check actual profile fits against holding all nuisance parameters fixed."""
import json,sys,unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from revision_cost_reml import StudyLikelihood
from revision_cost_trace import traced_synthetic_graph

class ProfileTests(unittest.TestCase):
    def test_reoptimized_profile_dominates_feasible_fixed_nuisance_slice(self):
        report=json.loads((ROOT/'data/calibration-diagnostics/reml-boundary-study.json').read_text());tested=0;changed=0
        for row in report['nuisanceProfiles']:
            graph,_=traced_synthetic_graph(row['seed']);likelihood=StudyLikelihood(graph,row['method'])
            selected=next(w['methods'][row['method']] for w in report['worlds'] if w['seed']==row['seed'])
            if not selected.get('parameters'):continue
            for point in row['profile']['points']:
                fit=point['fit']
                if not fit.get('parameters'):continue
                actual,_=likelihood.evaluate(np.array(fit['parameters']));self.assertAlmostEqual(actual,fit['objective'],delta=1e-6)
                baseline=np.array(selected['parameters']);baseline[2]=point['fixedValue'];sliced,_=likelihood.evaluate(baseline)
                self.assertLessEqual(fit['objective'],sliced+1e-5);tested+=1
                nuisance=[k for k in range(12) if k!=2]
                changed+=int(np.max(np.abs(np.array(fit['parameters'])[nuisance]-baseline[nuisance]))>1e-5)
        self.assertGreaterEqual(tested,4);self.assertGreater(changed,0)

if __name__=='__main__':unittest.main()
