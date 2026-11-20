# Integrated research PR checkpoint

The user explicitly authorized merging ready PRs. PRs #17–#23 were audited, marked ready, retargeted to main in dependency order and merged with merge commits. All exact heads had successful Check runs; independent code/scientific audits found no review blocker. No force push, squash rewrite, protection change or candidate activation occurred.

| PR | Accepted head | Merge commit |
| --- | --- | --- |
| [#17](https://github.com/jschell/education-finance/pull/17) | `c725ca9f5ce7176e7f22c36b655f82013ea6a0e9` | `75408e05fc61035b6b55d642901140c8ee535385` |
| [#18](https://github.com/jschell/education-finance/pull/18) | `55243dc79404e91908a5464a2f57a244dffdfef6` | `0f6a4d769af3b5184061aa18c97cb531d0acbeda` |
| [#19](https://github.com/jschell/education-finance/pull/19) | `88b93bf99671bd010d2ff786ba10e2bbc578ca93` | `b33ebf7a33fa304e557f1c915976b7bcfe31f5a9` |
| [#20](https://github.com/jschell/education-finance/pull/20) | `f046bbf3a284d8e160e12599029e1bd40a2b882c` | `f4295e6fa9a438062d87b0c0fd7108afa3e16efc` |
| [#21](https://github.com/jschell/education-finance/pull/21) | `a8bf1801ab72d403df065771bf82462c72a8cf78` | `8e1be448cb57cb9ce1aa6f86a1b6ac8f3c3d40ce` |
| [#22](https://github.com/jschell/education-finance/pull/22) | `a37d3203770f258bcefa696937598b6d7ab9539e` | `ab45fd5b44247f88fc348de20f6d55a752ec775a` |
| [#23](https://github.com/jschell/education-finance/pull/23) | `b16a471c523f62633f3fb6932a5e21b623b5d686` | `8f4b6a154d990331133a82ccb9d32c523fb825ec` |

Final integrated main is `8f4b6a154d990331133a82ccb9d32c523fb825ec`, tree `3a16fbde6e66e5b0e15e2caa69716a34bde557a9`, exactly identical to accepted top PR #23 head `b16a471c523f62633f3fb6932a5e21b623b5d686`. Each intermediate main tree also matched its accepted dependency head before the next retarget/merge. Immediately after this integration, the open-PR collection was empty.

Independent Git-tree verification confirms the production `site` tree remains `88aec8eeba4019b1aab19afc4c130f553bb042e3` and `package.json` blob remains `94c8836d6c5c0676c288e8286f0db8536252eba6`, both identical to pre-integration main `a6b89e4dd47141181012ba8923ad3c6f92a3b990`. All application assets, embedded defaults and app/model versions therefore remain unchanged. Scientific rejections and original-vintage/production limitations are retained; rejected candidates are accepted research evidence, not activated forecasts.

Existing main-push Check and Pages workflows run normally. Pages republishes the identical static assets; live verification follows successful deployment. Their current run results must be observed separately rather than inferred from successful merges. This checkpoint does not claim new main/deployment acceptance before those runs finish.

The next bounded C3 work starts from this integrated main in `retrospective-c3`; see [its protocol](retrospective-c3-protocol.md). Publishing this checkpoint on the child branch avoids cancelling the final main validation with an extra documentation push. No C3 fit or outcome precedes its remote protocol publication.
