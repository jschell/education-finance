"""Full frozen-cell rerun, normalizing JSON object keys without rounding values."""
import argparse,copy,gzip,json,time
from concurrent.futures import ProcessPoolExecutor,as_completed
from validate_predictive_depth import OUT,validate,identities,specifications,run_cell,summary,compare

def portable_verify(actual,expected):
    # JSON object keys have string representation on disk, including fixed index 2.
    # Strict round trips also reject nonstandard NaN/infinite numeric values.
    a=json.loads(json.dumps(actual,allow_nan=False));e=json.loads(json.dumps(expected,allow_nan=False))
    a.pop('generatingToolchain',None);e.pop('generatingToolchain',None)
    compare(a,e)


def generate(expected,workers):
    specs=specifications();cells={};start=time.monotonic()
    with ProcessPoolExecutor(max_workers=workers) as pool:
        tasks={pool.submit(run_cell,spec):i for i,spec in enumerate(specs)}
        for future in as_completed(tasks):
            index=tasks[future];cells[index]=future.result()
            if len(cells)%10==0:print(json.dumps({'completed':len(cells),'total':len(specs),'seconds':round(time.monotonic()-start,1)}),flush=True)
    ordered=[cells[i] for i in range(len(specs))]
    # Descriptive header text is unchanged. All scientific data/support are recreated.
    report=copy.deepcopy(expected);report.update(sourceHashes=identities(),cells=ordered,summary=summary(ordered),worldCount=len(specs),independentFreshSeeds=24,bootstrapRefits=16,draws=256,historicalFits=0,productionActivated=False)
    if report['id']!='predictive-depth-study-v1':raise ValueError('Unexpected study identity')
    return validate(report)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--workers',type=int,default=4);args=parser.parse_args()
    if not 1<=args.workers<=8:raise ValueError('Workers outside 1–8')
    expected=validate(json.loads(gzip.decompress(OUT.read_bytes())))
    actual=generate(expected,args.workers);portable_verify(actual,expected)
    print('Full predictive numerical reproduction passed (strict JSON key normalization; all 200 cells refitted).')

if __name__=='__main__':main()
