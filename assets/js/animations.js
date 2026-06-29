/* ==========================================================================
   SMART LAPTOP ADVISOR — ANIMATIONS (JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Page loader fade out
  const loaderOverlay = document.getElementById("loader-overlay");
  if (loaderOverlay) {
    setTimeout(() => {
      loaderOverlay.style.opacity = "0";
      loaderOverlay.style.visibility = "hidden";
    }, 300); // Small delay for premium feel
  }

  // Intersection Observer for scroll reveal animations
  const revealElements = document.querySelectorAll(".scroll-reveal");
  if ("IntersectionObserver" in window && revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target); // Trigger once
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback if IntersectionObserver is not supported
    revealElements.forEach(el => el.classList.add("active"));
  }
});
