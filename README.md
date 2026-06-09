# Pest1cide.github.io

Personal website for Zimeng Wang: robotics research, selected projects, life beyond the lab, and field notes.

The site is a dependency-free static build served directly by GitHub Pages. Its content is based on public-facing
academic, project, and GitHub information.

## Local Preview

From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Content Structure

- `index.html`: profile and selected work
- `research.html`: research questions, experience, and public code
- `projects.html`: selected robotics systems and milestones
- `interests.html`: personal background and photography
- `blog.html` and `post.html`: field-note index and renderer
- `data/posts.json`: field-note metadata
- `data/repositories.json`: selected public GitHub repositories
- `posts/`: Markdown field notes

## Publish

The `main` branch publishes to `https://Pest1cide.github.io/`.

Before pushing, review the public-site safety checklist in `SECURITY.md` and run:

```bash
git status --short --branch
git diff --stat
```
