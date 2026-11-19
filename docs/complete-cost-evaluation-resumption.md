# Complete evaluation recovery and delivery

The incomplete session is identified by protocol `d5073c7`, remote implementation `736be2a` on `complete-cost-evaluation`, and a recovered local completion commit `7c940a6`. Remote main remains `a6b89e4`; the completed experiment was not published there. The recovered local commit is not a descendant of the remote implementation, so recover its final file changes onto the existing remote branch without rewriting published history.

The completed 320-cell evidence matches the session: new complete mixtures 32/64, 45/64, 52/64 versus old 0/64, 1/64, 10/64 at 3/7/12 transitions. The decision is reject, with 21 passing, 13 failing and three unsupported gates. Historical evaluation remains unsupported; defaults and production are unchanged.

Delivery work:

1. Recover the completed experiment, decision, search accounting, readable results and final verification guards. Preserve the frozen protocol, generating sources, every case and failed gate.
2. Complete the interrupted lossless gzip packaging and verify decompressed JSON identity. Record encoding provenance and update only dependent archive hashes and generated presentation; compare scientific decisions before and after.
3. Run application checks, targeted mathematical/decision/guard checks and artifact/source reproduction. Publish a draft PR and execute all thirteen CI jobs, including eight independent numerical partitions. Record failures honestly; do not change scientific tolerances to obtain acceptance.
4. Update continuity with exact publication and CI evidence. This candidate's evaluation ends with rejection; do not restart the experiment or tune the candidate under this protocol.

The recovered files are evidence to verify, not proof of independent CI acceptance. No historical fit or production deployment is part of this delivery.
