const NEWS_URLS = ["public/news.json", "news.json", "assets/news.json"];

const statusEl = document.getElementById("news-status");
const errorEl = document.getElementById("news-error");
const listEl = document.getElementById("news-list");

function formatDate(dateString) {
  if (!dateString) return "Date unavailable";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function renderSkeletons(count = 6) {
  listEl.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton";
    listEl.appendChild(skeleton);
  }
}

function showError(message) {
  if (statusEl) statusEl.classList.add("is-hidden");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("is-hidden");
  }
}

async function fetchNews() {
  for (const url of NEWS_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch {
      continue;
    }
  }
  throw new Error("Unable to fetch news.");
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "news-card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-expanded", "false");

  card.innerHTML = `
    <img src="${item.image}" alt="${item.title}" loading="lazy">
    <h3 class="news-title">${item.title}</h3>
    <p>${item.snippet || ""}</p>
    <div class="news-meta">${item.source} · ${formatDate(item.publishedAt)}</div>
    <div class="news-expand">
      <p>${item.description || item.snippet || ""}</p>
      <div class="news-meta">Published: ${formatDate(item.publishedAt)}</div>
      <div class="news-actions">
        <a class="pill" href="${item.url}" target="_blank" rel="noopener">Read full article</a>
      </div>
    </div>
  `;

  const toggle = () => {
    const expanded = card.classList.toggle("is-expanded");
    card.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  card.addEventListener("click", toggle);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });

  return card;
}

function renderNews(items) {
  listEl.innerHTML = "";
  if (!items.length) {
    showError("No K-pop news found today.");
    return;
  }

  items.forEach((item) => {
    listEl.appendChild(createCard(item));
  });
}

async function init() {
  renderSkeletons();
  try {
    const data = await fetchNews();
    if (statusEl) statusEl.classList.add("is-hidden");
    renderNews(data.items || []);
  } catch (error) {
    showError("News unavailable right now. Please try again later.");
    console.error(error);
  }
}

init();
