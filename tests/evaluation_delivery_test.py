import copy,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from evaluation_optimizer import fit
from evaluation_reproduction_stamp import check_marker
from evaluation_decision import summarize
from evaluate_retained_optimizer import compare_backends
class DeliveryTests(unittest.TestCase):
    def test_historical_graph_never_reaches_optimizer(self):
        for graph in [{},{'kind':'historical'},{'kind':'collection-proxy'}]:
            with self.assertRaisesRegex(ValueError,'Historical fitting blocked'):fit(graph)
    def test_impossible_recommendation_cannot_pass_feasible_coverage(self):
        scores=[{'bills':{'covered':True,'intervalScoreOverBudget':1.,'widthOverBudget':1.},'funding':[{}, {'truthImpossible':False,'p90Impossible':True,'requiredCoverage':True,'brier':0.}], 'household':{'brier':0.}} for _ in range(3)]
        r=summarize([{'transitions':3,'schools':8,'scenario':'ideal','predictions':{'candidate-bootstrap':{'status':'available','scores':scores}}}])[0]
        for row in r['rows']:self.assertEqual(row['finiteDepositCoverage90'],0.);self.assertEqual(row['finiteRecommendedDepositWorlds'],0)
    def test_changed_source_or_partition_rejects_completion_marker(self):
        m={'key':'one','inputs':{'partition':'0','sources':{'script':'original'}}};check_marker(m,copy.deepcopy(m))
        for changed in [{'key':'one','inputs':{'partition':'1','sources':{'script':'original'}}},{'key':'one','inputs':{'partition':'0','sources':{'script':'changed'}}},{}]:
            with self.assertRaises(ValueError):check_marker(m,changed)
    def test_portability_never_hides_missing_or_different_cases(self):
        case={'graphSha256':'same','outerSeed':1,'transitions':3,'index':0,'refitSeed':2,'fit':{'status':'unavailable','parameters':None}}
        a={'cases':[copy.deepcopy(case) for _ in range(185)]};b=copy.deepcopy(a)
        # Output file hashes are read by comparison only after identity validation.
        b['cases'][1]['graphSha256']='different'
        with self.assertRaisesRegex(ValueError,'Graphs/cases'):compare_backends(a,b)
if __name__=='__main__':unittest.main()
