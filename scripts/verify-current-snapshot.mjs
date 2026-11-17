import {readFileSync,mkdtempSync,rmSync}from 'node:fs';
import {tmpdir}from 'node:os';
import {join,resolve}from 'node:path';
import {execFileSync}from 'node:child_process';
import assert from 'node:assert/strict';
import {ACTIVE_CALIBRATION_FILE}from '../site/js/release.js';
import {MODEL}from '../site/js/domain.js';
import {hash}from './calibration/prospective.mjs';
const read=p=>JSON.parse(readFileSync(p));
const index=read('data/forecast-snapshots/current-index.json'),snapshot=read(index.path),report=read('site/data/prospective-validation.json'),bundle=read('site/data/'+ACTIVE_CALIBRATION_FILE);
assert.equal(snapshot.sha256,index.snapshotHash);assert.equal(snapshot.bundleHash,bundle.sha256);assert.equal(snapshot.modelVersion,MODEL);assert.equal(snapshot.production,true);
for(const [path,expected]of Object.entries(snapshot.sourceHashes)){
 const bytes=execFileSync('git',['show',snapshot.sourceCommit+':'+path],{maxBuffer:32*1024*1024});
 const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);
}
const {sha256,...body}=snapshot;assert.equal(hash(body),sha256);
const temp=mkdtempSync(join(tmpdir(),'education-finance-prospective-')),tree=join(temp,'source'),output=join(temp,'forecast.json'),score=join(temp,'score.json');
try{
 execFileSync('git',['worktree','add','--detach',tree,snapshot.sourceCommit],{stdio:'pipe'});
 const args=['scripts/create-forecast-snapshot.mjs','--as-of',snapshot.asOf,'--source-commit',snapshot.sourceCommit,'--output',output];
 execFileSync(process.execPath,args,{cwd:tree,stdio:'pipe'});
 assert.equal(readFileSync(output,'utf8'),readFileSync(index.path,'utf8'),'Recorded source reproduces the immutable forecast');
 assert.throws(()=>execFileSync(process.execPath,args,{cwd:tree,stdio:'pipe'}));
 assert.equal(readFileSync(output,'utf8'),readFileSync(index.path,'utf8'),'Overwrite attempt leaves forecast unchanged');
 const scoreArgs=['scripts/score-forecast-snapshot.mjs','--snapshot',index.path,'--as-of',report.asOf,'--output',score];
 if(index.observationsPath)scoreArgs.push('--observations',index.observationsPath);
 execFileSync(process.execPath,scoreArgs,{stdio:'pipe'});
 assert.equal(readFileSync(score,'utf8'),readFileSync('site/data/prospective-validation.json','utf8'),'Current observed/pending score reproduces');
 console.log(JSON.stringify({sourceCommit:snapshot.sourceCommit,snapshotHash:snapshot.sha256,forecasts:snapshot.forecasts.length,observed:report.observed,pending:report.pending,immutable:true}));
}finally{
 try{execFileSync('git',['worktree','remove','--force',tree],{stdio:'pipe'});}finally{rmSync(temp,{recursive:true,force:true});}
}
