const root = document.documentElement;
const intro = document.querySelector("[data-intro]");
const revealDistance = 460;

let virtualProgress = 0;
let scrollRemainder = 0;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setProgress(progress) {
  const eased = 1 - Math.pow(1 - progress, 3);

  root.style.setProperty("--overlay-progress", eased.toFixed(4));
  root.style.setProperty("--logo-progress", progress.toFixed(4));
  intro.classList.toggle("is-complete", progress >= 0.995);
}

function handleWheel(event) {
  if (virtualProgress >= 0.995 && event.deltaY > 0) {
    return;
  }

  event.preventDefault();
  scrollRemainder += event.deltaY;

  const nextProgress = clamp(scrollRemainder / revealDistance, 0, 1);
  virtualProgress = nextProgress;
  setProgress(virtualProgress);
}

function handleKeydown(event) {
  const forwardKeys = ["ArrowDown", "PageDown", " ", "End"];
  const backwardKeys = ["ArrowUp", "PageUp", "Home"];

  if (!forwardKeys.includes(event.key) && !backwardKeys.includes(event.key)) {
    return;
  }

  if (virtualProgress >= 0.995 && forwardKeys.includes(event.key)) {
    return;
  }

  event.preventDefault();
  const direction = forwardKeys.includes(event.key) ? 1 : -1;
  scrollRemainder = clamp(scrollRemainder + direction * 120, 0, revealDistance);
  virtualProgress = clamp(scrollRemainder / revealDistance, 0, 1);
  setProgress(virtualProgress);
}

let touchStartY = 0;

function handleTouchStart(event) {
  touchStartY = event.touches[0].clientY;
}

function handleTouchMove(event) {
  const deltaY = touchStartY - event.touches[0].clientY;

  if (virtualProgress >= 0.995 && deltaY > 0) {
    return;
  }

  event.preventDefault();
  scrollRemainder = clamp(scrollRemainder + deltaY, 0, revealDistance);
  virtualProgress = clamp(scrollRemainder / revealDistance, 0, 1);
  touchStartY = event.touches[0].clientY;
  setProgress(virtualProgress);
}

window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("keydown", handleKeydown);
window.addEventListener("touchstart", handleTouchStart, { passive: true });
window.addEventListener("touchmove", handleTouchMove, { passive: false });

setProgress(0);
