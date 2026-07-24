import Lenis from "lenis";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** True when the pointer is on the native vertical scrollbar thumb/track */
function isScrollbarPointer(e) {
  return e.pointerType === "mouse" && e.clientX >= document.documentElement.clientWidth;
}

/** Lenis smooth scroll — Majd Smooth Scroll component */
export function initSmoothScroll() {
  if (prefersReducedMotion.matches) return null;
  /* Native touch scroll is more reliable for the portrait morph on phones */
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return null;

  const lenis = new Lenis({
    /* Snappier than 1.6 — still smooth, less residual inertia fighting the scrollbar */
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.5,
    wheelMultiplier: 0.92,
    autoRaf: true,
  });

  document.documentElement.classList.add("lenis", "lenis-smooth");

  /*
   * Scrollbar thumb drag uses native scroll. If Lenis still has wheel inertia,
   * both fight and the page jitters. Sync immediately for the duration of the drag.
   */
  let scrollbarDrag = false;
  const syncNative = () => {
    lenis.scrollTo(window.scrollY, { immediate: true });
  };

  const onPointerDown = (e) => {
    if (!isScrollbarPointer(e)) return;
    scrollbarDrag = true;
    syncNative();
  };

  const onPointerUp = () => {
    if (!scrollbarDrag) return;
    scrollbarDrag = false;
    syncNative();
  };

  const onNativeScroll = () => {
    if (!scrollbarDrag) return;
    syncNative();
  };

  window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  window.addEventListener("pointerup", onPointerUp, { capture: true, passive: true });
  window.addEventListener("pointercancel", onPointerUp, { capture: true, passive: true });
  window.addEventListener("scroll", onNativeScroll, { passive: true });

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

/** Ken Perlin smootherstep — buttery scroll-linked morphs */
function smootherstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
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

  const isMobile =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.matchMedia("(max-width: 639px)").matches;

  /* Mobile: no morph — static color portraits in hero + bio */
  if (isMobile || prefersReducedMotion.matches) {
    document.documentElement.classList.add("portrait-static");
    hero.style.setProperty("--hero-title-y", "0px");
    bioSlot.classList.add("is-landed");
    return;
  }

  document.documentElement.classList.add("has-hero-portrait-scroll");

  /* Progress only — layout uses live getBoundingClientRect (viewport space) */
  const getScrollY = () => lenis?.scroll ?? window.scrollY;

  let startLocal = null; /* card origin relative to #hero-section */
  let travel = 0;
  let endRadius = 28;
  let lastAppliedProgress = -1;
  let lastAppliedRaw = -1;
  let lastAppliedScroll = -1;

  const viewportHeight = () =>
    window.visualViewport?.height || window.innerHeight;

  const measure = () => {
    const wasFloating = card.classList.contains("is-floating");
    const prev = card.style.cssText;
    card.classList.remove("is-floating");
    card.style.cssText = "";

    const heroRect = hero.getBoundingClientRect();
    const startRect = card.getBoundingClientRect();

    /*
     * Anchor start to the hero box — both rects share the same viewport/
     * scroll frame, so Lenis vs window.scrollY never desyncs the origin.
     */
    startLocal = {
      left: startRect.left - heroRect.left,
      top: startRect.top - heroRect.top,
      width: startRect.width,
      height: startRect.height,
      radius: parseFloat(getComputedStyle(card).borderRadius) || 16,
    };

    endRadius = parseFloat(getComputedStyle(bioSlot).borderRadius) || 28;

    card.style.cssText = prev;
    if (wasFloating) card.classList.add("is-floating");

    /*
     * Spread the morph over a longer scroll so position + flip ease gently
     * into the bio slot without a hard snap.
     */
    const vh = viewportHeight();
    const sy = getScrollY();
    const bioRect = bioSlot.getBoundingClientRect();
    const endTop = bioRect.top + sy;
    const landingScroll = endTop - vh * 0.42;
    travel = Math.max(vh * 1.35, landingScroll);

    lastAppliedProgress = -1;
    lastAppliedRaw = -1;
    lastAppliedScroll = -1;
  };

  const front = card.querySelector(".portrait-face-front");
  const back = card.querySelector(".portrait-face-back");
  const faces = () => card.querySelectorAll(".portrait-face");

  const clearFloatingStyles = () => {
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    card.style.borderRadius = "";
    card.style.backgroundColor = "";
    card.style.border = "";
    card.style.boxShadow = "";
    card.style.transform = "";
    card.style.filter = "";
    card.style.perspective = "";
    card.style.transformStyle = "";
    card.style.backfaceVisibility = "";
    card.style.transformOrigin = "";
    card.style.webkitTransform = "";
    card.style.translate = "";
    faces().forEach((img) => {
      img.style.removeProperty("filter");
      img.style.removeProperty("height");
      img.style.removeProperty("width");
      img.style.removeProperty("max-height");
      img.style.removeProperty("aspect-ratio");
      img.style.removeProperty("object-fit");
      img.style.removeProperty("transform");
      img.style.removeProperty("transform-origin");
      img.style.webkitTransform = "";
    });
  };

  let displayProgress = 0;
  let rafId = 0;

  const settle = () => {
    card.classList.remove("is-floating");
    card.classList.add("is-settled");
    clearFloatingStyles();
    bioSlot.classList.add("is-landed");
    card.setAttribute("aria-hidden", "true");
    hero.style.setProperty("--hero-progress", "1");
    displayProgress = 1;
    lastAppliedProgress = 1;
    lastAppliedRaw = 1;
    lastAppliedScroll = getScrollY();
  };

  /**
   * Pure viewport-space morph:
   * - start = live hero rect + measured local offset
   * - end   = live bio slot rect every frame
   */
  const applyFrame = (progress, raw) => {
    const vh = viewportHeight();
    /* Flip eases slightly ahead of the travel so it finishes as the card lands */
    const flipProgress = smootherstep(Math.min(1, progress * 1.08));
    const rotateY = flipProgress * 180;

    hero.style.setProperty("--hero-progress", raw.toFixed(4));
    hero.style.setProperty("--hero-title-y", `${-raw * vh * 0.14}px`);

    bioSlot.classList.remove("is-landed");
    card.classList.remove("is-settled");
    card.classList.add("is-floating");
    card.setAttribute("aria-hidden", "true");

    /* Batch layout reads, then writes — avoid getComputedStyle per frame */
    const heroRect = hero.getBoundingClientRect();
    const bio = bioSlot.getBoundingClientRect();
    const startView = {
      left: heroRect.left + startLocal.left,
      top: heroRect.top + startLocal.top,
      width: startLocal.width,
      height: startLocal.height,
      radius: startLocal.radius,
    };
    const endView = {
      left: bio.left,
      top: bio.top,
      width: bio.width > 0 ? bio.width : startLocal.width * 1.45,
      height: bio.height > 0 ? bio.height : startLocal.height * 1.45,
      radius: endRadius,
    };

    /* Single smooth path — live end rect every frame, no hard mid-flight snap */
    const left = lerp(startView.left, endView.left, progress);
    const top = lerp(startView.top, endView.top, progress);
    const width = lerp(startView.width, endView.width, progress);
    const height = lerp(startView.height, endView.height, progress);
    const radius = lerp(startView.radius, endView.radius, progress);

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.borderRadius = `${radius}px`;
    card.style.backgroundColor = "transparent";
    card.style.border = "0";
    card.style.boxShadow = "none";
    card.style.filter = "none";
    card.style.translate = "none";
    card.style.transform = "none";
    card.style.webkitTransform = "none";
    card.style.perspective = "1600px";
    card.style.transformStyle = "preserve-3d";

    if (front) {
      const frontFlip = `rotateY(${rotateY}deg)`;
      front.style.transform = frontFlip;
      front.style.webkitTransform = frontFlip;
      front.style.transformOrigin = "center center";
      front.style.height = "100%";
      front.style.width = "100%";
      front.style.maxHeight = "none";
      front.style.objectFit = "cover";
      front.style.aspectRatio = "auto";
      front.style.filter = "grayscale(1)";
    }

    if (back) {
      const backFlip = `rotateY(${rotateY + 180}deg)`;
      back.style.transform = backFlip;
      back.style.webkitTransform = backFlip;
      back.style.transformOrigin = "center center";
      back.style.height = "100%";
      back.style.width = "100%";
      back.style.maxHeight = "none";
      back.style.objectFit = "cover";
      back.style.aspectRatio = "auto";
      back.style.filter = "none";
    }
  };

  const update = () => {
    if (!startLocal) measure();

    const scroll = getScrollY();
    const vh = viewportHeight();
    const span = travel || vh * 1.35;
    const raw = Math.min(1, Math.max(0, scroll / span));
    /* Cubic for scroll mapping + smootherstep for the displayed path */
    const target = smootherstep(easeInOutCubic(raw));

    /* Low follow = more inertia, less wheel jitter */
    const follow = target > 0.88 ? 0.18 : 0.075;
    displayProgress += (target - displayProgress) * follow;
    if (Math.abs(target - displayProgress) < 0.0004) displayProgress = target;

    if (raw >= 0.985 && displayProgress >= 0.97) {
      displayProgress = 1;
      if (!card.classList.contains("is-settled")) settle();
      return false;
    }

    if (card.classList.contains("is-settled")) {
      card.classList.remove("is-settled");
      bioSlot.classList.remove("is-landed");
      measure();
    }

    if (raw <= 0.001 && displayProgress <= 0.002) {
      displayProgress = 0;
      lastAppliedProgress = 0;
      lastAppliedRaw = 0;
      lastAppliedScroll = scroll;
      card.classList.remove("is-floating");
      card.classList.remove("is-settled");
      card.removeAttribute("aria-hidden");
      clearFloatingStyles();
      bioSlot.classList.remove("is-landed");
      hero.style.setProperty("--hero-progress", "0");
      hero.style.setProperty("--hero-title-y", "0px");
      return false;
    }

    const needsFollow = Math.abs(target - displayProgress) > 0.0004;
    /*
     * Skip layout thrash when idle — but re-apply whenever scroll moved,
     * since the bio slot rect shifts in viewport space every pixel.
     */
    if (
      Math.abs(scroll - lastAppliedScroll) < 0.5 &&
      Math.abs(displayProgress - lastAppliedProgress) < 0.0005 &&
      Math.abs(raw - lastAppliedRaw) < 0.0005
    ) {
      return needsFollow;
    }

    applyFrame(displayProgress, raw);
    lastAppliedProgress = displayProgress;
    lastAppliedRaw = raw;
    lastAppliedScroll = scroll;
    return needsFollow;
  };

  const requestUpdate = () => {
    if (rafId) return;
    const tick = () => {
      const needsMore = update();
      rafId = needsMore ? requestAnimationFrame(tick) : 0;
    };
    rafId = requestAnimationFrame(tick);
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
  } else {
    window.addEventListener("scroll", requestUpdate, { passive: true });
  }
}

/** @deprecated alias */
export const initHeroCardScroll = initHeroScrollCard;

/**
 * Rebuild a rolling-text element from plain lines (preserve decorative SVGs).
 * @param {HTMLElement} el
 * @param {string} [text] multiline string; falls back to existing text content
 */
export function rebuildRollingText(el, text) {
  if (!el) return;
  const sparkle = el.querySelector(".hero-sparkle");
  const bolt = el.querySelector(".hero-bolt");

  const lines = (text ??
    el.innerHTML
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, ""))
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
}

/** RollingText — per-character stagger on mount (Majd RollingText) */
export function initRollingText() {
  document.querySelectorAll("[data-rolling-text]").forEach((el) => {
    rebuildRollingText(el);
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

  const lastFill = new WeakMap();

  const update = () => {
    const vh = window.innerHeight;
    const start = vh * 0.7;
    const end = vh * 0.15;
    const span = start - end;

    sections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (start - rect.top) / span));
      const value = progress.toFixed(3);
      if (lastFill.get(el) === value) return;
      lastFill.set(el, value);
      el.style.setProperty("--fill-progress", value);
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
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
      /* Keep pill visible while the portrait card is flying */
      if (y < vh * 2.2) {
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
