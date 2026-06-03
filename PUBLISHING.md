# Publishing

This local repository is ready for the GitHub Pages user site at:

```text
https://Pest1cide.github.io/
```

GitHub Pages user sites must use a repository named `Pest1cide.github.io`.

## Current Laptop State

- Git SSH authentication works for the GitHub account `Pest1cide`.
- The local repository is committed on branch `main`.
- The remote is configured as `git@github.com:Pest1cide/Pest1cide.github.io.git`.
- GitHub CLI is installed in a separate conda environment at:

```text
/home/mz/miniconda3/envs/github-pages-gh/bin/gh
```

The remote GitHub repository did not exist when this file was written.

## Publish With GitHub CLI

From this directory:

```bash
/home/mz/miniconda3/envs/github-pages-gh/bin/gh auth login --hostname github.com --git-protocol ssh --web --skip-ssh-key
/home/mz/miniconda3/envs/github-pages-gh/bin/gh repo create Pest1cide/Pest1cide.github.io --public --source=. --remote=origin --push
```

If the repo already exists after login, push directly:

```bash
git push -u origin main
```

## Manual Fallback

1. Open GitHub in the browser.
2. Create a new public repository named `Pest1cide.github.io`.
3. Do not add a README, license, or `.gitignore` on GitHub.
4. Run:

```bash
git push -u origin main
```

## Pre-Push Safety Check

Run these checks before publishing new content:

```bash
git status --short --branch
git diff --stat
rg -n "BEGIN .*KEY|password|token|secret|\\.env|id_rsa|id_ed25519|PRIVATE|unpublished" .
```

The search can produce intentional matches in safety documentation or JavaScript variable names. Review the output before pushing.
