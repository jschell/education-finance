# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.3.5", "scipy==1.17.0"]
# ///
"""Portable numerical trace check around the unchanged study verifier."""
import argparse,copy,json,sys
import numpy as np
from validate_reml_study import OUT,ORIGINAL,FRESH,generate,verify
from revision_cost_trace import traced_synthetic_graph

def check_trace(actual,expected):
    if set(actual)!=set(expected):raise ValueError('Trace fields changed')
    for field in ['effectiveTransitions','excludedFirstDraw']:
        if type(actual[field])is not type(expected[field]) or actual[field]!=expected[field]:raise ValueError('Trace metadata changed')
    maximum=0.
    for field in set(actual)-{'effectiveTransitions','excludedFirstDraw'}:
        a=np.asarray(actual[field],dtype=float);e=np.asarray(expected[field],dtype=float)
        if a.shape!=e.shape or not np.isfinite(a).all() or not np.isfinite(e).all():raise ValueError('Invalid trace shape/value')
        np.testing.assert_allclose(a,e,rtol=1e-12,atol=1e-14,equal_nan=False)
        maximum=max(maximum,float(np.max(np.abs(a-e))))
    return maximum

def portable_verify(actual,expected):
    if len(actual['worlds'])!=len(expected['worlds']):raise ValueError('World count changed')
    normalized=copy.deepcopy(expected);maximum=0.
    for a,e in zip(actual['worlds'],normalized['worlds']):
        if (a['seed'],a['group'])!=(e['seed'],e['group']):raise ValueError('World identity changed')
        maximum=max(maximum,check_trace(a['trace'],e['trace']));e['trace']=copy.deepcopy(a['trace'])
    verify(actual,normalized)
    return maximum

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--trace-only',action='store_true');args=parser.parse_args();expected=json.loads(OUT.read_text());maximum=0.
    for seed in ORIGINAL+FRESH:
        _,trace=traced_synthetic_graph(seed);reference=next(w['trace'] for w in expected['worlds'] if w['seed']==seed)
        maximum=max(maximum,check_trace(trace,reference))
    print(json.dumps({'python':sys.version.split()[0],'maximumTraceAbsoluteDifference':maximum,'traceRtol':1e-12,'traceAtol':1e-14}),flush=True)
    if not args.trace_only:
        maximum=portable_verify(generate(),expected)
        print(json.dumps({'numericalReproduction':'passed','maximumTraceAbsoluteDifference':maximum,'historicalFits':0}))
