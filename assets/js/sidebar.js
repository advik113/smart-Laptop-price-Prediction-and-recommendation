/* ==========================================================================
   SMART LAPTOP ADVISOR — SIDEBAR BEHAVIOR (JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtnInner = document.getElementById("sidebar-toggle-inner");
  const toggleBtnHeader = document.getElementById("sidebar-toggle-header");
  const body = document.body;

  // Add mobile backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "mobile-sidebar-backdrop";
  body.appendChild(backdrop);

  // Initialize state from LocalStorage
  const isCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
  
  // Apply initial desktop state if screen is wide
  if (window.innerWidth > 768) {
    if (isCollapsed) {
      sidebar.classList.add("collapsed");
      body.classList.add("sidebar-collapsed-active");
    } else {
      sidebar.classList.remove("collapsed");
      body.classList.remove("sidebar-collapsed-active");
    }
  }

  // Toggle handlers
  function toggleSidebar() {
    if (window.innerWidth <= 768) {
      // Mobile toggle logic (sliding drawers)
      sidebar.classList.toggle("mobile-open");
      backdrop.classList.toggle("active");
    } else {
      // Desktop toggle logic (collapsing width)
      const nowCollapsed = sidebar.classList.toggle("collapsed");
      body.classList.toggle("sidebar-collapsed-active", nowCollapsed);
      localStorage.setItem("sidebar-collapsed", nowCollapsed);
    }
  }

  if (toggleBtnInner) toggleBtnInner.addEventListener("click", toggleSidebar);
  if (toggleBtnHeader) toggleBtnHeader.addEventListener("click", toggleSidebar);
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("mobile-open");
    backdrop.classList.remove("active");
  });

  // Handle window resizing
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      sidebar.classList.remove("mobile-open");
      backdrop.classList.remove("active");
      
      const persistedCollapse = localStorage.getItem("sidebar-collapsed") === "true";
      sidebar.classList.toggle("collapsed", persistedCollapse);
      body.classList.toggle("sidebar-collapsed-active", persistedCollapse);
    } else {
      sidebar.classList.remove("collapsed");
      body.classList.remove("sidebar-collapsed-active");
    }
  });

  // Highlight active sidebar navigation links based on URL path
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navItems = document.querySelectorAll(".nav-item");
  
  navItems.forEach(item => {
    const href = item.getAttribute("href");
    if (href === currentPath || (currentPath === "index.html" && href === "index.html") || (currentPath === "" && href === "index.html")) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
});
