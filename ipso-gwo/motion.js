"use strict";

(function () {
  const track = document.querySelector("[data-slide-track]");
  if (!track || document.body.dataset.motion !== "kurzgesagt") return;

  const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = Array.from(track.querySelectorAll(".slide"));
  const activeAnimations = new Set();

  function seeded(seed) {
    let s = (seed * 9301 + 49297) % 233280;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  /* Kurzgesagt ("The Bacteriophage") flat-vector micro-cosmos shapes */
  const SHAPE_SVGS = [
    // Faceted hexagon / phage-inspired geometric crystal
    `<svg viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,6 54,19 54,45 32,58 10,45 10,19" fill="currentColor" opacity="0.24" stroke="currentColor" stroke-width="2.5" stroke-opacity="0.65"/>
      <polygon points="32,16 45,24 45,40 32,48 19,40 19,24" fill="currentColor" opacity="0.32"/>
    </svg>`,
    // Bioluminescent 4-point star
    `<svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="currentColor" opacity="0.78"/>
    </svg>`,
    // Cell bubble with inner nucleus
    `<svg viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="currentColor" opacity="0.16" stroke="currentColor" stroke-width="2" stroke-opacity="0.48"/>
      <circle cx="24" cy="24" r="8" fill="currentColor" opacity="0.38"/>
      <circle cx="21" cy="20" r="3" fill="#ffffff" opacity="0.55"/>
    </svg>`,
    // Floating microbe capsule
    `<svg viewBox="0 0 68 32" aria-hidden="true">
      <rect x="4" y="6" width="60" height="20" rx="10" fill="currentColor" opacity="0.22" stroke="currentColor" stroke-width="2" stroke-opacity="0.5" transform="rotate(-18 34 16)"/>
      <circle cx="22" cy="18" r="4" fill="#ffffff" opacity="0.38"/>
    </svg>`,
    // Ringed cosmic planet / sonar ring
    `<svg viewBox="0 0 68 68" aria-hidden="true">
      <circle cx="34" cy="34" r="14" fill="currentColor" opacity="0.32"/>
      <ellipse cx="34" cy="34" rx="28" ry="9" fill="none" stroke="currentColor" stroke-width="2.6" opacity="0.62" transform="rotate(-16 34 34)"/>
    </svg>`,
    // Dotted micro-cluster
    `<svg viewBox="0 0 54 54" aria-hidden="true">
      <circle cx="16" cy="18" r="5" fill="currentColor" opacity="0.55"/>
      <circle cx="36" cy="14" r="3.5" fill="currentColor" opacity="0.45"/>
      <circle cx="30" cy="36" r="6" fill="currentColor" opacity="0.35"/>
    </svg>`
  ];

  /* Outer perimeter slots so vibrant Kurzgesagt elements frame content without obscuring text */
  const EDGE_SLOTS = [
    [3, 9], [89, 10], [5, 76], [89, 74], [13, 88],
    [81, 87], [93, 42], [2, 43], [46, 5], [72, 91]
  ];

  function buildAmbientStage() {
    const colors = [
      "var(--accent)",
      "var(--accent-secondary)",
      "var(--accent-warm)",
      "var(--accent-coral)",
      "var(--accent-mint)"
    ];
    slides.forEach((slide, slideIdx) => {
      const rand = seeded(slideIdx + 31);
      const stage = document.createElement("div");
      stage.className = "kz-stage";
      stage.setAttribute("aria-hidden", "true");

      const farLayer = document.createElement("div");
      farLayer.className = "kz-parallax-layer kz-parallax-far";
      const midLayer = document.createElement("div");
      midLayer.className = "kz-parallax-layer kz-parallax-mid";
      const nearLayer = document.createElement("div");
      nearLayer.className = "kz-parallax-layer kz-parallax-near";

      EDGE_SLOTS.forEach(([bx, by], slotIdx) => {
        const shape = document.createElement("span");
        const modeRoll = (slotIdx + slideIdx) % 4;
        const modeClass = modeRoll === 1 ? "is-twinkle" : modeRoll === 2 ? "is-spin" : modeRoll === 3 ? "is-breathe" : "";
        shape.className = `kz-shape ${modeClass}`.trim();

        const jitterX = (rand() - 0.5) * 6;
        const jitterY = (rand() - 0.5) * 8;
        const size = modeRoll === 1 ? 16 + Math.round(rand() * 14) : 28 + Math.round(rand() * 38);
        const dur = (4.8 + rand() * 6.4).toFixed(2);
        const delay = (-rand() * 8).toFixed(2);
        const dx = Math.round((rand() - 0.5) * 40);
        const dy = Math.round((rand() - 0.5) * 40);

        shape.style.setProperty("--x", `${Math.max(1, Math.min(94, bx + jitterX)).toFixed(1)}%`);
        shape.style.setProperty("--y", `${Math.max(3, Math.min(91, by + jitterY)).toFixed(1)}%`);
        shape.style.setProperty("--size", `${size}px`);
        shape.style.setProperty("--dur", `${dur}s`);
        shape.style.setProperty("--spin-dur", `${(16 + rand() * 18).toFixed(1)}s`);
        shape.style.setProperty("--delay", `${delay}s`);
        shape.style.setProperty("--dx", `${dx}px`);
        shape.style.setProperty("--dy", `${dy}px`);
        shape.style.setProperty("--alpha", (0.36 + rand() * 0.36).toFixed(2));
        shape.style.color = colors[(slotIdx + slideIdx) % colors.length];
        shape.innerHTML = SHAPE_SVGS[(slotIdx + slideIdx) % SHAPE_SVGS.length];

        if (slotIdx % 3 === 0) farLayer.appendChild(shape);
        else if (slotIdx % 3 === 1) midLayer.appendChild(shape);
        else nearLayer.appendChild(shape);
      });

      stage.appendChild(farLayer);
      stage.appendChild(midLayer);
      stage.appendChild(nearLayer);
      slide.prepend(stage);
    });
  }

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
              const delayMs = Math.min(60 + wordIndex * 32, 300);
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

  function prepareRevealStaggers() {
    slides.forEach((slide) => {
      const items = slide.querySelectorAll("[data-reveal]");
      items.forEach((el, idx) => {
        const customDelay = el.dataset.revealDelay;
        const delayMs = customDelay ? Number(customDelay) : Math.min(120 + idx * 70, 480);
        el.style.setProperty("--reveal-delay", `${delayMs}ms`);
      });
    });
  }

  /* Shared-element hero morph orb with comet arc across transitions */
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

    const nextSlideRect = nextSlide.getBoundingClientRect();
    const targetX = toRectRaw.left - nextSlideRect.left;
    const targetY = toRectRaw.top;

    const baseSize = Math.max(32, Math.min(78, fromRect.width));
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
    const midX = (startX + endX) / 2 + (direction === "forward" ? -56 : 56);
    const midY = Math.min(startY, endY) - 82;
    const endScale = Math.max(0.55, Math.min(1.5, toRectRaw.width / baseSize));

    const anim = orb.animate(
      [
        { transform: `translate3d(${startX}px, ${startY}px, 0) scale(0.85) rotate(0deg)`, opacity: 0.96 },
        { transform: `translate3d(${midX}px, ${midY}px, 0) scale(1.24, 0.84) rotate(160deg)`, opacity: 0.95, offset: 0.46 },
        { transform: `translate3d(${endX}px, ${endY}px, 0) scale(${endScale * 1.1}) rotate(320deg)`, opacity: 0.65, offset: 0.84 },
        { transform: `translate3d(${endX}px, ${endY}px, 0) scale(${endScale}) rotate(360deg)`, opacity: 0 }
      ],
      {
        duration: 680,
        easing: "cubic-bezier(0.20, 0.92, 0.24, 1)",
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

  /* Animated result bars + rolling counters */
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
          { transform: `scaleX(${Math.min(1, target * 1.04)})`, offset: 0.76 },
          { transform: `scaleX(${target})` }
        ],
        {
          duration: 860,
          delay: 160 + idx * 110,
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

  /* Interactive 1: PSO Parameter Sandbox */
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

    const pbest = { x: 150, y: 56 };
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
          statusEl.textContent = "Inersia tinggi (w ≥ 0.75): partikel melesat luas — cocok eksplorasi awal, tapi mudah melewati target.";
        } else if (c2 > c1 + 0.6) {
          statusEl.textContent = "Sosial (c₂) dominan: cepat tertarik ke gbest — cepat konvergen, tapi rawan konvergensi prematur.";
        } else if (c1 > c2 + 0.6) {
          statusEl.textContent = "Kognitif (c₁) dominan: partikel setia pada pbest sendiri — variasi terjaga, namun lebih lambat menyatu.";
        } else {
          statusEl.textContent = "Seimbang (seperti IPSO: w turun 0.8 → 0.3, c₁ = c₂ = 2): langkah awal melebar lalu merapat halus ke gbest.";
        }
      }
    }

    [wInput, c1Input, c2Input].forEach((el) => el.addEventListener("input", update));
    update();
  }

  /* Interactive 2: GWO Clickable Wolf Hierarchy */
  function initWolfHierarchy() {
    const buttons = Array.from(document.querySelectorAll("[data-wolf-role]"));
    const titleEl = document.getElementById("wolf-role-title");
    const descEl = document.getElementById("wolf-role-desc");
    const svgNodes = Array.from(document.querySelectorAll("[data-wolf-svg]"));
    if (!buttons.length || !titleEl || !descEl) return;

    const ROLES = {
      alpha: {
        title: "Alpha (α) — Pemimpin Kawanan (Solusi #1 Terbaik)",
        desc: "Memegang jadwal dengan fitness paling kecil (terbaik). Di fase 2 IPSO-GWO, solusi gbest dari IPSO langsung diangkat menjadi Alpha awal."
      },
      beta: {
        title: "Beta (β) — Wakil Pemimpin (Solusi #2 Terbaik)",
        desc: "Mendampingi Alpha memberi arah pencarian dan menjaga stabilitas jika Alpha mulai stagnan. Menyumbang arah X₂."
      },
      delta: {
        title: "Delta (δ) — Pengintai & Penjaga (Solusi #3 Terbaik)",
        desc: "Menyumbang arah ketiga (X₃) agar kepungan tidak bertumpu pada satu titik saja, membantu keluar dari optimum lokal."
      },
      omega: {
        title: "Omega (ω) — Anggota Kawanan (22 Kandidat Lainnya)",
        desc: "Dari total populasi 25, seluruh kandidat lain memperbarui posisinya dengan merata-ratakan panduan dari α, β, dan δ."
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

  /* Interactive 3: GWO Parameter 'a' Decay Slider */
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
      const scale = 0.34 + (a / 2) * 0.78;
      if (iterOut) iterOut.textContent = `${t} / 100`;
      if (aOut) aOut.textContent = `a = ${a.toFixed(2)} (rentang A: [${(-a).toFixed(2)}, +${a.toFixed(2)}])`;
      ringEl.style.transform = `scale(${scale.toFixed(3)})`;

      if (phaseOut) {
        if (a > 1.05) {
          phaseOut.textContent = "Fase Mencari (Eksplorasi): |A| bisa > 1 — serigala menyebar mencari wilayah solusi baru.";
        } else if (a > 0.45) {
          phaseOut.textContent = "Fase Mengepung (Transisi): |A| mengecil mendekati 1 — kawanan merapat di sekitar α, β, δ.";
        } else {
          phaseOut.textContent = "Fase Menyerang (Eksploitasi): |A| < 1 — langkah halus memfokuskan seluruh kawanan ke solusi akhir.";
        }
      }
    }

    slider.addEventListener("input", update);
    update();
  }

  buildAmbientStage();
  prepareKineticTypography();
  prepareRevealStaggers();
  initPsoSandbox();
  initWolfHierarchy();
  initGwoDecaySlider();

  track.addEventListener("slidechange", (event) => {
    const { slide, previousSlide, direction, isInitial } = event.detail;
    if (!isInitial && previousSlide && slide) {
      runHeroOrbMorph(previousSlide, slide, direction);
    }
    if (slide && slide.dataset.resultsSlide === "true") {
      animateResultsSlide(slide);
    }
  });

  document.addEventListener("visibilitychange", () => {
    activeAnimations.forEach((anim) => {
      if (document.hidden) anim.pause();
      else anim.play();
    });
  });

  const initialActive = track.querySelector(".slide.is-active[data-results-slide='true']");
  if (initialActive) animateResultsSlide(initialActive);
})();
