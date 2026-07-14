/**
 * Mimir screenshot gallery.
 *
 * A self-contained, dependency-free component that shows one phone screenshot
 * at a time and rotates a simulated 3D phone (CSS transforms only) when moving
 * between screenshots. State is driven entirely from the `slides` array below,
 * so the markup stays free of per-image duplication.
 */
(function () {
  "use strict";

  /** Ordered screenshots. Index === display sequence (1 -> 2 -> ... -> 5 -> 1). */
  var slides = [
    {
      src: "image%20assets/mimir-screen-1.png",
      title: "Today",
      alt:
        "Mimir Today dashboard: a daily check-in with weekly medication, sleep " +
        "and mood summaries, insights, and care tasks.",
    },
    {
      src: "image%20assets/mimir-screen-2.png",
      title: "Trends",
      alt:
        "Mimir Trends screen: a daily health timeline charting mood, distress, " +
        "energy and sleep over time.",
    },
    {
      src: "image%20assets/mimir-screen-3.png",
      title: "Safety Plan",
      alt:
        "Mimir Safety Plan screen: warning signs and triggers alongside coping " +
        "steps you can do on your own.",
    },
    {
      src: "image%20assets/mimir-screen-4.png",
      title: "Coping toolkit",
      alt:
        "Mimir Coping toolkit screen: guided in-the-moment exercises such as " +
        "paced breathing and grounding.",
    },
    {
      src: "image%20assets/mimir-screen-5.png",
      title: "Doctor report",
      alt:
        "Mimir appointment-ready doctor report: a printable PDF summary with " +
        "overview stats, mood, distress, energy and sleep trends, medication " +
        "adherence, symptom severity, care tasks and notes.",
    },
  ];

  var DURATION = 820; // ms — a full 360 spin
  var EASING = "cubic-bezier(0.65, 0, 0.35, 1)"; // smooth, premium in/out
  var SWAP_FRACTION = 0.72; // swap the front face while it is past edge-on and hidden

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function init(root) {
    var card = root.querySelector("[data-mimir-card]");
    var frontImg = root.querySelector("[data-mimir-front]");
    var backImg = root.querySelector("[data-mimir-back]");
    var prevBtn = root.querySelector("[data-mimir-prev]");
    var nextBtn = root.querySelector("[data-mimir-next]");
    var caption = root.querySelector("[data-mimir-caption]");
    var dotsWrap = root.querySelector("[data-mimir-dots]");

    if (!card || !frontImg || !backImg) {
      return;
    }

    var current = 0;
    var isAnimating = false;
    var dots = [];

    // Preload every screenshot so no transition shows a blank/delayed image.
    slides.forEach(function (slide) {
      var img = new Image();
      img.src = slide.src;
    });

    // Build indicators from the data so markup never duplicates per image.
    slides.forEach(function (slide, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "mimir-gallery__dot";
      dot.setAttribute("aria-label", "Show screenshot " + (index + 1) + ": " + slide.title);
      dot.addEventListener("click", function () {
        goTo(index);
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function setFace(img, slide, isFront) {
      img.src = slide.src;
      img.alt = isFront ? slide.alt : "";
    }

    function syncState() {
      var slide = slides[current];
      // Screen-reader-only announcement (no visible caption). Kept concise so
      // it never reintroduces the on-screen footer text that was removed.
      caption.textContent =
        slide.title + ", screenshot " + (current + 1) + " of " + slides.length;
      dots.forEach(function (dot, index) {
        if (index === current) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    }

    function setControlsDisabled(disabled) {
      prevBtn.disabled = disabled;
      nextBtn.disabled = disabled;
    }

    function finish(targetIndex, slide) {
      // Front face already carries the destination image; releasing the
      // animation returns the card to its 0deg base — visually identical to 360.
      card.style.transform = "";
      setFace(frontImg, slide, true);
      current = targetIndex;
      syncState();
      isAnimating = false;
      setControlsDisabled(false);
    }

    function rotate(targetIndex, direction) {
      var slide = slides[targetIndex];
      isAnimating = true;
      setControlsDisabled(true);

      // Keep the CURRENT image on both faces through the spin, so the face the
      // viewer sees never changes mid-rotation. The front is swapped to the
      // destination only near the final edge-on point (~270deg) while it is
      // hidden, so the new screenshot is revealed as the phone completes its
      // turn — the swap itself is never visible.
      setFace(backImg, slides[current], false);

      var endDeg = 360 * direction; // +360 next (clockwise), -360 prev (counter)
      var anim = card.animate(
        [
          { transform: "rotateY(0deg)" },
          { transform: "rotateY(" + endDeg + "deg)" },
        ],
        { duration: DURATION, easing: EASING }
      );

      // While the front face is hidden (past the second edge-on crossing),
      // swap it to the destination so it faces forward when it re-emerges.
      var swapTimer = window.setTimeout(function () {
        setFace(frontImg, slide, true);
      }, DURATION * SWAP_FRACTION);

      // Settle exactly once. A watchdog guarantees the gallery never stays
      // locked even if the animation is paused/interrupted (e.g. the tab is
      // backgrounded mid-spin, so `onfinish` never fires).
      var settled = false;
      function settle() {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(swapTimer);
        window.clearTimeout(watchdog);
        try {
          anim.cancel();
        } catch (e) {
          /* no-op */
        }
        finish(targetIndex, slide);
      }
      var watchdog = window.setTimeout(settle, DURATION + 400);

      anim.onfinish = settle;
      anim.oncancel = function () {
        // A programmatic cancel from settle() must not re-enter.
        if (!settled) {
          settle();
        }
      };
    }

    function crossfade(targetIndex) {
      var slide = slides[targetIndex];
      isAnimating = true;
      setControlsDisabled(true);

      // Overlay the destination flat on top of the current image and fade in.
      backImg.style.transform = "none";
      setFace(backImg, slide, false);
      backImg.style.opacity = "0";
      // Force reflow so the following opacity change animates.
      void backImg.offsetWidth;
      backImg.style.opacity = "1";

      window.setTimeout(function () {
        setFace(frontImg, slide, true);
        backImg.style.opacity = "0";
        backImg.style.transform = ""; // restore rotateY(180) base for next spin
        current = targetIndex;
        syncState();
        isAnimating = false;
        setControlsDisabled(false);
      }, 260);
    }

    function animateTo(targetIndex, direction) {
      if (isAnimating || targetIndex === current) {
        return;
      }
      if (prefersReducedMotion()) {
        crossfade(targetIndex);
      } else {
        rotate(targetIndex, direction);
      }
    }

    function next() {
      animateTo((current + 1) % slides.length, 1);
    }

    function prev() {
      animateTo((current - 1 + slides.length) % slides.length, -1);
    }

    // Jump to any index via the shortest logical rotation direction.
    function goTo(targetIndex) {
      if (targetIndex === current) {
        return;
      }
      var n = slides.length;
      var forward = (targetIndex - current + n) % n;
      var backward = (current - targetIndex + n) % n;
      animateTo(targetIndex, forward <= backward ? 1 : -1);
    }

    nextBtn.addEventListener("click", next);
    prevBtn.addEventListener("click", prev);

    // Keyboard support while focus is anywhere inside the gallery.
    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    });

    // Horizontal swipe — only acts on release, so vertical scrolling is never
    // hijacked and only a clearly intentional horizontal drag triggers a change.
    var touchStartX = 0;
    var touchStartY = 0;
    var tracking = false;
    var SWIPE_THRESHOLD = 40;

    root.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) {
          return;
        }
        tracking = true;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    root.addEventListener(
      "touchend",
      function (event) {
        if (!tracking) {
          return;
        }
        tracking = false;
        var touch = event.changedTouches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2) {
          if (dx < 0) {
            next();
          } else {
            prev();
          }
        }
      },
      { passive: true }
    );

    // Initial paint.
    setFace(frontImg, slides[current], true);
    syncState();
  }

  function boot() {
    var galleries = document.querySelectorAll("[data-mimir-gallery]");
    for (var i = 0; i < galleries.length; i++) {
      init(galleries[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
