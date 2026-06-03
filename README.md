# Pest1cide.github.io

Personal GitHub Pages template for an academic profile, public project examples, interests, and a simple Markdown blog.

## Local Preview

From this directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

No conda environment is needed for this version. It is a static site and works with GitHub Pages from the repository root.

## Publish To GitHub Pages

The laptop is authenticated to GitHub as `Pest1cide` over SSH. Create a public repository named `Pest1cide.github.io` on GitHub, then push this local repository:

```bash
git remote add origin git@github.com:Pest1cide/Pest1cide.github.io.git
git branch -M main
git push -u origin main
```

If the remote is already configured, use:

```bash
git push -u origin main
```

After the push, GitHub Pages should serve the site at `https://Pest1cide.github.io/`. If it does not appear automatically, open the repository settings on GitHub and set Pages to deploy from the `main` branch root.

See `PUBLISHING.md` for the GitHub CLI path installed on this laptop and the exact publish commands.

## Edit Profile Content

- Update the name, title, email, and links in the HTML files.
- Update public academic repository entries in `data/repositories.json`.
- Replace `assets/img/hero-research-workbench.png` if you want a real personal or lab image later.
- Keep private research code, unpublished datasets, credentials, and internal notes out of this repository.

## Add A Blog Post

1. Create a Markdown file under `posts/`, for example `posts/2026-06-15-first-note.md`.
2. Add a matching entry to `data/posts.json`.
3. Preview locally with `python3 -m http.server 8000`.
4. Commit and push.

The browser renderer escapes raw HTML in Markdown posts. Use normal Markdown links, lists, headings, code blocks, and images.

## Safety Notes

This repository itself becomes public when used as a normal GitHub Pages user site. The `.gitignore` blocks common secret, dataset, model, and archive formats, but review `git status` before every commit.
