"use strict";

(function () {
  const track = document.querySelector("[data-slide-track]");
  if (!track) return;

  const slides = Array.from(track.querySelectorAll(".slide"));
  if (!slides.length) return;

  const prevButton = document.querySelector("[data-slide-prev]");
  const nextButton = document.querySelector("[data-slide-next]");
  const counter = document.querySelector("[data-slide-counter]");
  const progress = document.querySelector("[data-slide-progress]");
  const dots = document.querySelector("[data-slide-dots]");
  const customMotion = document.body.dataset.motion === "kurzgesagt";
  let index = -1;
  let touchStartX = 0;
  let cleanupTimer = null;

  if (!customMotion) {
    slides.forEach((slide, slideIndex) => {
      const ambient = document.createElement("div");
      ambient.className = "ambient-field";
      ambient.setAttribute("aria-hidden", "true");
      for (let particleIndex = 0; particleIndex < 12; particleIndex += 1) {
        const bubble = document.createElement("span");
        bubble.className = "ambient-bubble";
        bubble.style.setProperty("--x", `${8 + ((particleIndex * 23 + slideIndex * 17) % 88)}%`);
        bubble.style.setProperty("--y", `${10 + ((particleIndex * 31 + slideIndex * 13) % 78)}%`);
        bubble.style.setProperty("--size", `${14 + ((particleIndex * 9 + slideIndex * 5) % 34)}px`);
        bubble.style.setProperty("--delay", `${-particleIndex * 0.72}s`);
        bubble.style.setProperty("--duration", `${6.5 + (particleIndex % 6) * 0.75}s`);
        bubble.style.setProperty("--float-x", `${-46 + ((particleIndex * 37) % 92)}px`);
        bubble.style.setProperty("--float-y", `${-64 + ((particleIndex * 29) % 120)}px`);
        ambient.appendChild(bubble);
      }
      slide.prepend(ambient);
    });
  }

  if (dots) {
    dots.innerHTML = "";
    slides.forEach((_, slideIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slide-dot";
      button.setAttribute("aria-label", `Slide ${slideIndex + 1}`);
      button.addEventListener("click", () => goTo(slideIndex));
      dots.appendChild(button);
    });
  }

  function syncTheme(activeSlide) {
    const explicitTheme = activeSlide?.dataset?.theme;
    if (explicitTheme) {
      document.body.dataset.activeTheme = explicitTheme;
    } else {
      delete document.body.dataset.activeTheme;
    }
  }

  function goTo(nextIndex, options = {}) {
    const targetIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (targetIndex === index && !options.initial) return;

    const oldIndex = index < 0 ? 0 : index;
    const isInitial = Boolean(options.initial || index < 0);
    const direction = targetIndex >= oldIndex ? "forward" : "backward";
    index = targetIndex;

    track.dataset.direction = direction;
    track.style.transform = `translate3d(-${index * 100}vw, 0, 0)`;

    if (cleanupTimer) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }

    slides.forEach((slide, slideIndex) => {
      slide.classList.remove("is-entering-forward", "is-entering-backward", "is-exiting-forward", "is-exiting-backward");
      const isActive = slideIndex === index;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");

      if (!isInitial) {
        if (slideIndex === oldIndex && oldIndex !== index) {
          slide.classList.add(direction === "forward" ? "is-exiting-forward" : "is-exiting-backward");
        }
        if (isActive) {
          slide.scrollTop = 0;
          void slide.offsetWidth;
          slide.classList.add(direction === "forward" ? "is-entering-forward" : "is-entering-backward");
        }
      }
    });

    if (!isInitial) {
      cleanupTimer = window.setTimeout(() => {
        slides.forEach((slide) => {
          slide.classList.remove("is-entering-forward", "is-entering-backward", "is-exiting-forward", "is-exiting-backward");
        });
      }, 860);
    }

    const total = slides.length;
    if (counter) counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    if (progress) {
      const ratio = (index + 1) / total;
      progress.style.transform = `scaleX(${ratio})`;
    }
    if (dots) {
      dots.querySelectorAll(".slide-dot").forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
        dot.setAttribute("aria-current", dotIndex === index ? "step" : "false");
      });
    }

    if (prevButton) prevButton.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === total - 1;

    syncTheme(slides[index]);

    track.dispatchEvent(new CustomEvent("slidechange", {
      detail: {
        index,
        oldIndex,
        direction,
        isInitial,
        total,
        slide: slides[index],
        previousSlide: isInitial ? null : slides[oldIndex]
      }
    }));
  }

  prevButton?.addEventListener("click", () => goTo(index - 1));
  nextButton?.addEventListener("click", () => goTo(index + 1));

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof Element) {
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === " " && target.closest("button, a, summary")) return;
    }
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      goTo(index + 1);
    }
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      goTo(index - 1);
    }
    if (event.key === "Home") goTo(0);
    if (event.key === "End") goTo(slides.length - 1);
  });

  track.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  track.addEventListener("touchend", (event) => {
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 55) goTo(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("is-page-hidden", document.hidden);
  });

  window.SlideDeck = { goTo, getIndex: () => index, getSlides: () => slides };

  goTo(0, { initial: true });
})();
