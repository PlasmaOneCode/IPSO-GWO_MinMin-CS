"use strict";

(function () {
  const track = document.querySelector("[data-slide-track]");
  if (!track) return;

  const slides = Array.from(track.querySelectorAll(".slide"));
  const prevButton = document.querySelector("[data-slide-prev]");
  const nextButton = document.querySelector("[data-slide-next]");
  const counter = document.querySelector("[data-slide-counter]");
  const progress = document.querySelector("[data-slide-progress]");
  const dots = document.querySelector("[data-slide-dots]");
  let index = 0;
  let isAnimating = false;
  let touchStartX = 0;

  slides.forEach((slide, slideIndex) => {
    const ambient = document.createElement("div");
    ambient.className = "ambient-field";
    ambient.setAttribute("aria-hidden", "true");
    for (let particleIndex = 0; particleIndex < 15; particleIndex += 1) {
      const bubble = document.createElement("span");
      bubble.className = "ambient-bubble";
      bubble.style.setProperty("--x", `${8 + ((particleIndex * 23 + slideIndex * 17) % 88)}%`);
      bubble.style.setProperty("--y", `${10 + ((particleIndex * 31 + slideIndex * 13) % 78)}%`);
      bubble.style.setProperty("--size", `${14 + ((particleIndex * 9 + slideIndex * 5) % 36)}px`);
      bubble.style.setProperty("--delay", `${-particleIndex * 0.72}s`);
      bubble.style.setProperty("--duration", `${5.5 + (particleIndex % 6) * 0.65}s`);
      bubble.style.setProperty("--float-x", `${-52 + ((particleIndex * 37) % 104)}px`);
      bubble.style.setProperty("--float-y", `${-76 + ((particleIndex * 29) % 136)}px`);
      ambient.appendChild(bubble);
    }
    slide.prepend(ambient);
  });

  if (dots) {
    slides.forEach((_, slideIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slide-dot";
      button.setAttribute("aria-label", `Slide ${slideIndex + 1}`);
      button.addEventListener("click", () => goTo(slideIndex));
      dots.appendChild(button);
    });
  }

  function goTo(nextIndex) {
    const targetIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    if (targetIndex === index && index === 0) {
      slides[0].classList.add("is-active");
      return;
    }
    if (targetIndex === index) return;

    const oldIndex = index;
    const direction = targetIndex > oldIndex ? "forward" : "backward";
    index = targetIndex;
    isAnimating = true;
    track.dataset.direction = direction;
    track.style.transform = `translate3d(-${index * 100}vw, 0, 0)`;

    slides.forEach((slide, slideIndex) => {
      slide.classList.remove("is-entering-forward", "is-entering-backward", "is-exiting-forward", "is-exiting-backward");
      slide.classList.toggle("is-active", slideIndex === index);
      if (slideIndex === oldIndex) {
        slide.classList.add(direction === "forward" ? "is-exiting-forward" : "is-exiting-backward");
      }
      if (slideIndex === index) {
        void slide.offsetWidth;
        slide.classList.add(direction === "forward" ? "is-entering-forward" : "is-entering-backward");
      }
      slide.setAttribute("aria-hidden", slideIndex === index ? "false" : "true");
    });

    window.setTimeout(() => {
      slides.forEach((slide) => {
        slide.classList.remove("is-entering-forward", "is-entering-backward", "is-exiting-forward", "is-exiting-backward");
      });
      isAnimating = false;
    }, 760);

    if (counter) counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    if (progress) progress.style.width = `${((index + 1) / slides.length) * 100}%`;
    if (dots) {
      dots.querySelectorAll(".slide-dot").forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
      });
    }

    if (prevButton) prevButton.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === slides.length - 1;
  }

  prevButton?.addEventListener("click", () => goTo(index - 1));
  nextButton?.addEventListener("click", () => goTo(index + 1));

  document.addEventListener("keydown", (event) => {
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

  goTo(0);
})();
