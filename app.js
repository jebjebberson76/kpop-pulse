const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const filters = document.querySelectorAll("[data-filter]");
let comebackCards = document.querySelectorAll(".comeback-card");
const newsStatus = document.getElementById("news-status");
const newsError = document.getElementById("news-error");
const newsList = document.getElementById("news-list");
let tourCards = document.querySelectorAll("#tours .card");
const tourCitySelect = document.getElementById("tour-city");
const comebackTitle = document.getElementById("comeback-title");
const comebackMeta = document.getElementById("comeback-meta");
const comebackBody = document.getElementById("comeback-body");
const comebackEmpty = document.getElementById("comebacks-empty");
const toursEmpty = document.getElementById("tours-empty");
const comebackList = document.getElementById("comeback-list");
const tourList = document.getElementById("tour-list");
const shareModal = document.getElementById("share-modal");
const shareSubtitle = document.getElementById("share-subtitle");
const shareToast = document.getElementById("share-toast");
let sharePayload = null;
const agencyList = document.getElementById("agency-list");
const agencyName = document.getElementById("agency-name");
const agencySubtitle = document.getElementById("agency-subtitle");
const agencyArtists = document.getElementById("agency-artists");
const debutsList = document.getElementById("debuts-list");
const debutsEmpty = document.getElementById("debuts-empty");
const NEWS_URLS = ["public/news.json", "news.json", "assets/news.json"];
const pagedSections = document.querySelectorAll("[data-page-section]");
const prevButtons = document.querySelectorAll("[data-page-prev]");
const nextButtons = document.querySelectorAll("[data-page-next]");
const pageInfos = document.querySelectorAll("[data-page-info]");

function activateTab(tab) {
  const target = tab.dataset.tab;

  tabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn === tab);
    btn.setAttribute("aria-selected", btn === tab ? "true" : "false");
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === target);
  });
}

function applyFilter(sectionId, company) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const items = section.querySelectorAll("[data-company]");
  items.forEach((item) => {
    const isActive = item.dataset.active !== "false";
    const matches = isActive && (company === "all" || item.dataset.company === company);
    item.classList.toggle("is-hidden", !matches);
  });

  if (sectionId === "comebacks") {
    const visible = section.querySelectorAll(".comeback-card:not(.is-hidden)");
    if (visible.length) {
      setComeback(visible[0]);
    }
  }

  setPage(sectionId, 1);
  renderPage(sectionId);
  updateEmptyState(sectionId, company);
}

function updateEmptyState(sectionId, company) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const visibleItems = section.querySelectorAll("[data-company]:not(.is-hidden)");
  const isEmpty = visibleItems.length === 0;

  if (sectionId === "comebacks" && comebackEmpty) {
    comebackEmpty.textContent =
      company === "all"
        ? "There are currently no Comebacks planned."
        : "There are currently no Comebacks planned for this company.";
    comebackEmpty.classList.toggle("is-hidden", !isEmpty);

    const detail = document.querySelector(".comeback-detail");
    if (detail) {
      detail.classList.toggle("is-hidden", isEmpty);
    }
    if (isEmpty) {
      if (comebackTitle) comebackTitle.textContent = "Select a comeback";
      if (comebackMeta) comebackMeta.textContent = "—";
      if (comebackBody) comebackBody.textContent = "Choose a card to see details here.";
    }
  }

  if (sectionId === "tours" && toursEmpty) {
    toursEmpty.textContent =
      company === "all"
        ? "There are currently no World Tours planned."
        : "There are currently no World Tours planned for this company.";
    toursEmpty.classList.toggle("is-hidden", !isEmpty);
  }
}

function setComeback(card) {
  const title = card.querySelector("h3")?.textContent ?? "Comeback";
  const date = card.querySelector(".date")?.textContent ?? "TBA";
  const metaText = card.querySelector(".meta")?.textContent ?? "Company: TBA";
  const company = metaText.replace("Company:", "").trim();
  const summary = card.querySelector(".entry p")?.textContent ?? "";
  const body = `${summary} Check teasers, tracklist drops, and pre-order notices as they arrive.`.trim();

  const isMobile = window.matchMedia("(max-width: 980px)").matches;

  if (isMobile) {
    const isActive = card.classList.contains("is-active");
    document.querySelectorAll(".comeback-inline").forEach((node) => node.remove());
    comebackCards.forEach((item) => item.classList.remove("is-active"));

    if (isActive) {
      return;
    }

    card.classList.add("is-active");

    const detail = document.createElement("div");
    detail.className = "comeback-inline";
    detail.innerHTML = `
      <div class="news-detail-header">
        <span class="chip">Comeback Detail</span>
        <h3>${title}</h3>
        <p class="meta">${company} · ${date}</p>
      </div>
      <p>${body}</p>
      <div class="news-detail-actions">
        <button class="pill">Set Reminder</button>
        <button class="pill ghost share-btn" data-title="${title}" data-company="${company}" data-date="${date}">Share</button>
      </div>
    `;

    card.appendChild(detail);
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  const isActive = card.classList.contains("is-active");
  comebackCards.forEach((item) => item.classList.remove("is-active"));

  if (isActive) {
    if (comebackTitle) comebackTitle.textContent = "Select a comeback";
    if (comebackMeta) comebackMeta.textContent = "—";
    if (comebackBody) comebackBody.textContent = "Choose a card to see details here.";
    return;
  }

  card.classList.add("is-active");
  if (comebackTitle) comebackTitle.textContent = title;
  if (comebackMeta) comebackMeta.textContent = `${company} · ${date}`;
  if (comebackBody) comebackBody.textContent = body;
  const desktopShare = document.querySelector(".comeback-detail .share-btn");
  if (desktopShare) {
    desktopShare.dataset.title = title;
    desktopShare.dataset.company = company;
    desktopShare.dataset.date = date;
  }
}

filters.forEach((select) => {
  select.addEventListener("change", (event) => {
    const targetSection = event.target.dataset.filter;
    applyFilter(targetSection, event.target.value);
  });
});

const pageState = {
  comebacks: 1,
  tours: 1,
  news: 1,
  debuts: 1,
};

const pageSize = 8;
const newsPageSize = 6;
const debutsPageSize = 8;
let newsItems = [];
let userLocation = null;
let locationDenied = false;

const COMEBACKS_URLS = ["content/comebacks.json", "comebacks.json"];
const TOURS_URLS = ["content/tours.json", "tours.json"];
const DEBUTS_URLS = ["content/debuts.json", "debuts.json"];

let agenciesData = [];
let debutsData = [];

const cityCoords = {
  "Seoul, KR": { lat: 37.5665, lon: 126.978 },
  "Tokyo, JP": { lat: 35.6762, lon: 139.6503 },
  "Los Angeles, CA": { lat: 34.0522, lon: -118.2437 },
  "New York, NY": { lat: 40.7128, lon: -74.006 },
  "London, UK": { lat: 51.5074, lon: -0.1278 },
  "Paris, FR": { lat: 48.8566, lon: 2.3522 },
  "Bangkok, TH": { lat: 13.7563, lon: 100.5018 },
  "Manila, PH": { lat: 14.5995, lon: 120.9842 },
  "Jakarta, ID": { lat: -6.2088, lon: 106.8456 },
  "Sydney, AU": { lat: -33.8688, lon: 151.2093 },
};

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(a, b) {
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function setUserLocationFromCity(city) {
  const coords = cityCoords[city];
  if (coords) {
    userLocation = coords;
  }
}

function requestGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      locationDenied = true;
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        resolve(true);
      },
      () => {
        locationDenied = true;
        resolve(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  });
}

function setPage(sectionId, page) {
  pageState[sectionId] = page;
}

function updatePageInfo(sectionId, currentPage, totalPages) {
  pageInfos.forEach((info) => {
    if (info.dataset.pageInfo === sectionId) {
      info.textContent = `Page ${currentPage} of ${totalPages}`;
    }
  });
}

function renderPage(sectionId) {
  const section = document.querySelector(`[data-page-section=\"${sectionId}\"]`);
  if (!section) return;

  const allItems = Array.from(section.querySelectorAll("[data-company]"));
  const visibleItems = allItems.filter((item) => !item.classList.contains("is-hidden"));
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(pageState[sectionId] || 1, totalPages);
  setPage(sectionId, currentPage);

  visibleItems.forEach((item, index) => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const isOnPage = index >= start && index < end;
    item.classList.toggle("is-hidden-page", !isOnPage);
  });

  allItems
    .filter((item) => item.classList.contains("is-hidden"))
    .forEach((item) => item.classList.add("is-hidden-page"));

  updatePageInfo(sectionId, currentPage, totalPages);
  const filterSelect = document.querySelector(`[data-filter=\"${sectionId}\"]`);
  updateEmptyState(sectionId, filterSelect?.value ?? "all");

  if (sectionId === "comebacks") {
    const firstOnPage = visibleItems.find((item) => !item.classList.contains("is-hidden-page"));
    if (firstOnPage) {
      setComeback(firstOnPage);
    }
  }
}

prevButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionId = button.dataset.pagePrev;
    const current = pageState[sectionId] || 1;
    setPage(sectionId, Math.max(1, current - 1));
    if (sectionId === "news") {
      renderNewsPage();
    } else if (sectionId === "debuts") {
      renderDebutsPage();
    } else {
      renderPage(sectionId);
    }
  });
});

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionId = button.dataset.pageNext;
    const current = pageState[sectionId] || 1;
    setPage(sectionId, current + 1);
    if (sectionId === "news") {
      renderNewsPage();
    } else if (sectionId === "debuts") {
      renderDebutsPage();
    } else {
      renderPage(sectionId);
    }
  });
});


function buildTourDates(card) {
  if (card.querySelector(".tour-expand")) return;
  const title = card.querySelector("h3")?.textContent ?? "Tour";
  let dates = [];

  if (card.dataset.tourDates) {
    try {
      dates = JSON.parse(card.dataset.tourDates);
    } catch {
      dates = [];
    }
  }

  if (!dates.length) {
    dates = [
      { date: "Aug 10, 2026", city: "Seoul, KR", venue: "Olympic Gymnastics Arena" },
      { date: "Aug 22, 2026", city: "Los Angeles, CA", venue: "Kia Forum" },
      { date: "Sep 05, 2026", city: "Tokyo, JP", venue: "Ariake Arena" },
    ];
  }

  const selectedCity = tourCitySelect?.value ?? "auto";

  if (selectedCity !== "auto") {
    dates = dates.filter((show) => show.city === selectedCity);
  } else if (userLocation) {
    dates = [...dates].sort((a, b) => {
      const aCoords = cityCoords[a.city];
      const bCoords = cityCoords[b.city];
      if (!aCoords && !bCoords) return 0;
      if (!aCoords) return 1;
      if (!bCoords) return -1;
      return distanceKm(userLocation, aCoords) - distanceKm(userLocation, bCoords);
    });
  }

  const wrap = document.createElement("div");
  wrap.className = "tour-expand";

  const list = document.createElement("div");
  list.className = "tour-dates";

  if (!dates.length) {
    const empty = document.createElement("div");
    empty.className = "tour-date";
    empty.innerHTML = `
      <div class="tour-date-info">
        <strong>It seems there are no shows in this city.</strong>
        <span>Try another city or use your location.</span>
      </div>
    `;
    list.appendChild(empty);
  } else {
    dates.forEach((show) => {
      const row = document.createElement("div");
      row.className = "tour-date";
      row.innerHTML = `
        <div class="tour-date-info">
          <strong>${show.date}</strong>
          <span>${show.city} · ${show.venue}</span>
        </div>
        <a class="pill" href="https://www.ticketmaster.com/search?q=${encodeURIComponent(
          `${title} ${show.city}`
        )}" target="_blank" rel="noopener">Buy Tix</a>
      `;
      list.appendChild(row);
    });
  }

  wrap.appendChild(list);
  card.appendChild(wrap);
}

async function ensureLocation() {
  if (userLocation || locationDenied) return;
  const wantsAuto = !tourCitySelect || tourCitySelect.value === "auto";
  if (wantsAuto) {
    await requestGeolocation();
  }
}

function refreshExpandedTours() {
  tourCards.forEach((card) => {
    if (card.classList.contains("is-expanded")) {
      const existing = card.querySelector(".tour-expand");
      if (existing) existing.remove();
      buildTourDates(card);
    }
  });
}

async function toggleTour(card) {
  const status = card.querySelector(".chip")?.textContent?.trim().toLowerCase();
  if (status !== "confirmed") {
    card.classList.remove("is-expanded");
    card.setAttribute("aria-expanded", "false");
    return;
  }

  await ensureLocation();
  buildTourDates(card);
  const expanded = card.classList.toggle("is-expanded");
  card.setAttribute("aria-expanded", expanded ? "true" : "false");
}


if (tourCitySelect) {
  tourCitySelect.addEventListener("change", async (event) => {
    const value = event.target.value;
    if (value === "auto") {
      userLocation = null;
      locationDenied = false;
      await requestGeolocation();
    } else {
      setUserLocationFromCity(value);
    }
    refreshExpandedTours();
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab));
});

activateTab(tabs[0]);
filters.forEach((select) => {
  applyFilter(select.dataset.filter, select.value);
});

pagedSections.forEach((section) => {
  renderPage(section.dataset.pageSection);
});


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
  if (!newsList) return;
  newsList.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton";
    newsList.appendChild(skeleton);
  }
}

function showNewsError(message) {
  if (newsStatus) newsStatus.classList.add("is-hidden");
  if (newsError) {
    newsError.textContent = message;
    newsError.classList.remove("is-hidden");
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

async function fetchJson(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch {
      continue;
    }
  }
  return { items: [] };
}

function createNewsCard(item) {
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
  if (!newsList) return;
  newsList.innerHTML = "";
  if (!items.length) {
    showNewsError("No K-pop news found today.");
    return;
  }
  items.forEach((item) => {
    newsList.appendChild(createNewsCard(item));
  });
}

function renderNewsPage() {
  if (!newsList) return;
  const cards = Array.from(newsList.querySelectorAll(".news-card"));
  const totalPages = Math.max(1, Math.ceil(cards.length / newsPageSize));
  const currentPage = Math.min(pageState.news || 1, totalPages);
  setPage("news", currentPage);

  cards.forEach((card, index) => {
    const start = (currentPage - 1) * newsPageSize;
    const end = start + newsPageSize;
    const isOnPage = index >= start && index < end;
    card.classList.toggle("is-hidden-page", !isOnPage);
  });

  updatePageInfo("news", currentPage, totalPages);
}

function renderDebutsPage() {
  if (!debutsList) return;
  const cards = Array.from(debutsList.querySelectorAll(".debut-card"));
  const visibleCards = cards.filter((card) => !card.classList.contains("is-hidden"));
  const totalPages = Math.max(1, Math.ceil(visibleCards.length / debutsPageSize));
  const currentPage = Math.min(pageState.debuts || 1, totalPages);
  setPage("debuts", currentPage);

  visibleCards.forEach((card, index) => {
    const start = (currentPage - 1) * debutsPageSize;
    const end = start + debutsPageSize;
    const isOnPage = index >= start && index < end;
    card.classList.toggle("is-hidden-page", !isOnPage);
  });

  cards
    .filter((card) => card.classList.contains("is-hidden"))
    .forEach((card) => card.classList.add("is-hidden-page"));

  updatePageInfo("debuts", currentPage, totalPages);

  if (debutsEmpty) {
    debutsEmpty.classList.toggle("is-hidden", visibleCards.length !== 0);
  }
}

function renderComebacks(items) {
  if (!comebackList) return;
  comebackList.innerHTML = "";
  items.forEach((item) => {
    const active = item.active !== false;
    const summary = item.summary || "";
    const row = document.createElement("div");
    row.className = "row comeback-card";
    row.dataset.company = item.company || "Unknown";
    row.dataset.active = active ? "true" : "false";
    row.innerHTML = `
      <div class="date">${item.date || "TBA"}</div>
      <div class="entry">
        <h3>${item.title || "Untitled"}</h3>
        <p>${summary}</p>
        ${summary ? '<span class="read-more">Read more</span>' : ""}
        <div class="meta">Company: ${item.companyLabel || item.company || "Unknown"}</div>
      </div>
    `;
    comebackList.appendChild(row);
  });
}

function renderTours(items) {
  if (!tourList) return;
  tourList.innerHTML = "";
  items.forEach((item) => {
    const active = item.active !== false;
    const card = document.createElement("article");
    card.className = "card";
    if (item.highlight) card.classList.add("highlight");
    card.dataset.company = item.company || "Unknown";
    card.dataset.active = active ? "true" : "false";
    if (item.dates && Array.isArray(item.dates)) {
      card.dataset.tourDates = JSON.stringify(item.dates);
    }
    card.innerHTML = `
      <span class="chip">${item.status || "Announced"}</span>
      <h3>${item.title || "Untitled Tour"}</h3>
      <p>${item.summary || ""}</p>
      <div class="meta">Company: ${item.companyLabel || item.company || "Unknown"}${item.metaSuffix ? ` · ${item.metaSuffix}` : ""}</div>
    `;
    tourList.appendChild(card);
  });
}

function wireDynamicCards() {
  comebackCards = document.querySelectorAll(".comeback-card");
  comebackCards.forEach((card) => {
    card.addEventListener("click", () => setComeback(card));
  });

  tourCards = document.querySelectorAll("#tours .card");
  tourCards.forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-expanded", "false");
    card.addEventListener("click", () => toggleTour(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleTour(card);
      }
    });
  });
}

function openShareModal(payload) {
  if (!shareModal) return;
  sharePayload = payload;
  if (shareSubtitle) {
    shareSubtitle.textContent = `${payload.title} · ${payload.company} · ${payload.date}`;
  }
  if (shareToast) shareToast.classList.add("is-hidden");
  shareModal.classList.remove("is-hidden");
}

function closeShareModal() {
  if (!shareModal) return;
  shareModal.classList.add("is-hidden");
  sharePayload = null;
}

function shareUrl() {
  const base = `${window.location.origin}${window.location.pathname}`;
  const slug = sharePayload?.title ? encodeURIComponent(sharePayload.title) : "";
  return `${base}#comeback=${slug}`;
}

async function copyShareLink() {
  const url = shareUrl();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = url;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  if (shareToast) {
    shareToast.textContent = "Link copied.";
    shareToast.classList.remove("is-hidden");
  }
}

if (shareModal) {
  shareModal.addEventListener("click", (event) => {
    if (event.target === shareModal) closeShareModal();
  });
  const closeBtn = shareModal.querySelector(".modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeShareModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeShareModal();
  });
  shareModal.addEventListener("click", (event) => {
    const button = event.target.closest("[data-share]");
    if (!button || !sharePayload) return;
    const url = shareUrl();
    const text = encodeURIComponent(`${sharePayload.title} (${sharePayload.company})`);
    const network = button.dataset.share;

    if (network === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, "_blank");
      return;
    }
    if (network === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
      return;
    }
    if (network === "instagram") {
      copyShareLink().then(() => window.open("https://www.instagram.com/", "_blank"));
      return;
    }
    if (network === "tiktok") {
      copyShareLink().then(() => window.open("https://www.tiktok.com/", "_blank"));
      return;
    }
    if (network === "copy") {
      copyShareLink();
    }
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".share-btn");
  if (!button) return;
  const payload = {
    title: button.dataset.title || "Comeback",
    company: button.dataset.company || "Company",
    date: button.dataset.date || "TBA",
  };
  openShareModal(payload);
});

async function initNews() {
  if (!newsList) return;
  renderSkeletons();
  try {
    const data = await fetchNews();
    if (newsStatus) newsStatus.classList.add("is-hidden");
    newsItems = data.items || [];
    renderNews(newsItems);
    setPage("news", 1);
    renderNewsPage();
  } catch (error) {
    showNewsError("News unavailable right now. Please try again later.");
    console.error(error);
  }
}

initNews();

async function initContent() {
  const comebacksData = await fetchJson(COMEBACKS_URLS);
  const toursData = await fetchJson(TOURS_URLS);

  renderComebacks(comebacksData.items || []);
  renderTours(toursData.items || []);
  wireDynamicCards();

  const comebackFilter = document.querySelector('[data-filter="comebacks"]');
  applyFilter("comebacks", comebackFilter?.value ?? "all");
  renderPage("comebacks");
  updateEmptyState("comebacks", comebackFilter?.value ?? "all");

  const tourFilter = document.querySelector('[data-filter="tours"]');
  applyFilter("tours", tourFilter?.value ?? "all");
  renderPage("tours");
  updateEmptyState("tours", tourFilter?.value ?? "all");
}

initContent();

function renderAgencies() {
  if (!agencyList || !agencyArtists || !agencyName || !agencySubtitle) return;
  agencyList.innerHTML = "";

  agenciesData.forEach((agency, index) => {
    const card = document.createElement("div");
    card.className = "agency-card";
    card.innerHTML = `
      <h3>${agency.name}</h3>
      <p class="meta">${agency.description}</p>
    `;
    card.addEventListener("click", () => setAgency(index));
    agencyList.appendChild(card);
  });
}

function setAgency(index) {
  const agency = agenciesData[index];
  if (!agency) return;
  agencyName.textContent = agency.name;
  agencySubtitle.textContent = agency.description;
  agencyArtists.innerHTML = "";

  const cards = agencyList.querySelectorAll(".agency-card");
  cards.forEach((card, i) => card.classList.toggle("is-active", i === index));

  (agency.artists || []).forEach((artist) => {
    const artistCard = document.createElement("div");
    artistCard.className = "artist-card";
    artistCard.innerHTML = `
      <strong>${artist.name}</strong>
      <div class="member-list is-hidden">${(artist.members || []).join(", ")}</div>
    `;
    artistCard.addEventListener("click", (event) => {
      event.stopPropagation();
      const list = artistCard.querySelector(".member-list");
      const isHidden = list.classList.toggle("is-hidden");
      artistCard.classList.toggle("is-active", !isHidden);
    });
    agencyArtists.appendChild(artistCard);
  });
}

function renderDebuts() {
  if (!debutsList) return;
  debutsList.innerHTML = "";
  debutsData.forEach((debut) => {
    const active = debut.active !== false;
    const card = document.createElement("div");
    card.className = "debut-card";
    card.dataset.active = active ? "true" : "false";
    if (!active) {
      card.classList.add("is-hidden");
    }
    card.innerHTML = `
      <span class="debut-tag">${debut.type}</span>
      <h3>${debut.name}</h3>
      <p>${debut.teasers}</p>
      <div class="meta">${debut.agency} · ${debut.date}</div>
    `;
    debutsList.appendChild(card);
  });
}

async function initAgencies() {
  const data = await fetchJson(["content/agencies.json", "agencies.json"]);
  agenciesData = data.items || [];
  renderAgencies();
  if (agenciesData.length) {
    setAgency(0);
  }
}

initAgencies();

async function initDebuts() {
  const data = await fetchJson(DEBUTS_URLS);
  debutsData = data.items || [];
  renderDebuts();
  setPage("debuts", 1);
  renderDebutsPage();
}

initDebuts();
