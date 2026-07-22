import Lenis from "lenis";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Lenis smooth scroll — Majd Smooth Scroll component */
export function initSmoothScroll() {
  if (prefersReducedMotion.matches) return null;
  /* Native touch scroll is more reliable for the portrait morph on phones */
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return null;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  document.documentElement.classList.add("lenis", "lenis-smooth");

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  });

  return lenis;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Hero portrait — scroll-linked flip & land in bio (Majd-style) */
export function initHeroScrollCard(lenis) {
  const hero = document.getElementById("hero-section");
  const card = hero?.querySelector(".hero-portrait-card");
  const bioSlot = document.querySelector("[data-bio-portrait-slot]");
  if (!hero || !card || !bioSlot) return;

  document.documentElement.classList.add("has-hero-portrait-scroll");

  if (prefersReducedMotion.matches) {
    hero.style.setProperty("--hero-title-y", "0px");
    bioSlot.classList.add("is-landed");
    card.classList.add("is-settled");
    return;
  }

  const isCoarse =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.matchMedia("(max-width: 639px)").matches;

  let metrics = null;
  let ticking = false;

  const viewportHeight = () =>
    window.visualViewport?.height || window.innerHeight;

  const measure = () => {
    const wasFloating = card.classList.contains("is-floating");
    const prev = card.style.cssText;
    card.classList.remove("is-floating");
    card.style.cssText = "";

    const startRect = card.getBoundingClientRect();
    const startDoc = {
      left: startRect.left + window.scrollX,
      top: startRect.top + window.scrollY,
      width: startRect.width,
      height: startRect.height,
      radius: parseFloat(getComputedStyle(card).borderRadius) || 16,
    };

    card.style.cssText = prev;
    if (wasFloating) card.classList.add("is-floating");

    const bioRect = bioSlot.getBoundingClientRect();
    const endDoc = {
      left: bioRect.left + window.scrollX,
      top: bioRect.top + window.scrollY,
      width: bioRect.width,
      height: bioRect.height,
      radius: parseFloat(getComputedStyle(bioSlot).borderRadius) || 28,
    };

    metrics = { startDoc, endDoc };
  };

  const clearFloatingStyles = () => {
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    card.style.borderRadius = "";
    card.style.backgroundColor = "";
    card.style.transform = "";
    card.style.filter = "";
    card.style.backfaceVisibility = "";
    card.style.transformOrigin = "";
    card.style.webkitTransform = "";
    const img = card.querySelector("img");
    if (img) {
      img.style.removeProperty("filter");
      img.style.removeProperty("height");
      img.style.removeProperty("width");
      img.style.removeProperty("max-height");
      img.style.removeProperty("aspect-ratio");
      img.style.removeProperty("object-fit");
      img.style.removeProperty("backface-visibility");
    }
  };

  const settle = () => {
    card.classList.remove("is-floating");
    card.classList.add("is-settled");
    clearFloatingStyles();
    bioSlot.classList.add("is-landed");
    card.setAttribute("aria-hidden", "true");
    hero.style.setProperty("--hero-progress", "1");
  };

  const update = () => {
    if (!metrics) measure();

    const scroll = lenis?.scroll ?? window.scrollY;
    const vh = viewportHeight();
    const travel = isCoarse ? vh * 1.15 : vh;
    const raw = Math.min(1, Math.max(0, scroll / travel));
    const progress = easeInOutCubic(raw);
    const colorMix = smoothstep(0.55, 1, progress);
    const flipMax = isCoarse ? 36 : 88;
    const rotateY = Math.sin(progress * Math.PI) * flipMax;

    hero.style.setProperty("--hero-progress", raw.toFixed(4));
    hero.style.setProperty(
      "--hero-title-y",
      `${-raw * vh * (isCoarse ? 0.12 : 0.26)}px`,
    );

    if (raw >= 0.998) {
      if (!card.classList.contains("is-settled")) settle();
      return;
    }

    if (card.classList.contains("is-settled")) {
      card.classList.remove("is-settled");
      bioSlot.classList.remove("is-landed");
      measure();
    }

    if (raw <= 0.001) {
      card.classList.remove("is-floating");
      card.classList.remove("is-settled");
      card.removeAttribute("aria-hidden");
      clearFloatingStyles();
      bioSlot.classList.remove("is-landed");
      return;
    }

    if (isCoarse && raw > 0.05 && raw < 0.95) {
      const bioRect = bioSlot.getBoundingClientRect();
      metrics.endDoc = {
        left: bioRect.left + window.scrollX,
        top: bioRect.top + window.scrollY,
        width: bioRect.width,
        height: bioRect.height,
        radius: parseFloat(getComputedStyle(bioSlot).borderRadius) || 28,
      };
    }

    bioSlot.classList.remove("is-landed");
    card.classList.remove("is-settled");
    card.classList.add("is-floating");
    card.setAttribute("aria-hidden", "true");

    const { startDoc, endDoc } = metrics;
    const docLeft = lerp(startDoc.left, endDoc.left, progress);
    const docTop = lerp(startDoc.top, endDoc.top, progress);
    const width = lerp(startDoc.width, endDoc.width, progress);
    const height = lerp(startDoc.height, endDoc.height, progress);
    const radius = lerp(startDoc.radius, endDoc.radius, progress);

    const left = docLeft - window.scrollX;
    const top = docTop - window.scrollY;

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.borderRadius = `${radius}px`;
    const bgHex =
      getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim() ||
      "#f2f0ed";
    card.style.backgroundColor = bgHex;

    const img = card.querySelector("img");
    if (img) {
      img.style.filter = `grayscale(${1 - colorMix})`;
      img.style.height = "100%";
      img.style.width = "100%";
      img.style.maxHeight = "none";
      img.style.objectFit = "cover";
      img.style.aspectRatio = "auto";
      img.style.backfaceVisibility = "visible";
    }

    const transform = `perspective(900px) rotateY(${rotateY}deg)`;
    card.style.transform = transform;
    card.style.webkitTransform = transform;
    card.style.transformOrigin = "center center";
    card.style.backfaceVisibility = "visible";
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  measure();
  update();

  const onResize = () => {
    if (card.classList.contains("is-settled")) return;
    measure();
    update();
  };

  window.addEventListener("resize", onResize, { passive: true });
  window.visualViewport?.addEventListener("resize", onResize, { passive: true });

  if (lenis) {
    lenis.on("scroll", requestUpdate);
  }
  window.addEventListener("scroll", requestUpdate, { passive: true });
}

/** @deprecated alias */
export const initHeroCardScroll = initHeroScrollCard;

/** Rolling Text — per-character stagger on mount (Majd Rolling Text) */
export function initRollingText() {
  document.querySelectorAll("[data-rolling-text]").forEach((el) => {
    const sparkle = el.querySelector(".hero-sparkle");
    const bolt = el.querySelector(".hero-bolt");
    const lines = el.innerHTML
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const plain = lines.join(" ");
    if (!plain) return;

    el.innerHTML = "";
    el.setAttribute("aria-label", plain);
    if (sparkle) el.appendChild(sparkle);

    let charIndex = 0;
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) el.appendChild(document.createElement("br"));

      [...line].forEach((char) => {
        const span = document.createElement("span");
        span.className = "rolling-char";
        span.textContent = char === " " ? "\u00a0" : char;
        span.style.transitionDelay = `${charIndex * 28}ms`;
        el.appendChild(span);
        charIndex += 1;
      });
    });

    if (bolt) el.appendChild(bolt);

    const show = () => {
      el.querySelectorAll(".rolling-char").forEach((c) => c.classList.add("is-visible"));
    };

    if (prefersReducedMotion.matches) show();
    else requestAnimationFrame(show);
  });
}

/** Infinite marquee ticker — duplicate track for seamless loop */
export function initMarquee() {
  document.querySelectorAll("[data-marquee]").forEach((root) => {
    const inner = root.querySelector(".marquee-inner");
    const track = root.querySelector(".marquee-track");
    if (!inner || !track || inner.dataset.cloned === "true") return;
    const clone = track.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    inner.appendChild(clone);
    inner.dataset.cloned = "true";

    if (prefersReducedMotion.matches) {
      root.classList.add("marquee-static");
    }
  });
}

/** ScrollColorText — fill text color on scroll (Majd quote section) */
export function initScrollColorText() {
  const sections = document.querySelectorAll("[data-scroll-text]");
  if (!sections.length || prefersReducedMotion.matches) {
    sections.forEach((el) => el.classList.add("is-filled"));
    return;
  }

  const update = () => {
    sections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.7;
      const end = vh * 0.15;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      el.style.setProperty("--fill-progress", progress.toFixed(3));
    });
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
}

/** Nav pill — hide on scroll down, but stay put during hero portrait morph */
export function initNavBehavior(header, lenis) {
  if (!header || prefersReducedMotion.matches) return;

  let lastY = lenis?.scroll ?? window.scrollY;
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = lenis?.scroll ?? window.scrollY;
      const vh = window.innerHeight;
      /* Keep pill visible while the portrait card is flying (first viewport) */
      if (y < vh * 1.05) {
        header.classList.remove("is-hidden");
      } else if (y > lastY + 6) {
        header.classList.add("is-hidden");
      } else if (y < lastY - 6) {
        header.classList.remove("is-hidden");
      }
      lastY = y;
      ticking = false;
    });
  };

  if (lenis) {
    lenis.on("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}
