/* ==========================================================================
   SMART LAPTOP ADVISOR — THEME SYSTEM (JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("theme-toggle");
  
  // Get active theme from localStorage or default to dark
  const currentTheme = localStorage.getItem("theme") || "dark";
  
  if (currentTheme === "light") {
    document.documentElement.classList.add("light-mode");
    updateToggleIcon(true);
  } else {
    document.documentElement.classList.remove("light-mode");
    updateToggleIcon(false);
  }
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isLight = document.documentElement.classList.toggle("light-mode");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      updateToggleIcon(isLight);
      
      // Fire a custom event to redraw charts with correct themes if any
      const event = new CustomEvent("themeChanged", { detail: { isLight } });
      window.dispatchEvent(event);
    });
  }
  
  function updateToggleIcon(isLight) {
    if (!themeToggleBtn) return;
    if (isLight) {
      themeToggleBtn.innerHTML = "🌙";
      themeToggleBtn.setAttribute("title", "Switch to Dark Mode");
    } else {
      themeToggleBtn.innerHTML = "☀️";
      themeToggleBtn.setAttribute("title", "Switch to Light Mode");
    }
  }
});
