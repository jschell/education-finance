import {createHash}from 'node:crypto';
import {readFileSync,writeFileSync}from 'node:fs';
import {scoreSnapshot,hash}from './calibration/prospective.mjs';
const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const input=value('--snapshot'),output=value('--output'),asOf=value('--as-of'),observedPath=value('--observations');
if(!input||!output||!asOf)throw Error('Use --snapshot PATH --as-of YYYY-MM-DD --output NEW_FILE [--observations PATH]');
const snapshot=JSON.parse(readFileSync(input)),registry=observedPath?JSON.parse(readFileSync(observedPath)):null;
if(registry&&registry.snapshotHash!==snapshot.sha256)throw Error('Observation registry snapshot mismatch.');
const observations=registry?.observations||[];
for(const r of observations){if(!/^data\/forecast-outcomes\/sources\/[a-zA-Z0-9_.-]+$/.test(r.sourceFile||''))throw Error('Invalid source file.');if(createHash('sha256').update(readFileSync(r.sourceFile)).digest('hex')!==r.sourceSha256)throw Error('Observed source digest mismatch.');}
const body={id:'prospective-outcome-status-v1',...scoreSnapshot(snapshot,observations,asOf)};
writeFileSync(output,JSON.stringify({...body,sha256:hash(body)})+'\n',{flag:'wx'});
console.log(JSON.stringify({observed:body.observed,pending:body.pending}));
