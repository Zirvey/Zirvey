import "./style.css";
import { caseStudies } from "./case-studies.js";

/* ── Page load fade-in ── */
document.body.classList.add("is-loading");
requestAnimationFrame(() => {
  document.body.classList.remove("is-loading");
  document.body.classList.add("is-ready");
});

/* ── Mobile menu ── */
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = !mobileMenu.classList.contains("hidden");
    mobileMenu.classList.toggle("hidden");
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open menu" : "Close menu");
    mobileMenu.setAttribute("aria-hidden", String(isOpen));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
      mobileMenu.setAttribute("aria-hidden", "true");
    });
  });
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ── Navbar shrink on scroll ── */
const siteHeader = document.getElementById("site-header");
if (siteHeader) {
  const onScroll = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ── Hero text stagger ── */
if (!prefersReducedMotion.matches) {
  document.querySelectorAll(".hero-line-inner").forEach((el, i) => {
    setTimeout(() => el.classList.add("is-visible"), 120 + i * 90);
  });
} else {
  document.querySelectorAll(".hero-line-inner").forEach((el) => {
    el.classList.add("is-visible");
  });
}

/* ── Counter animation ── */
function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || "";
  if (Number.isNaN(target)) return;

  if (prefersReducedMotion.matches) {
    el.textContent = target + suffix;
    return;
  }

  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

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
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealElements.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 50, 250)}ms`;
    observer.observe(el);
  });
} else {
  document.querySelectorAll(".reveal").forEach((el) => {
    el.classList.add("is-visible");
  });
}

/* ── Active nav link ── */
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

if (sections.length && navLinks.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("text-accent", isActive);
            link.classList.toggle("text-muted", !isActive);
          });
        }
      });
    },
    { threshold: 0.35, rootMargin: "-20% 0px -60% 0px" }
  );

  sections.forEach((section) => sectionObserver.observe(section));
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

  const visualSection = isProduct && data.afterImage
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
          ${data.private ? `<p class="border-t border-border/40 px-4 py-3 text-center text-xs text-muted">Source code is private — project details available on request</p>` : ""}
        </div>
      </div>`
    : `<div class="before-after mb-6">
        <div class="ba-card">
          <p class="ba-label">Before — Original site</p>
          <a href="${data.official}" target="_blank" rel="noopener noreferrer" class="block cursor-pointer">
            <img src="${assetUrl(data.beforeImage)}" alt="${data.title} original website" class="w-full object-cover object-top" loading="lazy" />
          </a>
          <p class="border-t border-border/40 px-3 py-2 text-center text-xs text-muted">
            <a href="${data.official}" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">${new URL(data.official).hostname} ↗</a>
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
        <div class="flex items-start justify-between gap-4 border-b border-border/40 p-5 sm:p-6">
          <div>
            <p class="section-label mb-1">${data.type}</p>
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
            ${data.role ? `<p class="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted"><strong class="text-accent">My role:</strong> ${data.role}</p>` : ""}

            <div>
              <h3 class="mb-2 font-heading text-base font-semibold text-text">${isBuilder ? "Problem" : "Challenge"}</h3>
              <p class="text-muted">${data.challenge}</p>
            </div>

            <div>
              <h3 class="mb-2 font-heading text-base font-semibold text-text">${isBuilder ? "What I built" : "Approach"}</h3>
              <ul class="space-y-2 text-muted">
                ${data.approach.map((item) => `<li class="flex gap-2"><span class="text-accent">→</span><span>${item}</span></li>`).join("")}
              </ul>
            </div>

            <div>
              <h3 class="mb-2 font-heading text-base font-semibold text-text">Results</h3>
              <ul class="space-y-2 text-muted">
                ${data.results.map((item) => `<li class="flex gap-2"><span class="text-accent">✓</span><span>${item}</span></li>`).join("")}
              </ul>
            </div>

            <p class="text-xs text-muted"><strong class="text-text">Stack:</strong> ${data.stack}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-3 border-t border-border/40 p-5 sm:p-6">
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCaseStudy();
});

/* ── Parallax blobs ── */
if (!prefersReducedMotion.matches) {
  const blobs = document.querySelectorAll("[data-parallax]");
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      blobs.forEach((blob) => {
        const speed = parseFloat(blob.dataset.parallax) || 0.15;
        blob.style.transform = `translateY(${y * speed}px)`;
      });
    },
    { passive: true }
  );
}
