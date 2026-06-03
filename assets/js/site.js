(function () {
  const postsPath = "data/posts.json";
  const reposPath = "data/repositories.json";

  document.addEventListener("DOMContentLoaded", function () {
    setCurrentYear();
    setActiveNav();
    renderLatestPosts();
    renderPostList();
    renderPostDetail();
    renderRepositoryList();
  });

  function setCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function setActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.dataset.nav === page) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  async function getJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("Unable to load " + path);
    }
    return response.json();
  }

  async function renderLatestPosts() {
    const container = document.querySelector("[data-latest-posts]");
    if (!container) return;
    try {
      const limit = Number(container.dataset.limit || 3);
      const posts = await getJson(postsPath);
      container.innerHTML = posts
        .slice()
        .sort(sortByDateDesc)
        .slice(0, limit)
        .map(postCard)
        .join("");
    } catch (error) {
      container.innerHTML = errorMessage("Posts could not be loaded.");
    }
  }

  async function renderPostList() {
    const container = document.querySelector("[data-post-list]");
    if (!container) return;
    try {
      const posts = await getJson(postsPath);
      container.innerHTML = posts
        .slice()
        .sort(sortByDateDesc)
        .map(postRow)
        .join("");
    } catch (error) {
      container.innerHTML = errorMessage("Posts could not be loaded.");
    }
  }

  async function renderPostDetail() {
    const container = document.querySelector("[data-post-detail]");
    if (!container) return;
    const slug = new URLSearchParams(window.location.search).get("post");
    if (!slug) {
      container.innerHTML = errorMessage("Choose a post from the blog page.");
      return;
    }
    try {
      const posts = await getJson(postsPath);
      const post = posts.find(function (item) {
        return item.slug === slug;
      });
      if (!post) {
        container.innerHTML = errorMessage("Post not found.");
        return;
      }
      const response = await fetch(post.file, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("Unable to load post file.");
      }
      const markdown = await response.text();
      document.title = post.title + " | Zimeng Wang";
      container.innerHTML = [
        '<p class="section__label">Blog</p>',
        "<h1>" + escapeHtml(post.title) + "</h1>",
        '<p class="post-detail__meta">' + formatDate(post.date) + " · " + escapeHtml(post.audience || "General") + "</p>",
        '<div class="markdown">' + renderMarkdown(stripFrontMatter(markdown)) + "</div>"
      ].join("");
    } catch (error) {
      container.innerHTML = errorMessage("Post could not be loaded.");
    }
  }

  async function renderRepositoryList() {
    const container = document.querySelector("[data-repo-list]");
    if (!container) return;
    try {
      const repos = await getJson(reposPath);
      container.innerHTML = repos.map(repoCard).join("");
    } catch (error) {
      container.innerHTML = errorMessage("Repository entries could not be loaded.");
    }
  }

  function postCard(post) {
    return [
      '<article class="post-card">',
      '<p class="post-card__date">' + formatDate(post.date) + "</p>",
      "<h3>" + escapeHtml(post.title) + "</h3>",
      "<p>" + escapeHtml(post.excerpt || "") + "</p>",
      '<a class="text-link" href="post.html?post=' + encodeURIComponent(post.slug) + '">Read note</a>',
      tagList(post.tags, "post-card__tags"),
      "</article>"
    ].join("");
  }

  function postRow(post) {
    return [
      '<article class="post-card">',
      '<p class="post-card__date">' + formatDate(post.date) + " · " + escapeHtml(post.audience || "General") + "</p>",
      "<h2>" + escapeHtml(post.title) + "</h2>",
      "<p>" + escapeHtml(post.excerpt || "") + "</p>",
      '<a class="text-link" href="post.html?post=' + encodeURIComponent(post.slug) + '">Open post</a>',
      tagList(post.tags, "post-card__tags"),
      "</article>"
    ].join("");
  }

  function repoCard(repo) {
    return [
      '<article class="repo-card">',
      "<div>",
      '<p class="card__meta">' + escapeHtml(repo.status || "Public") + "</p>",
      "<h3>" + escapeHtml(repo.name) + "</h3>",
      "<p>" + escapeHtml(repo.summary || "") + "</p>",
      '<p class="muted">' + escapeHtml(repo.audience || "") + "</p>",
      tagList(repo.topics, "repo-card__topics"),
      "</div>",
      '<a class="button button--ghost" href="' + safeUrl(repo.url) + '" rel="noopener noreferrer">Repository</a>',
      "</article>"
    ].join("");
  }

  function tagList(tags, className) {
    if (!Array.isArray(tags) || tags.length === 0) return "";
    return [
      '<ul class="' + className + '">',
      tags.map(function (tag) {
        return '<li class="tag">' + escapeHtml(tag) + "</li>";
      }).join(""),
      "</ul>"
    ].join("");
  }

  function sortByDateDesc(left, right) {
    return String(right.date || "").localeCompare(String(left.date || ""));
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value + "T00:00:00");
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function errorMessage(message) {
    return '<p class="muted">' + escapeHtml(message) + "</p>";
  }

  function stripFrontMatter(markdown) {
    return markdown.replace(/^---[\s\S]*?---\s*/, "");
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listItems = [];
    let inCode = false;
    let codeLines = [];

    function flushParagraph() {
      if (paragraph.length) {
        html.push("<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>");
        paragraph = [];
      }
    }

    function flushList() {
      if (listItems.length) {
        html.push("<ul>" + listItems.map(function (item) {
          return "<li>" + inlineMarkdown(item) + "</li>";
        }).join("") + "</ul>");
        listItems = [];
      }
    }

    lines.forEach(function (line) {
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (inCode) {
          html.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
          codeLines = [];
          inCode = false;
        } else {
          flushParagraph();
          flushList();
          inCode = true;
        }
        return;
      }

      if (inCode) {
        codeLines.push(line);
        return;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = heading[1].length;
        html.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">");
        return;
      }

      if (trimmed.startsWith("> ")) {
        flushParagraph();
        flushList();
        html.push("<blockquote><p>" + inlineMarkdown(trimmed.slice(2)) + "</p></blockquote>");
        return;
      }

      const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        listItems.push(listMatch[1]);
        return;
      }

      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();
    if (inCode) {
      html.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    }
    return html.join("\n");
  }

  function inlineMarkdown(value) {
    const codeSpans = [];
    let html = escapeHtml(value).replace(/`([^`]+)`/g, function (_, code) {
      const token = "\u0000CODE" + codeSpans.length + "\u0000";
      codeSpans.push("<code>" + escapeHtml(code) + "</code>");
      return token;
    });

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, url) {
      return '<img src="' + safeUrl(url) + '" alt="' + escapeAttribute(alt) + '" loading="lazy">';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      return '<a href="' + safeUrl(url) + '" rel="noopener noreferrer">' + label + "</a>";
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    codeSpans.forEach(function (code, index) {
      html = html.replace("\u0000CODE" + index + "\u0000", code);
    });
    return html;
  }

  function safeUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "#";
    if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(url)) {
      return escapeAttribute(url);
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      return "#";
    }
    return escapeAttribute(url);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
