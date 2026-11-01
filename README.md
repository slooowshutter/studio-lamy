# Studio Lamy sites

One Vercel project, repo root. Rebuilt by `assemble.py`.

- `/` : Studio Lamy homepage (single version; `/studio*` and `/service-variant-*` redirect to `/`)
- `/<shop>/v1/`, `/v2/`, `/v3/` : shop previews; `/<shop>/` redirects to the critic's pick
- `/service/` : kept for shop-page links; `/preview-<shop>/` redirect
- `/demo-*/` : fictional demos
- `/review/` : index of everything
- Review panel (versions + brand picker) is hidden; type `cheat` or add `?cheat=1` to show it (`?cheat=0` hides)
