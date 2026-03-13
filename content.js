(() => {
  "use strict";

  const STORAGE_KEY = "antiig_enabled";
  const HIDDEN_ATTR = "data-antiig-hidden";
  const CUTOFF_ATTR = "data-antiig-cutoff";
  let enabled = true;

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    enabled = result[STORAGE_KEY] !== false;
    if (enabled) scheduleFilter();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "toggle") {
      enabled = msg.enabled;
      if (enabled) {
        scheduleFilter();
      } else {
        unhideAll();
      }
    }
  });

  // --- Detection ---

  const confirmed = new WeakSet();

  function isSuggestedPost(article) {
    const headerArea = article.querySelector("header");
    if (!headerArea) return null;

    for (const span of headerArea.querySelectorAll("span")) {
      const text = span.textContent.trim().toLowerCase();
      if (text === "suggested for you" || text === "suggested") return true;
    }

    for (const btn of headerArea.querySelectorAll('button, div[role="button"]')) {
      const text = btn.textContent.trim().toLowerCase();
      if (text === "follow") return true;
    }

    for (const span of article.querySelectorAll("span")) {
      const text = span.textContent.trim().toLowerCase();
      if (text === "sponsored") return true;
    }

    return false;
  }

  function isSuggestedSection(el) {
    if (/suggested for you/i.test(el.textContent || "")) {
      if (el.querySelectorAll('a[href*="/"]').length >= 3) return true;
    }
    return false;
  }

  function isExploreInjection(el) {
    return /suggested reels/i.test(el.textContent || "");
  }

  // --- Hiding ---

  function hideElement(el) {
    el.setAttribute(HIDDEN_ATTR, "");
  }

  function unhideAll() {
    document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((el) => {
      el.removeAttribute(HIDDEN_ATTR);
    });
    document.querySelectorAll(`[${CUTOFF_ATTR}]`).forEach((el) => {
      el.removeAttribute(CUTOFF_ATTR);
    });
    document.querySelectorAll("[data-antiig-nav-hidden]").forEach((el) => {
      el.removeAttribute("data-antiig-nav-hidden");
    });
    cutoffNode = null;
  }

  // --- Cutoff: everything after "Suggested Posts" heading gets hidden ---

  let cutoffNode = null;

  function findCutoff() {
    if (cutoffNode) return;

    for (const el of document.querySelectorAll("h3")) {
      const text = el.textContent.trim().toLowerCase();
      if (text === "suggested posts") {
        // Mark the heading's container for CSS hiding
        let container = el;
        for (let i = 0; i < 3 && container.parentElement; i++) {
          container = container.parentElement;
        }
        container.setAttribute(CUTOFF_ATTR, "");
        cutoffNode = container;
        return;
      }
    }
  }

  function isAfterCutoff(el) {
    if (!cutoffNode) return false;
    // DOCUMENT_POSITION_FOLLOWING (4) means el comes after cutoffNode
    const pos = cutoffNode.compareDocumentPosition(el);
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  }

  // --- Filtering ---

  function runFilter() {
    if (!enabled) return;

    findCutoff();

    for (const article of document.querySelectorAll("article")) {
      if (article.hasAttribute(HIDDEN_ATTR)) continue;
      if (confirmed.has(article)) continue;

      // Skip articles inside modals/dialogs (post detail view)
      if (article.closest('div[role="dialog"], div[role="presentation"]')) {
        confirmed.add(article);
        continue;
      }

      // Everything after the cutoff is suggested content
      if (isAfterCutoff(article)) {
        hideElement(article);
        continue;
      }

      const result = isSuggestedPost(article);
      if (result === true) {
        hideElement(article);
      } else if (result === false) {
        confirmed.add(article);
      }
    }

    // Suggested account rows in feed
    const mainFeed = document.querySelector("main");
    if (mainFeed) {
      for (const section of mainFeed.querySelectorAll(":scope > div > div > div")) {
        if (confirmed.has(section)) continue;
        if (section.hasAttribute(HIDDEN_ATTR)) continue;
        if (isSuggestedSection(section) || isExploreInjection(section)) {
          hideElement(section);
        } else {
          confirmed.add(section);
        }
      }
    }

    // Sidebar suggestions
    for (const aside of document.querySelectorAll("aside, div[role='complementary']")) {
      if (confirmed.has(aside)) continue;
      if (aside.hasAttribute(HIDDEN_ATTR)) continue;
      if (/suggested for you/i.test(aside.textContent || "")) {
        hideElement(aside);
      }
    }

    // Explore/Reels pages
    if (
      location.pathname.startsWith("/explore") ||
      location.pathname.startsWith("/reels")
    ) {
      const main = document.querySelector("main");
      if (main) hideElement(main);
    }

    // Hide "Explore" and "From Meta" nav links in the left sidebar
    filterNavLinks();
  }

  const NAV_HIDE_LABELS = ["explore", "threads", "from meta"];

  function filterNavLinks() {
    for (const link of document.querySelectorAll('nav a[href]')) {
      if (link.hasAttribute("data-antiig-nav-hidden")) continue;
      const text = link.textContent.trim().toLowerCase();
      if (NAV_HIDE_LABELS.some((label) => text === label)) {
        link.setAttribute("data-antiig-nav-hidden", "");
      }
    }
  }

  // --- Debounced scheduling ---

  let rafId = null;

  function scheduleFilter() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      runFilter();
    });
  }

  // --- Observer ---

  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        scheduleFilter();
        return;
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  scheduleFilter();
})();
