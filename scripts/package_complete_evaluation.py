"""Optional denser gzip packaging; decompressed scientific JSON stays byte-identical."""
import argparse,gzip,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/calibration-diagnostics/complete-cost-evaluation.json.gz';MANIFEST=ROOT/'data/calibration-diagnostics/evaluation-archive.json'
def sha(b):return hashlib.sha256(b).hexdigest()
def verify():
    r=json.loads(MANIFEST.read_text());raw=OUT.read_bytes();payload=gzip.decompress(raw)
    if r['path']!=str(OUT.relative_to(ROOT)) or sha(raw)!=r['gzipSha256'] or len(raw)!=r['gzipBytes'] or sha(payload)!=r['unchangedJsonSha256'] or len(payload)!=r['jsonBytes']:raise ValueError('Archive encoding or scientific JSON changed')
    if r['sourceHashes']!={'scripts/package_complete_evaluation.py':sha(Path(__file__).read_bytes())}:raise ValueError('Archive packaging source changed')
    print('Archive identity verified; scientific JSON bytes unchanged.')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--verify',action='store_true');args=p.parse_args()
    if args.verify:verify()
    else:
        import zopfli,zopfli.gzip
        if MANIFEST.exists():raise ValueError('Preserve existing archive record')
        original=OUT.read_bytes();payload=gzip.decompress(original);packed=zopfli.gzip.compress(payload,numiterations=5)
        if gzip.decompress(packed)!=payload or len(packed)>=12570000:raise ValueError('Packaging does not preserve JSON or fit transport limit')
        OUT.write_bytes(packed)
        MANIFEST.write_text(json.dumps({'id':'complete-evaluation-archive-v1','path':str(OUT.relative_to(ROOT)),'encoding':'gzip, Zopfli DEFLATE, five iterations','zopfliVersion':zopfli.__version__,'originalGzipSha256':sha(original),'originalGzipBytes':len(original),'unchangedJsonSha256':sha(payload),'jsonBytes':len(payload),'gzipSha256':sha(packed),'gzipBytes':len(packed),'sourceHashes':{'scripts/package_complete_evaluation.py':sha(Path(__file__).read_bytes())},'numericalResultsChanged':False},indent=2)+'\n')
        verify()
