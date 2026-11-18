# Revision reversal reporting follow-up

Review of PR #11 at `9999c3725ff3692718ce00818af706cf3ef5969a` found the planned reversal reporting missing from the otherwise passing panel audit. Commit this definition before generating additional diagnostics.

On the same training identities and years already registered, compare the original current-year amount, lag-one representation and lag-two representation. Require both original-to-lag comparisons and the lag-one-to-lag-two comparison to pass existing definition/population matching. Preserve an explicit status count for every registered trajectory, including missing final collections.

A reversal means the first revision and subsequent revision have opposite signs. Report partial reversals (final remains on the first revision's side of the original), exact returns, and overshoots separately. Unchanged first revisions cannot count as reversals. Report counts only, by existing sector/component; do not fit a model, change source bytes, select a price view or interpret these dependent training counts as population prevalence.
