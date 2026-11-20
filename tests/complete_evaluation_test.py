import sys,unittest,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from evaluation_decision import wilson,mean_ci,summarize,gates
from run_complete_evaluation import specs,validate
from unittest.mock import patch
from revision_cost_predictive import PARAMETERS,DRIFT
class CompleteEvaluationTests(unittest.TestCase):
    def test_fixed_grid_and_world_counts(self):
        s=specs();self.assertEqual(len(s),320);self.assertEqual(len(set(s)),320)
        for t in [3,7,12]:self.assertEqual(sum(x[1:]==(t,8,'ideal') for x in s),64);self.assertEqual(sum(x[1:]==(t,32,'ideal') for x in s),24)
    def test_missing_forecasts_cannot_supply_coverage(self):
        cells=[]
        for t in [3,7,12]:
            cells.append({'transitions':t,'schools':8,'scenario':'ideal','fits':{'candidate':{'status':'unavailable'}},'predictions':{'candidate-bootstrap':{'status':'unavailable'}}})
        ss=summarize(cells);r=gates(cells,ss,{'passed':False},{'state':'unsupported'})
        self.assertEqual(r['syntheticDecision'],'reject');self.assertEqual(r['historicalEvaluation'],'unsupported');self.assertFalse(r['productionActivation'])
        for row in ss:
            self.assertEqual(row['availableWorlds'],0)
            for x in row['rows']:self.assertIsNone(x['coverage80']);self.assertEqual(x['finiteTruthDepositWorlds'],0)
    def test_binomial_and_paired_uncertainty(self):
        lo,hi=wilson(.5,64);self.assertLess(lo,.5);self.assertGreater(hi,.5);self.assertLess(hi,.7)
        self.assertIsNone(wilson(0,0));self.assertIsNone(mean_ci([])['normal95'])
        x=mean_ci([-1,0,1]);self.assertEqual(x['n'],3);self.assertEqual(x['mean'],0);self.assertLess(x['normal95'][0],0);self.assertGreater(x['normal95'][1],0)
    def passing_cells(self):
        cells=[]
        for t in [3,7,12]:
            for i in range(64):
                def scores(old):return [{'bills':{'covered':i<50,'intervalScoreOverBudget':1. if old else .9,'widthOverBudget':1.},'funding':[{}, {'truthImpossible':False,'p90Impossible':False,'requiredCoverage':i<60,'brier':.2 if old else .18}],'household':{'brier':.2 if old else .19}} for _ in range(3)]
                cells.append({'transitions':t,'schools':8,'scenario':'ideal','fits':{'candidate':{'status':'qualified','parameters':PARAMETERS.tolist(),'drift':DRIFT.tolist()}},'predictions':{'candidate-bootstrap':{'status':'available','scores':scores(False)},'old-plugin':{'status':'available','scores':scores(True)}}})
        return cells
    def test_all_predeclared_gates_and_independent_historical_block(self):
        cells=self.passing_cells();ss=summarize(cells)
        d=gates(cells,ss,{'passed':True},{'state':'unsupported'})
        self.assertEqual(d['syntheticDecision'],'pass');self.assertEqual(d['historicalEvaluation'],'unsupported');self.assertFalse(d['productionActivation'])
        self.assertTrue(all(g['state']=='pass' for g in d['gates']))
        self.assertEqual(gates(cells,ss,None)['syntheticDecision'],'unsupported')
        # One failed depth must reject, even if every other coverage/score gate passes.
        cells[0]['fits']['candidate']['parameters']=[0.]*12
        for c in cells:
            if c['transitions']==3:c['fits']['candidate']['parameters']=[0.]*12
        rejected=gates(cells,summarize(cells),{'passed':True},{'state':'pass'})
        self.assertEqual(rejected['syntheticDecision'],'reject');self.assertEqual(rejected['historicalEvaluation'],'unsupported')
    def test_partial_bootstrap_and_missing_slots_rejected(self):
        import run_complete_evaluation as runner
        refs=[{'index':i,'status':'qualified'} for i in range(16)];refs[4]['status']='unavailable'
        cell={'seed':1,'transitions':3,'schools':8,'scenario':'ideal','bootstrap':{'candidate':{'refits':refs,'complete':True}},'predictions':{'candidate-bootstrap':{'status':'available'}}}
        report={'sourceHashes':{},'runtime':{},'cells':[cell],'summary':[],'historicalFits':0,'productionActivated':False}
        with patch.object(runner,'identities',return_value={}),patch.object(runner,'contract',return_value={}),patch.object(runner,'specs',return_value=[(1,3,8,'ideal')]):
            with self.assertRaisesRegex(ValueError,'Partial bootstrap used'):validate(report)
            cell['bootstrap']['candidate']['refits'].pop()
            with self.assertRaisesRegex(ValueError,'Incomplete slot accounting'):validate(report)
if __name__=='__main__':unittest.main()
