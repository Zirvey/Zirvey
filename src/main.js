import "./style.css";
import { caseStudies } from "./case-studies.js";
import {
  initSmoothScroll,
  initHeroScrollCard,
  initRollingText,
  initScrollColorText,
  initNavBehavior,
} from "./animations.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ── Light / dark theme ── */
const themeToggle = document.getElementById("theme-toggle");
const THEME_KEY = "theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  themeToggle?.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
  themeToggle?.setAttribute("title", isDark ? "Light mode" : "Dark mode");
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

applyTheme(
  getStoredTheme() ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
);

themeToggle?.addEventListener("click", toggleTheme);

/* ── Page load fade-in ── */
document.body.classList.add("is-loading");
requestAnimationFrame(() => {
  document.body.classList.remove("is-loading");
  document.body.classList.add("is-ready");
});

/* ── Majd-style animations ── */
const lenis = initSmoothScroll();
initHeroScrollCard(lenis);
initRollingText();
initScrollColorText();

const siteHeader = document.getElementById("site-header");
initNavBehavior(siteHeader, lenis);

/* ── Full-screen menu overlay ── */
const menuToggle = document.getElementById("menu-toggle");
const menuClose = document.getElementById("menu-close");
const menuOverlay = document.getElementById("menu-overlay");

function openMenu() {
  if (!menuOverlay) return;
  menuOverlay.setAttribute("aria-hidden", "false");
  menuToggle?.setAttribute("aria-expanded", "true");
  menuToggle?.setAttribute("aria-label", "Close menu");
  document.body.classList.add("menu-open");
}

function closeMenu() {
  if (!menuOverlay) return;
  menuOverlay.setAttribute("aria-hidden", "true");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Open menu");
  document.body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuOverlay?.getAttribute("aria-hidden") === "false";
  if (isOpen) closeMenu();
  else openMenu();
});

menuClose?.addEventListener("click", closeMenu);

menuOverlay?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMenu();
    closeCaseStudy();
  }
});

/* ── Hero line stagger (bio lines) ── */
if (!prefersReducedMotion.matches) {
  document.querySelectorAll(".hero-line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("is-visible"), 200 + i * 100);
  });
} else {
  document.querySelectorAll(".hero-line-inner").forEach((el) => {
    el.classList.add("is-visible");
  });
}

/* ── Scroll reveal ── */
if (!prefersReducedMotion.matches) {
  const revealElements = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
  );

  revealElements.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 60, 300)}ms`;
    observer.observe(el);
  });
} else {
  document.querySelectorAll(".reveal").forEach((el) => {
    el.classList.add("is-visible");
  });
}

/* ── Work filters ── */
const filterBtns = document.querySelectorAll(".filter-btn");
const projectCards = document.querySelectorAll(".project-card");

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter;
    filterBtns.forEach((b) => {
      b.classList.toggle("is-active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });

    projectCards.forEach((card) => {
      const category = card.dataset.category;
      const show = filter === "all" || category === filter;
      card.classList.toggle("is-hidden", !show);
    });
  });
});

/* ── Case study modal ── */
const modalRoot = document.getElementById("case-modal");
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;

function openCaseStudy(id) {
  const data = caseStudies[id];
  if (!data || !modalRoot) return;

  const isProduct = data.kind === "product";
  const isTool = data.kind === "tool";
  const isBuilder = isProduct || isTool;
  const placeholder = assetUrl("projects/private-placeholder.svg");

  const previewSrc = data.afterImage?.startsWith("http")
    ? data.afterImage
    : assetUrl(data.afterImage);

  const visualSection =
    isProduct && data.afterImage
      ? `<div class="mb-6">
        <div class="ba-card overflow-hidden">
          <p class="ba-label">Product preview</p>
          <img src="${previewSrc}" alt="${data.title} product interface" class="w-full object-cover object-top" loading="lazy" />
        </div>
      </div>`
      : isProduct || isTool
        ? `<div class="mb-6">
        <div class="ba-card overflow-hidden">
          <p class="ba-label">${isTool ? "Automation tool" : "Private product"}</p>
          <img src="${placeholder}" alt="" class="w-full object-cover" loading="lazy" />
          ${data.private ? `<p class="border-t border-border px-4 py-3 text-center text-xs text-muted">Source code is private — project details available on request</p>` : ""}
        </div>
      </div>`
        : `<div class="before-after mb-6">
        <div class="ba-card">
          <p class="ba-label">Before — Original site</p>
          <a href="${data.official}" target="_blank" rel="noopener noreferrer" class="block cursor-pointer">
            <img src="${assetUrl(data.beforeImage)}" alt="${data.title} original website" class="w-full object-cover object-top" loading="lazy" />
          </a>
          <p class="border-t border-border px-3 py-2 text-center text-xs text-muted">
            <a href="${data.official}" target="_blank" rel="noopener noreferrer" class="hover:underline">${new URL(data.official).hostname} ↗</a>
          </p>
        </div>
        <div class="ba-card">
          <p class="ba-label">After — My redesign</p>
          <img src="${data.afterImage}" alt="${data.title} concept preview" class="w-full object-cover object-top" loading="lazy" />
        </div>
      </div>`;

  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-panel">
        <div class="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <p class="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted">${data.type}</p>
            <h2 id="modal-title" class="font-heading text-xl font-semibold sm:text-2xl">${data.title}</h2>
            <div class="mt-2 flex flex-wrap gap-2">
              ${data.tags.map((t) => `<span class="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">${t}</span>`).join("")}
            </div>
          </div>
          <button type="button" class="modal-close cursor-pointer rounded-lg border border-border p-2 text-muted transition-colors hover:text-text" aria-label="Close case study">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="overflow-y-auto p-5 sm:p-6">
          ${visualSection}

          <div class="space-y-5 text-sm leading-relaxed">
            ${data.role ? `<p class="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted"><strong class="text-text">My role:</strong> ${data.role}</p>` : ""}

            <div>
              <h3 class="mb-2 font-heading text-base font-semibold text-text">${isBuilder ? "Problem" : "Challenge"}</h3>
              <p class="text-muted">${data.challenge}</p>
            </div>

            <div>
              <h3 class="mb-2 font-heading text-base font-semibold text-text">${isBuilder ? "What I built" : "Approach"}</h3>
              <ul class="space-y-2 text-muted">
                ${data.approach.map((item) => `<li class="flex gap-2"><span class="text-text/60">→</span><span>${item}</span></li>`).join("")}
              </ul>
            </div>

            <div>
              <h3 class="mb-2 font-heading text-base font-semibold text-text">Results</h3>
              <ul class="space-y-2 text-muted">
                ${data.results.map((item) => `<li class="flex gap-2"><span class="text-text/60">✓</span><span>${item}</span></li>`).join("")}
              </ul>
            </div>

            <p class="text-xs text-muted"><strong class="text-text">Stack:</strong> ${data.stack}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 border-t border-border p-5 sm:p-6">
          ${data.demo ? `<a href="${data.demo}" target="_blank" rel="noopener noreferrer" class="btn-primary text-xs">Live demo</a>` : ""}
          ${data.github ? `<a href="${data.github}" target="_blank" rel="noopener noreferrer" class="btn-ghost text-xs">GitHub</a>` : ""}
          ${data.official ? `<a href="${data.official}" target="_blank" rel="noopener noreferrer" class="btn-ghost text-xs">Original site</a>` : ""}
          ${data.private && !data.demo ? `<a href="#contact" class="btn-primary text-xs modal-close-link">Request details</a>` : ""}
        </div>
      </div>
    </div>
  `;

  document.body.style.overflow = "hidden";
  modalRoot.querySelector(".modal-close")?.addEventListener("click", closeCaseStudy);
  modalRoot.querySelector(".modal-close-link")?.addEventListener("click", closeCaseStudy);
  modalRoot.querySelector(".modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCaseStudy();
  });
}

function closeCaseStudy() {
  if (modalRoot) modalRoot.innerHTML = "";
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-case-study]").forEach((btn) => {
  btn.addEventListener("click", () => openCaseStudy(btn.dataset.caseStudy));
});

/* ── Project hover scroll videos ── */
function initProjectHoverVideos() {
  if (prefersReducedMotion.matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll("[data-hover-video]").forEach((wrap) => {
    const rawSrc = wrap.dataset.hoverVideo?.trim();
    if (!rawSrc) return;

    const frame = wrap.closest(".project-frame");
    if (!frame) return;

    const src = rawSrc.startsWith("http")
      ? rawSrc
      : assetUrl(rawSrc.replace(/^\//, ""));

    let video = null;
    let unavailable = false;

    const ensureVideo = () => {
      if (video) return video;
      video = document.createElement("video");
      video.className = "project-preview-video";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("error", () => {
        unavailable = true;
        wrap.classList.remove("is-playing");
        video?.remove();
        video = null;
      });
      wrap.appendChild(video);
      return video;
    };

    const play = () => {
      if (unavailable) return;
      const v = ensureVideo();
      if (!v.src) v.src = src;
      const start = () => {
        wrap.classList.add("is-playing");
        v.play().catch(() => wrap.classList.remove("is-playing"));
      };
      if (v.readyState >= 2) start();
      else v.addEventListener("loadeddata", start, { once: true });
      if (v.readyState < 2) v.load();
    };

    const stop = () => {
      wrap.classList.remove("is-playing");
      if (!video) return;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore seek errors before metadata */
      }
    };

    frame.addEventListener("pointerenter", play);
    frame.addEventListener("pointerleave", stop);
    frame.addEventListener("focusin", play);
    frame.addEventListener("focusout", (e) => {
      if (!frame.contains(e.relatedTarget)) stop();
    });
  });
}

initProjectHoverVideos();
