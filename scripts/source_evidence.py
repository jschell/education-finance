"""Fail-closed source proof checks; never fits or activates a cost model."""
import argparse
import datetime as dt
import hashlib
import gzip
import json
from pathlib import Path

METHOD = 'source-evidence-acquisition-1.0.0'
ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / 'data/research/source-evidence-acquisition.json'


def date(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Evidence timestamp requires timezone')
    return parsed


def verify_capture(capture, root):
    path = (root / capture['path']).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Capture outside repository')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != capture['sha256'] or len(raw) != capture['bytes']:
        raise ValueError('Capture bytes/hash mismatch')
    if not capture['url'].startswith('https://'):
        raise ValueError('Missing primary HTTPS source')
    date(capture['retrievedAt'])
    verified = dict(capture)
    if capture.get('role') == 'contemporaneous-release-evidence':
        if capture.get('format') != 'archive-manifest-v1':
            raise ValueError('Timestamp evidence must be a bound manifest')
        verified['_timestampRecord'] = json.loads(raw)
    return verified


def reviewed(claim, expected, captures):
    return bool(claim and claim.get('type') == expected and claim.get('state') == 'supported'
                and claim.get('reviewer') and claim.get('author')
                and claim['reviewer'] != claim['author']
                and claim.get('sourceIds') and claim.get('locator')
                and all(s in captures for s in claim['sourceIds']))


def original_proof(proof, role, captures, origin, expected=None):
    if not proof or proof.get('kind') != 'contemporaneous-byte-capture' or not expected:
        return False
    capture = captures.get(proof.get('captureId'))
    if (not capture or capture.get('role') != role or capture.get('captureKind') != 'raw'
            or proof.get('sha256') != capture['sha256'] or proof.get('sourceUrl') != capture['url']
            or any(expected.get(k) != proof.get(k) for k in ('captureId', 'sha256', 'sourceUrl'))
            or not proof.get('reviewer') or proof.get('reviewer') == proof.get('author')
            or not proof.get('author') or not proof.get('timestampEvidenceId')):
        return False
    evidence = captures.get(proof['timestampEvidenceId'])
    if (not evidence or evidence.get('role') != 'contemporaneous-release-evidence'
            or evidence.get('captureKind') != 'raw'):
        return False
    record = evidence.get('_timestampRecord', {})
    review = evidence.get('sourceIdentityReview', {})
    authority = record.get('authority', {})
    if (review.get('state') != 'approved-original-byte-evidence'
            or not review.get('reviewer') or not review.get('author')
            or review['reviewer'] == review['author']
            or review.get('sourceUrl') != evidence['url']
            or authority.get('kind') not in ('external-archive', 'official-release-record')
            or authority.get('url') != evidence['url'] or not authority.get('recordId')):
        return False
    if (record.get('event') != 'original-publication-capture'
            or record.get('targetSha256') != capture['sha256']
            or record.get('sourceUrl') != capture['url']
            or record.get('eventAt') != proof.get('capturedAt')):
        return False
    try:
        return date(record['eventAt']) <= date(origin)
    except (ValueError, KeyError, TypeError):
        return False


def assess_bridge(bridge, captures, claims):
    concept = claims.get(bridge.get('conceptClaim'))
    population_claim = claims.get(bridge.get('populationClaim'))
    scope = bridge.get('scope')
    valid_scope = bool(isinstance(scope, dict) and set(scope) == {'unitid', 'fromCollection', 'toCollection', 'component'}
                       and type(scope['unitid']) is int and scope['unitid'] > 0
                       and all(type(scope[k]) is int and 1900 <= scope[k] <= 2200 for k in ('fromCollection', 'toCollection'))
                       and isinstance(scope['component'], str) and scope['component'].strip())
    concepts = bool(valid_scope and reviewed(concept, 'economic-concept', captures) and concept.get('scope') == scope)
    population = bool(valid_scope and reviewed(population_claim, 'reporting-population', captures) and population_claim.get('scope') == scope)
    reasons = []
    if not concepts:
        reasons.append('economic-concept-unproved')
    if not population:
        reasons.append('institution-population-unproved')
    # Exact raw provenance is required even before historical-publication proof.
    descriptors = bridge.get('expectedCaptures', {})
    descriptor_ok = {}
    for side in ('from', 'to'):
        for role in ('price', 'directory'):
            key = f'{side}-{role}'
            item = descriptors.get(key, {})
            capture = captures.get(item.get('captureId'))
            descriptor_ok[key] = bool(capture and capture.get('role') == role
                                      and capture.get('captureKind') == 'raw'
                                      and item.get('sha256') == capture['sha256']
                                      and item.get('sourceUrl') == capture['url'])
            if not descriptor_ok[key]:
                reasons.append(f'{key}-raw-provenance-unproved')
    if scope and scope.get('fromCollection') != scope.get('toCollection'):
        for role in ('price', 'directory'):
            left = descriptors.get(f'from-{role}', {}).get('captureId')
            right = descriptors.get(f'to-{role}', {}).get('captureId')
            if left is not None and left == right:
                descriptor_ok[f'to-{role}'] = False
                reasons.append(f'{role}-distinct-collection-provenance-missing')
    source_bridge = concepts and population and all(descriptor_ok.values())
    proof_results = {}
    for side in ('from', 'to'):
        for role in ('price', 'directory'):
            key = f'{side}-{role}'
            proof_results[key] = original_proof(bridge.get('originalProofs', {}).get(key), role,
                                                captures, bridge['origin'], bridge.get('expectedCaptures', {}).get(key))
            if not proof_results[key]:
                reasons.append(f'{key}-original-vintage-unproved')
    return {'id': bridge['id'], 'sourceContinuitySupported': bool(source_bridge),
            'originalProofs': proof_results,
            'strictSourceEligibility': bool(source_bridge and all(proof_results.values())),
            'reasons': reasons, 'graphApplied': False, 'historicalFitAuthorized': False}


def validate_comparisons(registry, captures, root):
    for row in registry.get('comparisons', []):
        source = captures.get(row['institutionCaptureId'])
        if not source or source.get('captureKind') != 'review-extract':
            raise ValueError('Comparison lacks pinned institution extract')
        extract = json.loads((root / source['path']).read_text())
        if extract['originalDocumentSha256'] != source['originalDocumentSha256']:
            raise ValueError('Institution original document identity mismatch')
        fields = extract['fields']
        expected = {'in-state-tuition-fees': fields['firstYearInStateTuition'] + fields['requiredFees'],
                    'out-state-tuition-fees': fields['firstYearOutStateTuition'] + fields['requiredFees'],
                    'resident-G5-room-board': fields['residentG5RoomBoard']}[row['component']]
        if row['institutionValue'] != expected:
            raise ValueError('Comparison changes institution source value')
        records = [row]
        if row.get('laterRepresentation'):
            records.append(row['laterRepresentation'])
        for item in records:
            path = (root / item['panelPath']).resolve()
            if not path.is_relative_to(root.resolve()):
                raise ValueError('Panel outside repository')
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() != item['panelSha256']:
                raise ValueError('Panel source identity mismatch')
            panel = json.loads(gzip.decompress(raw))
            field = item.get('panelField', item.get('field'))
            observation = next(r for r in panel['observations'] if r[0] == row['unitid'] and r[2] == field)
            value = item.get('panelValue', item.get('value'))
            if observation[5] != value or (expected == value) != item['numericAgreement']:
                raise ValueError('Comparison changes pinned panel value/agreement')
            if item is row and observation != row['panelRow']:
                raise ValueError('Comparison row provenance mismatch')
        if not row['comparability'].startswith('related-definition contrast'):
            raise ValueError('Unreviewed exact-definition comparison claim')


def validate_registry(registry, root=ROOT):
    if (registry.get('method') != METHOD or registry.get('historicalFits') != 0
            or registry.get('productionActivation') is not False or registry.get('appliedGraphBridges') != 0):
        raise ValueError('Forbidden historical fit, graph mutation or production activation')
    capture_rows = registry.get('captures', [])
    ids = [c['id'] for c in capture_rows]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate capture ID')
    captures = {c['id']: verify_capture(c, root) for c in capture_rows}
    validate_comparisons(registry, captures, root)
    claims = {c['id']: c for c in registry.get('claims', [])}
    if len(claims) != len(registry.get('claims', [])):
        raise ValueError('Duplicate claim ID')
    for claim in claims.values():
        if claim.get('state') == 'supported' and not all(s in captures for s in claim.get('sourceIds', [])):
            raise ValueError('Supported claim references unpinned source')
    bridges = registry.get('proposedBridges', [])
    bridge_ids = [b['id'] for b in bridges]
    bridge_scopes = [json.dumps(b.get('scope'), sort_keys=True) for b in bridges]
    if len(bridge_ids) != len(set(bridge_ids)) or len(bridge_scopes) != len(set(bridge_scopes)):
        raise ValueError('Duplicate bridge identity/scope')
    assessments = [assess_bridge(b, captures, claims) for b in bridges]
    result = {'method': METHOD, 'captures': len(captures), 'comparisons': len(registry.get('comparisons', [])),
              'supportedConceptClaims': sum(reviewed(c, 'economic-concept', captures) for c in claims.values()),
              'supportedPopulationClaims': sum(reviewed(c, 'reporting-population', captures) for c in claims.values()),
              'strictEligiblePairs': sum(a['strictSourceEligibility'] for a in assessments),
              'assessments': assessments, 'appliedGraphBridges': 0, 'historicalFits': 0,
              'scientificQualification': False, 'productionActivation': False}
    if registry.get('summary') != result:
        raise ValueError('Recorded source decision does not match proof records')
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('path', nargs='?', type=Path, default=DEFAULT)
    args = parser.parse_args()
    print(json.dumps(validate_registry(json.loads(args.path.read_text())), indent=2))


if __name__ == '__main__':
    main()
