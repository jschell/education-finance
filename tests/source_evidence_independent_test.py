"""Independent adversarial checks on raw-byte, scope and date proof links."""
import copy
import hashlib
import json
import pathlib
import sys
import tempfile
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from source_evidence import original_proof, reviewed, assess_bridge, verify_capture


def minimal_proof():
    captures={
      'price':{'id':'price','role':'price','captureKind':'raw','sha256':'a'*64,'url':'https://example.edu/current-price.csv'},
      'old-report':{'id':'old-report','role':'contemporaneous-release-evidence','captureKind':'raw','sha256':'b'*64,
                    'url':'https://example.edu/old-report.pdf'}
    }
    proof={'kind':'contemporaneous-byte-capture','captureId':'price','sha256':'a'*64,
           'sourceUrl':'https://example.edu/current-price.csv','author':'one','reviewer':'two',
           'timestampEvidenceId':'old-report','capturedAt':'2005-01-01T00:00:00Z'}
    return captures,proof


class IndependentSourceEvidenceTests(unittest.TestCase):
    def synthetic_pair(self, root):
        captures = {}
        proofs = {}
        expected = {}
        for side,year in (('from',2004),('to',2005)):
            for role in ('price','directory'):
                key=f'{side}-{role}'
                raw=f'wholly synthetic {year} {role}'.encode()
                (root/key).write_bytes(raw)
                capture={'id':key,'path':key,'role':role,'captureKind':'raw',
                         'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
                         'url':f'https://synthetic.invalid/{key}',
                         'retrievedAt':'2026-11-19T00:00:00Z'}
                captures[key]=verify_capture(capture,root)
                at=f'{year}-11-01T00:00:00Z'
                evidence_key=key+'-evidence'
                manifest={'event':'original-publication-capture',
                          'authority':{'kind':'external-archive','url':f'https://synthetic.invalid/{evidence_key}',
                                       'recordId':'SYNTHETIC-FIXTURE-ONLY'},
                          'targetSha256':capture['sha256'],'sourceUrl':capture['url'],'eventAt':at}
                evidence_key=key+'-evidence'
                evidence_raw=json.dumps(manifest,sort_keys=True).encode()
                (root/evidence_key).write_bytes(evidence_raw)
                evidence={'id':evidence_key,'path':evidence_key,
                          'role':'contemporaneous-release-evidence','captureKind':'raw','format':'archive-manifest-v1',
                          'sha256':hashlib.sha256(evidence_raw).hexdigest(),'bytes':len(evidence_raw),
                          'url':f'https://synthetic.invalid/{evidence_key}',
                          'sourceIdentityReview':{'state':'approved-original-byte-evidence',
                                                 'author':'synthetic-author','reviewer':'synthetic-reviewer',
                                                 'sourceUrl':f'https://synthetic.invalid/{evidence_key}'},
                          'retrievedAt':'2026-11-19T00:00:00Z'}
                captures[evidence_key]=verify_capture(evidence,root)
                proofs[key]={'kind':'contemporaneous-byte-capture','captureId':key,
                             'sha256':capture['sha256'],'sourceUrl':capture['url'],
                             'author':'synthetic-author','reviewer':'synthetic-reviewer',
                             'timestampEvidenceId':evidence_key,'capturedAt':at}
                expected[key]={'captureId':key,'sha256':capture['sha256'],'sourceUrl':capture['url']}
        scope={'unitid':999999,'fromCollection':2004,'toCollection':2005,'component':'paired-cost'}
        claims={}
        for key,kind in (('concept','economic-concept'),('population','reporting-population')):
            claims[key]={'id':key,'type':kind,'state':'supported','scope':scope.copy(),
                         'sourceIds':['from-price','to-price'],'locator':'synthetic fixture only',
                         'author':'synthetic-author','reviewer':'synthetic-reviewer'}
        bridge={'id':'wholly-synthetic-pair','scope':scope,'origin':'2006-01-01T00:00:00Z',
                'conceptClaim':'concept','populationClaim':'population',
                'expectedCaptures':expected,'originalProofs':proofs}
        return captures,claims,bridge

    def test_wholly_synthetic_complete_proofs_exercise_acceptance_without_activation(self):
        with tempfile.TemporaryDirectory() as temporary:
            captures,claims,bridge=self.synthetic_pair(pathlib.Path(temporary))
            result=assess_bridge(bridge,captures,claims)
            self.assertTrue(result['strictSourceEligibility'])
            self.assertFalse(result['graphApplied'])
            self.assertFalse(result['historicalFitAuthorized'])

    def test_cross_institution_or_collection_claim_cannot_authorize_pair(self):
        with tempfile.TemporaryDirectory() as temporary:
            captures,claims,bridge=self.synthetic_pair(pathlib.Path(temporary))
            claims['population']['scope']['unitid']=111111
            self.assertFalse(assess_bridge(bridge,captures,claims)['sourceContinuitySupported'])
            claims['population']['scope']=bridge['scope'].copy()
            claims['concept']['scope']['toCollection']=2007
            self.assertFalse(assess_bridge(bridge,captures,claims)['sourceContinuitySupported'])

    def test_missing_scope_identity_cannot_qualify_even_matching_assertions(self):
        with tempfile.TemporaryDirectory() as temporary:
            captures,claims,bridge=self.synthetic_pair(pathlib.Path(temporary))
            for invalid in ({'foo':'bar'}, {'unitid':999999,'fromCollection':2004,'toCollection':2005,'component':''},
                            {'unitid':True,'fromCollection':2004,'toCollection':2005,'component':'paired-cost'}):
                bad=copy.deepcopy(bridge);bad['scope']=invalid
                changed=copy.deepcopy(claims)
                for claim in changed.values():claim['scope']=copy.deepcopy(invalid)
                self.assertFalse(assess_bridge(bad,captures,changed)['sourceContinuitySupported'])

    def test_archive_manifest_requires_external_origin_and_independent_review(self):
        with tempfile.TemporaryDirectory() as temporary:
            captures,claims,bridge=self.synthetic_pair(pathlib.Path(temporary))
            bad=copy.deepcopy(captures)
            bad['from-price-evidence'].pop('sourceIdentityReview')
            self.assertFalse(assess_bridge(bridge,bad,claims)['strictSourceEligibility'])
            bad=copy.deepcopy(captures)
            bad['from-price-evidence']['_timestampRecord']['authority']['kind']='local-assertion'
            self.assertFalse(assess_bridge(bridge,bad,claims)['strictSourceEligibility'])
            bad=copy.deepcopy(captures)
            bad['from-price-evidence']['sourceIdentityReview']['reviewer']='synthetic-author'
            self.assertFalse(assess_bridge(bridge,bad,claims)['strictSourceEligibility'])

    def test_economic_bridge_requires_all_exact_price_and_directory_sources(self):
        with tempfile.TemporaryDirectory() as temporary:
            captures,claims,bridge=self.synthetic_pair(pathlib.Path(temporary))
            bad=copy.deepcopy(bridge);bad.pop('expectedCaptures')
            self.assertFalse(assess_bridge(bad,captures,claims)['sourceContinuitySupported'])
            bad=copy.deepcopy(bridge);bad['expectedCaptures'].pop('to-directory')
            self.assertFalse(assess_bridge(bad,captures,claims)['sourceContinuitySupported'])
            bad=copy.deepcopy(bridge);bad['expectedCaptures']['to-price']['sha256']='f'*64
            self.assertFalse(assess_bridge(bad,captures,claims)['sourceContinuitySupported'])
            bad=copy.deepcopy(bridge);bad['expectedCaptures']['to-directory']=copy.deepcopy(bad['expectedCaptures']['to-price'])
            self.assertFalse(assess_bridge(bad,captures,claims)['sourceContinuitySupported'])

    def test_proofs_must_match_each_expected_file_and_bound_event_timestamp(self):
        with tempfile.TemporaryDirectory() as temporary:
            captures,claims,bridge=self.synthetic_pair(pathlib.Path(temporary))
            bad=copy.deepcopy(bridge)
            bad['originalProofs']['to-price']=copy.deepcopy(bad['originalProofs']['from-price'])
            self.assertFalse(assess_bridge(bad,captures,claims)['strictSourceEligibility'])
            bad=copy.deepcopy(bridge)
            bad['originalProofs']['to-price']['capturedAt']='2004-01-01T00:00:00Z'
            self.assertFalse(assess_bridge(bad,captures,claims)['strictSourceEligibility'])
            bad=copy.deepcopy(bridge)
            bad['origin']='2004-12-31T00:00:00Z'
            self.assertFalse(assess_bridge(bad,captures,claims)['strictSourceEligibility'])

    def test_unrelated_dated_document_cannot_attest_exact_price_bytes(self):
        captures,proof=minimal_proof()
        self.assertFalse(original_proof(proof,'price',captures,'2006-01-01T00:00:00Z',
                                        {k:proof[k] for k in ('captureId','sha256','sourceUrl')}))

    def test_current_policy_cannot_become_contemporaneous_raw_file_evidence(self):
        captures,proof=minimal_proof()
        captures['old-report']['role']='current-release-policy'
        self.assertFalse(original_proof(proof,'price',captures,'2006-01-01T00:00:00Z',
                                        {k:proof[k] for k in ('captureId','sha256','sourceUrl')}))

    def test_mismatched_capture_hash_and_one_sided_proof_fail_closed(self):
        captures,proof=minimal_proof()
        proof['sha256']='c'*64
        self.assertFalse(original_proof(proof,'price',captures,'2006-01-01T00:00:00Z',
                                        {k:proof[k] for k in ('captureId','sha256','sourceUrl')}))
        result=assess_bridge({'id':'pair','origin':'2006-01-01T00:00:00Z',
                            'originalProofs':{'from-price':proof}},captures,{})
        self.assertFalse(result['strictSourceEligibility'])
        self.assertFalse(result['originalProofs']['from-directory'])
        self.assertFalse(result['originalProofs']['to-directory'])

    def test_capture_bytes_and_path_escape_are_independently_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=pathlib.Path(temporary)
            (root/'source').write_bytes(b'retained primary evidence')
            capture={'path':'source','sha256':hashlib.sha256(b'retained primary evidence').hexdigest(),
                     'bytes':len(b'retained primary evidence'),'url':'https://example.edu/source',
                     'retrievedAt':'2026-11-19T00:00:00Z'}
            self.assertEqual(verify_capture(capture,root),capture)
            bad=copy.deepcopy(capture);bad['sha256']='0'*64
            with self.assertRaises(ValueError):verify_capture(bad,root)
            bad=copy.deepcopy(capture);bad['path']='../escape'
            with self.assertRaises(ValueError):verify_capture(bad,root)

    def test_supported_claim_requires_independent_reviewer_and_source(self):
        claim={'type':'economic-concept','state':'supported','author':'one','reviewer':'one',
               'sourceIds':['missing'],'locator':'page1'}
        self.assertFalse(reviewed(claim,'economic-concept',{}))


if __name__=='__main__':unittest.main()
