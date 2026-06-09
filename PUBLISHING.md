# Publishing

This repository is the source for:

```text
https://Pest1cide.github.io/
```

GitHub Pages serves the static files from the repository root on the `main` branch.

## Publish Updates

After previewing and reviewing the changes:

```bash
git status --short --branch
git diff --stat
git add <reviewed-files>
git commit -m "Describe the site update"
git push origin main
```

## Public-Site Check

Everything committed here becomes public. Before pushing, confirm that the changes do not include credentials,
private source code, unpublished data, internal lab notes, or unintended personal information.

```bash
rg -n "BEGIN .*KEY|password|token|secret|\\.env|id_rsa|id_ed25519|PRIVATE|unpublished" .
```
