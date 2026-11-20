"""Pinned real-record accounting and adversarial numeric reconciliation."""
import copy
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from source_evidence import DEFAULT, ROOT, validate_registry


class SourceEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.record = json.loads(DEFAULT.read_text())

    def test_actual_capture_and_unresolved_accounting(self):
        result = validate_registry(self.record)
        self.assertEqual((result['captures'], result['comparisons']), (8, 6))
        self.assertEqual(result['strictEligiblePairs'], 0)
        self.assertEqual(result['supportedPopulationClaims'], 0)
        self.assertTrue(all(not x['sourceContinuitySupported'] for x in result['assessments']))
        self.assertEqual(sum(x['numericAgreement'] for x in self.record['comparisons']), 5)
        housing = self.record['comparisons'][-1]
        self.assertEqual((housing['institutionValue'], housing['panelValue']), (9080, 12266))
        self.assertTrue(housing['laterRepresentation']['numericAgreement'])

    def test_capture_and_institution_tampering_rejected(self):
        for field, value in [('sha256', '0'*64), ('bytes', 1)]:
            record = copy.deepcopy(self.record)
            record['captures'][0][field] = value
            with self.assertRaises(ValueError):
                validate_registry(record)
        record = copy.deepcopy(self.record)
        record['comparisons'][0]['institutionValue'] += 1
        with self.assertRaises(ValueError):
            validate_registry(record)

    def test_panel_and_definition_tampering_rejected(self):
        for field, value in [('panelValue', 1), ('numericAgreement', False),
                             ('panelSha256', '0'*64), ('comparability', 'exact comparable truth')]:
            record = copy.deepcopy(self.record)
            record['comparisons'][0][field] = value
            with self.assertRaises(ValueError):
                validate_registry(record)


if __name__ == '__main__':
    unittest.main()
