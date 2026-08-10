import "./style.css";
import data from "./resume-data.json";
import { initSmoothScroll, initNavBehavior } from "./animations.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const I18N = {
  en: {
    kicker: "Resume",
    summary: "Summary",
    achievements: "Key achievements",
    skills: "Technical skills",
    competencies: "Core competencies",
    experience: "Professional experience",
    projects: "Projects",
    education: "Education",
    languages: "Languages",
    rolesLabel: "Version",
  },
  ru: {
    kicker: "Резюме",
    summary: "О себе",
    achievements: "Ключевые достижения",
    skills: "Технические навыки",
    competencies: "Ключевые компетенции",
    experience: "Опыт работы",
    projects: "Проекты",
    education: "Образование",
    languages: "Языки",
    rolesLabel: "Версия",
  },
};

const ICON_SVGS = {
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.7c-.5-.3-1.2-.3-1.7 0L6.8 6.2C6.4 6.5 6 7.1 6 7.7v6.6c0 .6.4 1.2.8 1.5l6.3 3.7c.5.3 1.2.3 1.7 0l6.3-3.7c.5-.3.9-.9.9-1.5Z"/><path d="M10.1 4.5 16 8v5"/><path d="m7 11 6 3.4V19"/><path d="M3.5 12.5 10 16"/><path d="M20.5 8.5 14 12"/></svg>`,
  server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><path d="M6 6h.01M6 18h.01"/></svg>`,
  headset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`,
};

function getParams() {
  const params = new URLSearchParams(window.location.search);
  const role =
    params.get("role") ||
    localStorage.getItem("resume-role") ||
    data.roles[0]?.id ||
    "uiux";
  const lang =
    params.get("lang") ||
    localStorage.getItem("resume-lang") ||
    "en";
  const validRole = data.roles.some((r) => r.id === role) ? role : data.roles[0].id;
  const validLang = lang === "ru" ? "ru" : "en";
  return { role: validRole, lang: validLang };
}

function setParams(role, lang, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set("role", role);
  url.searchParams.set("lang", lang);
  history[replace ? "replaceState" : "pushState"]({}, "", url);
  localStorage.setItem("resume-role", role);
  localStorage.setItem("resume-lang", lang);
}

function applyThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const root = document.documentElement;
  const sync = () => {
    const dark = root.getAttribute("data-theme") === "dark";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.title = dark ? "Light mode" : "Dark mode";
  };
  sync();
  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    localStorage.setItem("theme", next);
    sync();
  });
}

function linkifyPortfolio(text) {
  const url = data.contact.portfolio;
  if (!url || !text.includes(url)) return escapeHtml(text);
  const parts = text.split(url);
  return parts
    .map((part, i) =>
      i < parts.length - 1
        ? `${escapeHtml(part)}<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
        : escapeHtml(part),
    )
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderI18n(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  document.title =
    lang === "ru"
      ? "Temirlan Kakishev — Резюме"
      : "Temirlan Kakishev — Resume";
}

const ROLE_SHORT = {
  uiux: "UI/UX",
  devops: "DevOps",
  sysadmin: "SysAdmin",
  helpdesk: "Helpdesk",
};

function renderContact(lang) {
  const c = data.contact;
  const location = c.location[lang] || c.location.en;
  const root = document.getElementById("resume-contact");
  const chips = [
    { text: location },
    { text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    { text: c.email, href: `mailto:${c.email}` },
    { text: "LinkedIn", href: c.linkedin, external: true },
    { text: "GitHub", href: c.github, external: true },
    { text: "Portfolio", href: c.portfolio, external: true },
  ];
  root.innerHTML = chips
    .map((chip) => {
      if (chip.href) {
        const ext = chip.external
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
        return `<a class="resume-contact-chip" href="${chip.href}"${ext}>${escapeHtml(chip.text)}</a>`;
      }
      return `<span class="resume-contact-chip">${escapeHtml(chip.text)}</span>`;
    })
    .join("");
}

function renderRoles(activeRole, lang) {
  const nav = document.getElementById("resume-roles");
  nav.innerHTML = data.roles
    .map((role) => {
      const active = role.id === activeRole ? "is-active" : "";
      const label = role.label[lang] || role.label.en;
      const short = ROLE_SHORT[role.id] || label;
      const icon = ICON_SVGS[role.icon] || ICON_SVGS.server;
      return `
        <button
          type="button"
          class="resume-role-btn ${active}"
          data-role="${role.id}"
          aria-pressed="${role.id === activeRole}"
          aria-label="${escapeHtml(label)}"
          title="${escapeHtml(label)}"
        >
          <span class="resume-role-icon">${icon}</span>
          <span>${escapeHtml(short)}</span>
        </button>
      `;
    })
    .join("");
}

function section(title, bodyHtml) {
  if (!bodyHtml) return "";
  return `
    <section class="resume-block">
      <h2 class="resume-block-title">${escapeHtml(title)}</h2>
      ${bodyHtml}
    </section>
  `;
}

function formatSkill(skill) {
  const idx = skill.indexOf(":");
  if (idx > 0) {
    return `<li><strong>${escapeHtml(skill.slice(0, idx))}</strong>${escapeHtml(skill.slice(idx))}</li>`;
  }
  return `<li>${escapeHtml(skill)}</li>`;
}

function parseJobTitle(title) {
  const parts = title.split("|").map((p) => p.trim());
  const dates = parts.length > 1 ? parts.slice(1).join(" · ") : "";
  const main = parts[0] || title;
  const sep = main.includes(" — ") ? " — " : main.includes(" – ") ? " – " : null;
  if (sep) {
    const [role, ...rest] = main.split(sep);
    return { role: role.trim(), company: rest.join(sep).trim(), dates };
  }
  return { role: main, company: "", dates };
}

function renderContent(roleId, lang) {
  const cv = data.resumes[roleId]?.[lang] || data.resumes[roleId]?.en;
  if (!cv) return;
  const t = I18N[lang];

  document.getElementById("resume-position").textContent = cv.position;

  const achievements = cv.achievements?.length
    ? `<ul class="resume-list">${cv.achievements.map((a) => `<li>${linkifyPortfolio(a)}</li>`).join("")}</ul>`
    : "";
  const skills = cv.skills?.length
    ? `<ul class="resume-skills">${cv.skills.map(formatSkill).join("")}</ul>`
    : "";
  const competencies = cv.competencies?.length
    ? `<ul class="resume-tags">${cv.competencies.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
    : "";
  const experience = (cv.experience || [])
    .map((job) => {
      const { role, company, dates } = parseJobTitle(job.title);
      const meta = [company, dates].filter(Boolean).join(" · ");
      return `
      <article class="resume-job">
        <header class="resume-job-head">
          <h3>${escapeHtml(role)}</h3>
          ${meta ? `<p class="resume-job-meta">${escapeHtml(meta)}</p>` : ""}
        </header>
        <ul class="resume-list">${(job.bullets || []).map((b) => `<li>${linkifyPortfolio(b)}</li>`).join("")}</ul>
      </article>`;
    })
    .join("");
  const projects = (cv.projects || [])
    .map(
      (p) => `
      <article class="resume-project">
        <h3>${escapeHtml(p.title)}</h3>
        <p>${linkifyPortfolio(p.detail)}</p>
      </article>`,
    )
    .join("");
  const education = cv.education
    ? `<p class="resume-edu-school">${escapeHtml(cv.education.school)}</p>
       <p class="resume-edu-details">${escapeHtml(cv.education.details)}</p>`
    : "";
  const languages = (cv.languages || [])
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");

  const eduLang =
    education || languages
      ? `<div class="resume-split">
          ${education ? section(t.education, education) : ""}
          ${
            languages
              ? section(t.languages, `<ul class="resume-tags">${languages}</ul>`)
              : ""
          }
        </div>`
      : "";

  document.getElementById("resume-content").innerHTML = [
    section(t.summary, `<p class="resume-summary">${linkifyPortfolio(cv.summary)}</p>`),
    section(t.achievements, achievements),
    section(t.skills, skills),
    section(t.competencies, competencies),
    section(t.experience, experience),
    section(t.projects, projects),
    eduLang,
  ].join("");

  const blocks = document.querySelectorAll("#resume-content .resume-block");
  if (prefersReducedMotion.matches) {
    blocks.forEach((el) => el.classList.add("is-visible"));
  } else {
    blocks.forEach((el, i) => {
      el.style.transitionDelay = `${i * 55}ms`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add("is-visible"));
      });
    });
  }
}

function render() {
  const { role, lang } = getParams();
  setParams(role, lang, true);
  renderI18n(lang);
  renderContact(lang);
  renderRoles(role, lang);
  renderContent(role, lang);

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    const on = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
}

function renderKeepingScroll(lenis) {
  const y = lenis?.scroll ?? window.scrollY;
  render();
  requestAnimationFrame(() => {
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  });
}

function initMenu() {
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
    if (e.key === "Escape") closeMenu();
  });
}

function init() {
  document.body.classList.remove("is-loading");
  document.body.classList.add("is-ready");

  const lenis = initSmoothScroll();
  const siteHeader = document.getElementById("site-header");
  initNavBehavior(siteHeader, lenis);
  initMenu();

  applyThemeToggle();
  render();

  document.getElementById("resume-roles")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-role]");
    if (!btn) return;
    const { lang } = getParams();
    setParams(btn.dataset.role, lang);
    renderKeepingScroll(lenis);
  });

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { role } = getParams();
      setParams(role, btn.dataset.lang);
      renderKeepingScroll(lenis);
    });
  });

  window.addEventListener("popstate", () => renderKeepingScroll(lenis));
}

init();
