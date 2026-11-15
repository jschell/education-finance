# GitHub Pages deployment

Repository: https://github.com/jschell/education-finance

## Initial setup

1. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as Source.
2. Open **Actions → Deploy GitHub Pages → Run workflow**, selecting main.
3. Verify Check, upload, and deploy steps succeed; follow the deployment environment's returned URL.
4. Check CSS loads under /education-finance/, phone/iPad layout, keyboard navigation, and source links. Do not describe the site as live before this completes.

The workflow deploys pushes to main after checks pass and supports manual runs. CI also checks pushes and PRs. The repository owner reported enabling GitHub Actions as the Pages source on 2026-11-15; confirm deployment through the workflow result. Upload only site/, never the repository root or exported plans. No custom domain is configured.

The workflow uses contents:read, pages:write, and id-token:write, a github-pages environment, and a single deployment concurrency group. No PAT or repository secret is needed. The connected GitHub tool may not expose Pages administration; selecting the source may need the repository owner's UI.

## Troubleshooting

If configure-pages reports missing Pages, enable the source above. If Actions or environment protection blocks publishing, inspect the failing job and repository settings. Do not force-push or weaken unrelated protections. Re-run the same workflow after settings are corrected. A failed upload requires checking supported action versions and runner compatibility.

[Official custom-workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Local checks

`npm run check` checks the starter HTML's local file references and rejects symlinks in published files. It is packaging validation only. Financial tests will be added with M1 and must gate future deployment. Serve site/ locally via Python's http.server. To manually emulate the project path, serve a temporary parent directory containing an education-finance directory mapped to site/; never change relative links to origin-root paths.
