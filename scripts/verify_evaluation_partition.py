"""Independently refit one disjoint CI partition; all eight cover the full grid."""
import argparse,gzip,json
from concurrent.futures import ProcessPoolExecutor,as_completed
from run_complete_evaluation import OUT,validate,specs,run_cell,compare

def main():
    p=argparse.ArgumentParser();p.add_argument('--partition',type=int,required=True);p.add_argument('--workers',type=int,default=2);args=p.parse_args()
    if not 0<=args.partition<8 or not 1<=args.workers<=8:raise ValueError('Invalid partition/workers')
    expected=validate(json.loads(gzip.decompress(OUT.read_bytes())));ss=specs();indices=list(range(args.partition,len(ss),8))
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        tasks={pool.submit(run_cell,ss[i]):i for i in indices}
        for f in as_completed(tasks):
            i=tasks[f];actual=json.loads(json.dumps(f.result()));compare(actual,expected['cells'][i],f'cell[{i}]');print(f'Reproduced cell {i}: {ss[i]}',flush=True)
    print(f'Partition {args.partition}: all {len(indices)} independent cells reproduced.')
if __name__=='__main__':main()
