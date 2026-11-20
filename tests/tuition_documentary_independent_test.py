"""Independent adversarial consistency checks; no chart transcription or inference."""
import copy
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import tuition_documentary as documentary
from source_evidence import DEFAULT as SOURCE_PATH


class IndependentDocumentaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = json.loads(documentary.REGISTRY.read_text())

    def modified(self):
        return copy.deepcopy(self.registry)

    def reject(self, record):
        with self.assertRaises(ValueError):
            documentary.validate(record)

    def test_actual_corpus_is_complete_but_cannot_authorize_history(self):
        result = documentary.validate(self.registry)
        self.assertEqual(result['reports'], 4)
        self.assertEqual(result['expectedSlots'], 12)
        self.assertEqual(result['documentaryEligibleSlots'] + result['unreadableSlots'], 12)
        self.assertEqual(result['equalPairs'] + result['differentPairs'] + result['unavailablePairs'], 4)
        for key in ('originalVintagePairs', 'populationBridges', 'historicalFits'):
            self.assertEqual(result[key], 0)
        self.assertIs(result['pairedHistorySupported'], False)
        self.assertIs(result['productionActivation'], False)

    def test_missing_duplicate_unknown_reports_and_slots_reject(self):
        cases = []
        r = self.modified(); r['reports'].pop(); cases.append(r)
        r = self.modified(); r['reports'][1] = copy.deepcopy(r['reports'][0]); cases.append(r)
        r = self.modified(); r['reports'][0]['captureId'] = 'unapproved-extra-report'; cases.append(r)
        r = self.modified(); r['reports'][0]['slots'].pop(); cases.append(r)
        r = self.modified(); r['reports'][0]['slots'][1] = copy.deepcopy(r['reports'][0]['slots'][0]); cases.append(r)
        r = self.modified(); r['reports'][0]['slots'][0]['academicYear'] = 2009; cases.append(r)
        for i, record in enumerate(cases):
            with self.subTest(case=i):
                self.reject(record)

    def test_report_and_slot_review_must_be_independent_people(self):
        for position in ('report', 'slot'):
            for author, reviewer in (('person-a', 'person-a'), ('person-a', ' PERSON-A '), ('', 'person-b'), (1, 2)):
                r = self.modified()
                item = r['reports'][0] if position == 'report' else r['reports'][0]['slots'][0]
                item['review'] = {'state': 'approved', 'author': author, 'reviewer': reviewer}
                with self.subTest(position=position, author=author, reviewer=reviewer):
                    self.reject(r)
            r = self.modified()
            item = r['reports'][0] if position == 'report' else r['reports'][0]['slots'][0]
            item.pop('review', None)
            self.reject(r)

    def test_numeric_values_and_series_cannot_be_inferred_or_substituted(self):
        cases = []
        for key, value in (('series', 'comparison-group-median'), ('figure', 4), ('figurePage', 4), ('measurePage', 7), ('sha256', '0'*64)):
            r = self.modified(); r['reports'][0][key] = value; cases.append(r)
        for value in (True, -1, 4100.0, '4100'):
            r = self.modified(); row = r['reports'][0]['slots'][0]
            row.update(status='readable', amount=value, valueBasis='visible-institution-point-label'); cases.append(r)
        r = self.modified(); row = r['reports'][0]['slots'][0]
        row.update(status='readable', amount=4100, valueBasis='interpolated-from-chart'); cases.append(r)
        r = self.modified(); r['reports'][0]['slots'][0].update(status='unreadable', amount=4100, reason='overlapping labels'); cases.append(r)
        r = self.modified(); row = r['reports'][0]['slots'][0]
        row.update(status='unreadable', amount=None); row.pop('reason', None); cases.append(r)
        for i, record in enumerate(cases):
            with self.subTest(case=i):
                self.reject(record)

    def test_date_labels_require_exact_pinned_letter_binding(self):
        r = self.modified(); r['reports'][0]['issueDate'] = '1999-01-01'; self.reject(r)
        r = self.modified(); r['reports'][0]['issueDatePage'] = 1; self.reject(r)
        r = self.modified(); r['reports'][0].update(issueDate='1999-01-01', issueDateText='January 01, 1999'); self.reject(r)
        with patch.object(documentary, 'page_text', return_value='No documentary date or cohort text here'):
            self.reject(self.modified())

    def test_stronger_proof_or_activation_is_rejected_at_every_claim_level(self):
        for location in ('top', 'report', 'slot'):
            for field, value in [('proofLevel', 'original-byte-vintage')] + [(key, True) for key in documentary.FORBIDDEN]:
                r = self.modified()
                item = r if location == 'top' else (r['reports'][0] if location == 'report' else r['reports'][0]['slots'][0])
                item[field] = value
                with self.subTest(location=location, field=field):
                    self.reject(r)

    def test_comparison_and_summary_are_recomputed_not_trusted(self):
        for field, value in (('state', 'forged'), ('leftAmount', -1), ('academicYear', 2050)):
            r = self.modified(); r['comparisons'][0][field] = value; self.reject(r)
        for field, value in (('documentaryEligibleSlots', 999), ('originalVintagePairs', 1), ('populationBridges', 1), ('historicalFits', 1), ('productionActivation', True)):
            r = self.modified(); r['summary'][field] = value; self.reject(r)
        r = self.modified(); r['comparisons'].pop(); self.reject(r)

    def test_changed_pinned_pdf_bytes_reject_before_cached_page_text(self):
        source = json.loads(SOURCE_PATH.read_text())
        approved = set(documentary.CONFIG)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target_source = root / SOURCE_PATH.relative_to(documentary.ROOT)
            target_source.parent.mkdir(parents=True)
            target_source.write_text(json.dumps(source))
            copied = []
            for capture in source['captures']:
                if capture['id'] not in approved:
                    continue
                target = root / capture['path']
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(documentary.ROOT / capture['path'], target)
                copied.append(target)
            self.assertEqual(len(copied), 4)
            documentary.validate(self.registry, root)
            copied[0].write_bytes(copied[0].read_bytes() + b'\nchanged-document-bytes')
            with self.assertRaises(ValueError):
                documentary.validate(self.registry, root)


if __name__ == '__main__':
    unittest.main()
