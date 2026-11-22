"use strict";

(function () {
  const track = document.querySelector("[data-slide-track]");
  if (!track || document.body.dataset.motion !== "kurzgesagt") return;

  const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = Array.from(track.querySelectorAll(".slide"));
  const activeAnimations = new Set();

  /* Deterministic pseudo-random generator so each slide has organic, non-synchronous phase/speed */
  function seeded(seed) {
    let s = (seed * 9301 + 49297) % 233280;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  /* Kurzgesagt flat-vector ambient SVGs placed strictly near outer margins */
  const SHAPE_SVGS = [
    // Ringed planet
    `<svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="14" fill="currentColor" opacity="0.28"/>
      <ellipse cx="32" cy="32" rx="26" ry="8" fill="none" stroke="currentColor" stroke-width="3" opacity="0.55" transform="rotate(-18 32 32)"/>
    </svg>`,
    // 4-point Kurzgesagt sparkle star
    `<svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="currentColor" opacity="0.65"/>
    </svg>`,
    // Soft glowing orb with highlight
    `<svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="currentColor" opacity="0.22"/>
      <circle cx="18" cy="17" r="5" fill="#ffffff" opacity="0.45"/>
    </svg>`,
    // Rounded capsule / pill
    `<svg viewBox="0 0 64 32" aria-hidden="true">
      <rect x="4" y="6" width="56" height="20" rx="10" fill="currentColor" opacity="0.24" transform="rotate(-20 32 16)"/>
    </svg>`,
    // Concentric dashed ring
    `<svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 8" opacity="0.45"/>
      <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.32"/>
    </svg>`
  ];

  /* Safe edge coordinates so decorative shapes stay out of center reading zone */
  const EDGE_SLOTS = [
    [4, 10], [88, 12], [6, 78], [89, 76], [14, 86], [82, 86], [92, 42], [3, 44]
  ];

  function buildAmbientStage() {
    const colors = ["var(--accent)", "var(--accent-secondary)", "var(--accent-warm)"];
    slides.forEach((slide, slideIdx) => {
      const rand = seeded(slideIdx + 17);
      const stage = document.createElement("div");
      stage.className = "kz-stage";
      stage.setAttribute("aria-hidden", "true");

      const farLayer = document.createElement("div");
      farLayer.className = "kz-parallax-layer kz-parallax-far";
      const nearLayer = document.createElement("div");
      nearLayer.className = "kz-parallax-layer kz-parallax-near";

      EDGE_SLOTS.forEach(([bx, by], slotIdx) => {
        const shape = document.createElement("span");
        const modeRoll = (slotIdx + slideIdx) % 4;
        const modeClass = modeRoll === 1 ? "is-twinkle" : modeRoll === 2 ? "is-spin" : modeRoll === 3 ? "is-breathe" : "";
        shape.className = `kz-shape ${modeClass}`.trim();

        const jitterX = (rand() - 0.5) * 6;
        const jitterY = (rand() - 0.5) * 8;
        const size = modeRoll === 1 ? 18 + Math.round(rand() * 14) : 28 + Math.round(rand() * 34);
        const dur = (5.2 + rand() * 6.8).toFixed(2);
        const delay = (-rand() * 8).toFixed(2);
        const dx = Math.round((rand() - 0.5) * 34);
        const dy = Math.round((rand() - 0.5) * 34);

        shape.style.setProperty("--x", `${Math.max(1, Math.min(94, bx + jitterX)).toFixed(1)}%`);
        shape.style.setProperty("--y", `${Math.max(4, Math.min(90, by + jitterY)).toFixed(1)}%`);
        shape.style.setProperty("--size", `${size}px`);
        shape.style.setProperty("--dur", `${dur}s`);
        shape.style.setProperty("--spin-dur", `${(18 + rand() * 18).toFixed(1)}s`);
        shape.style.setProperty("--delay", `${delay}s`);
        shape.style.setProperty("--dx", `${dx}px`);
        shape.style.setProperty("--dy", `${dy}px`);
        shape.style.setProperty("--alpha", (0.34 + rand() * 0.34).toFixed(2));
        shape.style.color = colors[(slotIdx + slideIdx) % colors.length];
        shape.innerHTML = SHAPE_SVGS[(slotIdx + slideIdx) % SHAPE_SVGS.length];

        if (slotIdx % 2 === 0) farLayer.appendChild(shape);
        else nearLayer.appendChild(shape);
      });

      stage.appendChild(farLayer);
      stage.appendChild(nearLayer);
      slide.prepend(stage);
    });
  }

  /* Split kinetic titles into word spans without touching nested elements like <br> or <span> */
  function prepareKineticTypography() {
    slides.forEach((slide) => {
      const title = slide.querySelector(".slide-title");
      if (!title || title.dataset.kineticReady) return;
      title.dataset.kineticReady = "1";

      let wordIndex = 0;
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (!text || !text.trim()) return;
          const frag = document.createDocumentFragment();
          const parts = text.split(/(\s+)/);
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
            } else {
              const span = document.createElement("span");
              span.className = "kz-word";
              const delayMs = Math.min(70 + wordIndex * 34, 340);
              span.style.setProperty("--word-delay", `${delayMs}ms`);
              span.textContent = part;
              wordIndex += 1;
              frag.appendChild(span);
            }
          });
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "BR") {
          Array.from(node.childNodes).forEach(walk);
        }
      };
      Array.from(title.childNodes).forEach(walk);
    });
  }

  /* Assign staggered reveal delays to cards, formulas, tables, diagrams */
  function prepareRevealStaggers() {
    slides.forEach((slide) => {
      const items = slide.querySelectorAll("[data-reveal]");
      items.forEach((el, idx) => {
        const customDelay = el.dataset.revealDelay;
        const delayMs = customDelay ? Number(customDelay) : Math.min(140 + idx * 75, 520);
        el.style.setProperty("--reveal-delay", `${delayMs}ms`);
      });
    });
  }

  /* Shared-element hero orb morph across slides using Web Animations API (transform & opacity only) */
  let currentMorphEl = null;
  function runHeroOrbMorph(prevSlide, nextSlide, direction) {
    if (prefersReduced() || !prevSlide || !nextSlide) return;
    const fromOrb = prevSlide.querySelector("[data-hero-orb]");
    const toOrb = nextSlide.querySelector("[data-hero-orb]");
    if (!fromOrb || !toOrb) return;

    if (currentMorphEl) {
      currentMorphEl.remove();
      currentMorphEl = null;
    }

    const fromRect = fromOrb.getBoundingClientRect();
    const toRectRaw = toOrb.getBoundingClientRect();
    if (!fromRect.width || !toRectRaw.width) return;

    // Because track just moved by ±100vw (or jump distance), compute target viewport X relative to nextSlide
    const nextSlideRect = nextSlide.getBoundingClientRect();
    const targetX = toRectRaw.left - nextSlideRect.left;
    const targetY = toRectRaw.top;

    const baseSize = Math.max(28, Math.min(72, fromRect.width));
    const orb = document.createElement("div");
    orb.className = "hero-morph-orb";
    orb.style.width = `${baseSize}px`;
    orb.style.height = `${baseSize}px`;
    document.body.appendChild(orb);
    currentMorphEl = orb;

    const startX = fromRect.left + fromRect.width / 2 - baseSize / 2;
    const startY = fromRect.top + fromRect.height / 2 - baseSize / 2;
    const endX = targetX + toRectRaw.width / 2 - baseSize / 2;
    const endY = targetY + toRectRaw.height / 2 - baseSize / 2;
    const midX = (startX + endX) / 2 + (direction === "forward" ? -40 : 40);
    const midY = Math.min(startY, endY) - 64;
    const endScale = Math.max(0.55, Math.min(1.6, toRectRaw.width / baseSize));

    const anim = orb.animate(
      [
        { transform: `translate3d(${startX}px, ${startY}px, 0) scale(0.9)`, opacity: 0.95 },
        { transform: `translate3d(${midX}px, ${midY}px, 0) scale(1.18, 0.88)`, opacity: 0.92, offset: 0.45 },
        { transform: `translate3d(${endX}px, ${endY}px, 0) scale(${endScale})`, opacity: 0 }
      ],
      {
        duration: 620,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      }
    );

    activeAnimations.add(anim);
    anim.onfinish = () => {
      activeAnimations.delete(anim);
      if (orb.parentNode) orb.remove();
      if (currentMorphEl === orb) currentMorphEl = null;
    };
  }

  /* Animate result bars (scaleX) & roll-up numeric counters when Results slide enters */
  function animateResultsSlide(slide) {
    const bars = slide.querySelectorAll(".bar-fill[data-scale]");
    const counters = slide.querySelectorAll("[data-count-to]");
    const reduced = prefersReduced();

    bars.forEach((bar, idx) => {
      const target = Number(bar.dataset.scale || 1);
      if (reduced) {
        bar.style.transform = `scaleX(${target})`;
        return;
      }
      const anim = bar.animate(
        [
          { transform: "scaleX(0)" },
          { transform: `scaleX(${Math.min(1, target * 1.03)})`, offset: 0.78 },
          { transform: `scaleX(${target})` }
        ],
        {
          duration: 860,
          delay: 180 + idx * 110,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards"
        }
      );
      activeAnimations.add(anim);
      anim.onfinish = () => {
        activeAnimations.delete(anim);
        bar.style.transform = `scaleX(${target})`;
      };
    });

    counters.forEach((el) => {
      const target = Number(el.dataset.countTo);
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const decimals = Number(el.dataset.decimals ?? 2);

      if (reduced || Number.isNaN(target)) {
        el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
        return;
      }

      const start = performance.now();
      const duration = 900;
      const tick = (now) => {
        if (document.hidden) {
          el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
          return;
        }
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* Interactive 1: PSO Parameter Sandbox (Slide 7) */
  function initPsoSandbox() {
    const wInput = document.getElementById("pso-w");
    const c1Input = document.getElementById("pso-c1");
    const c2Input = document.getElementById("pso-c2");
    const wOut = document.getElementById("pso-w-val");
    const c1Out = document.getElementById("pso-c1-val");
    const c2Out = document.getElementById("pso-c2-val");
    const pathEl = document.getElementById("pso-path");
    const endDot = document.getElementById("pso-end-dot");
    const statusEl = document.getElementById("pso-sandbox-note");
    if (!wInput || !c1Input || !c2Input || !pathEl) return;

    const pbest = { x: 150, y: 58 };
    const gbest = { x: 318, y: 122 };
    const r1 = 0.65;
    const r2 = 0.72;

    function update() {
      const w = Number(wInput.value);
      const c1 = Number(c1Input.value);
      const c2 = Number(c2Input.value);
      if (wOut) wOut.textContent = w.toFixed(2);
      if (c1Out) c1Out.textContent = c1.toFixed(1);
      if (c2Out) c2Out.textContent = c2.toFixed(1);

      let x = 58;
      let y = 148;
      let vx = 26;
      let vy = -18;
      const pts = [[x, y]];

      for (let step = 0; step < 5; step += 1) {
        vx = w * vx + c1 * r1 * (pbest.x - x) * 0.24 + c2 * r2 * (gbest.x - x) * 0.24;
        vy = w * vy + c1 * r1 * (pbest.y - y) * 0.24 + c2 * r2 * (gbest.y - y) * 0.24;
        x = Math.max(24, Math.min(358, x + vx));
        y = Math.max(24, Math.min(186, y + vy));
        pts.push([x, y]);
      }

      pathEl.setAttribute("d", pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" "));
      if (endDot) {
        endDot.setAttribute("transform", `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
      }

      if (statusEl) {
        if (w >= 0.75) {
          statusEl.textContent = "Inersia tinggi (w ≥ 0.75): partikel melesat lebih jauh — kuat di eksplorasi awal, tapi mudah melewati target.";
        } else if (c2 > c1 + 0.6) {
          statusEl.textContent = "Komponen sosial (c2) dominan: partikel cepat tertarik ke gbest — cepat konvergen, tapi rawan terjebak optimum lokal.";
        } else if (c1 > c2 + 0.6) {
          statusEl.textContent = "Komponen kognitif (c1) dominan: partikel setia pada pbest sendiri — menjaga variasi, namun lebih lambat menyatu.";
        } else {
          statusEl.textContent = "Seimbang (seperti IPSO: w menurun 0.8 → 0.3, c1 = c2 = 2): langkah awal melebar lalu merapat halus ke gbest.";
        }
      }
    }

    [wInput, c1Input, c2Input].forEach((el) => el.addEventListener("input", update));
    update();
  }

  /* Interactive 2: GWO Clickable Wolf Hierarchy (Slide 8) */
  function initWolfHierarchy() {
    const buttons = Array.from(document.querySelectorAll("[data-wolf-role]"));
    const titleEl = document.getElementById("wolf-role-title");
    const descEl = document.getElementById("wolf-role-desc");
    const svgNodes = Array.from(document.querySelectorAll("[data-wolf-svg]"));
    if (!buttons.length || !titleEl || !descEl) return;

    const ROLES = {
      alpha: {
        title: "Alpha (α) — Pemimpin Kawanan (Solusi #1 Terbaik)",
        desc: "Memegang jadwal dengan nilai fitness paling rendah (terbaik). Di fase 2 IPSO-GWO, solusi gbest dari IPSO langsung diangkat menjadi Alpha awal."
      },
      beta: {
        title: "Beta (β) — Wakil Pemimpin (Solusi #2 Terbaik)",
        desc: "Membantu Alpha memberi arah pencarian dan menjaga keseimbangan jika Alpha mulai stagnan. Ikut menentukan rata-rata posisi baru X₂."
      },
      delta: {
        title: "Delta (δ) — Pengintai & Penjaga (Solusi #3 Terbaik)",
        desc: "Menyumbang arah ketiga (X₃) agar kepungan tidak terpaku pada satu titik saja, sehingga memperluas area pencarian yang aman."
      },
      omega: {
        title: "Omega (ω) — Anggota Kawanan (Kandidat Lainnya)",
        desc: "Seluruh 22 solusi lain (dari total populasi 25). Mereka memperbarui jadwal dengan merata-ratakan panduan dari α, β, dan δ."
      }
    };

    function selectRole(role) {
      const info = ROLES[role] || ROLES.alpha;
      titleEl.textContent = info.title;
      descEl.textContent = info.desc;
      buttons.forEach((btn) => btn.setAttribute("aria-pressed", btn.dataset.wolfRole === role ? "true" : "false"));
      svgNodes.forEach((node) => {
        const match = node.dataset.wolfSvg === role;
        node.classList.toggle("is-selected", match);
        node.classList.toggle("is-dimmed", !match);
      });
    }

    buttons.forEach((btn) => btn.addEventListener("click", () => selectRole(btn.dataset.wolfRole)));
    svgNodes.forEach((node) => node.addEventListener("click", () => selectRole(node.dataset.wolfSvg)));
    selectRole("alpha");
  }

  /* Interactive 3: GWO Parameter 'a' Decay Slider (Slide 9) */
  function initGwoDecaySlider() {
    const slider = document.getElementById("gwo-iter");
    const iterOut = document.getElementById("gwo-iter-val");
    const aOut = document.getElementById("gwo-a-val");
    const phaseOut = document.getElementById("gwo-phase-val");
    const ringEl = document.getElementById("gwo-radius-ring");
    if (!slider || !ringEl) return;

    function update() {
      const t = Number(slider.value);
      const a = Math.max(0, 2 - (2 * t) / 100);
      const scale = 0.35 + (a / 2) * 0.78;
      if (iterOut) iterOut.textContent = `${t} / 100`;
      if (aOut) aOut.textContent = `a = ${a.toFixed(2)} (rentang A: [${(-a).toFixed(2)}, +${a.toFixed(2)}])`;
      ringEl.style.transform = `scale(${scale.toFixed(3)})`;

      if (phaseOut) {
        if (a > 1.05) {
          phaseOut.textContent = "Fase Mencari (Eksplorasi): |A| bisa > 1, serigala menyebar menjauhi kandidat sementara untuk mencari mangsa baru.";
        } else if (a > 0.45) {
          phaseOut.textContent = "Fase Mengepung (Transisi): |A| mulai mengecil ke sekitar 1, serigala merapat membentuk kepungan di sekitar α, β, δ.";
        } else {
          phaseOut.textContent = "Fase Menyerang (Eksploitasi): |A| < 1, langkah halus memfokuskan seluruh kawanan tepat ke solusi optimal.";
        }
      }
    }

    slider.addEventListener("input", update);
    update();
  }

  /* Initialize everything */
  buildAmbientStage();
  prepareKineticTypography();
  prepareRevealStaggers();
  initPsoSandbox();
  initWolfHierarchy();
  initGwoDecaySlider();

  /* Hook into SlideDeck slidechange event */
  track.addEventListener("slidechange", (event) => {
    const { slide, previousSlide, direction, isInitial } = event.detail;
    if (!isInitial && previousSlide && slide) {
      runHeroOrbMorph(previousSlide, slide, direction);
    }
    if (slide && slide.dataset.resultsSlide === "true") {
      animateResultsSlide(slide);
    }
  });

  /* Pause/resume Web Animations on tab visibility change */
  document.addEventListener("visibilitychange", () => {
    activeAnimations.forEach((anim) => {
      if (document.hidden) anim.pause();
      else anim.play();
    });
  });

  /* If already starting on results slide (rare), run immediately */
  const initialActive = track.querySelector(".slide.is-active[data-results-slide='true']");
  if (initialActive) animateResultsSlide(initialActive);
})();
