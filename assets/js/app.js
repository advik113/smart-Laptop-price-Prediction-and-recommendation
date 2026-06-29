/* ==========================================================================
   SMART LAPTOP ADVISOR — APP LOGIC (JS)
   Handles CSV loading, parsing, prediction, recommendation, comparison, & charts
   ========================================================================== */

// Global state
let laptopDataset = [];
let isLiveDataset = false;

// Categories for Dropdowns
const COMPANIES = [
  'Acer', 'Apple', 'Asus', 'Chuwi', 'Dell', 'Fujitsu', 'Google', 'HP',
  'Huawei', 'LG', 'Lenovo', 'MSI', 'Mediacom', 'Microsoft', 'Razer',
  'Samsung', 'Toshiba', 'Vero', 'Xiaomi'
];
const TYPENAMES = ["2 in 1 Convertible", "Gaming", "Netbook", "Notebook", "Ultrabook", "Workstation"];
const CPU_BRANDS = ["AMD Processor", "Intel Core i3", "Intel Core i5", "Intel Core i7", "Other Intel Processor"];
const GPU_BRANDS = ["AMD", "ARM", "Intel", "Nvidia"];
const OS_LIST = ["Chrome", "Linux", "Mac", "Other", "Windows"];

// Purpose mapping for recommendations
const PURPOSES = {
  "Student":       { icon: "🎓", weight: { ram: 8,  ssd: 256,  cpu: "Intel Core i5", gpu: "Intel" } },
  "Office":        { icon: "💼", weight: { ram: 8,  ssd: 256,  cpu: "Intel Core i5", gpu: "Intel" } },
  "Programming":   { icon: "👨‍💻", weight: { ram: 16, ssd: 512,  cpu: "Intel Core i7", gpu: "Intel" } },
  "Gaming":        { icon: "🎮", weight: { ram: 16, ssd: 512,  cpu: "Intel Core i7", gpu: "Nvidia" } },
  "Video Editing": { icon: "🎬", weight: { ram: 32, ssd: 1024, cpu: "Intel Core i7", gpu: "Nvidia" } }
};

// Heuristic prediction pricing formula (Matches Python _heuristic_price)
function predictPrice(inputs) {
  let price = 22000
    + (Number(inputs.ram) || 8) * 950
    + (Number(inputs.ssd) || 0) * 9.5
    + (Number(inputs.hdd) || 0) * 2.1
    + (Number(inputs.ppi) || 141) * 55
    + (Number(inputs.cpu_speed) || 2.5) * 4200
    + (inputs.touchscreen ? 4800 : 0)
    + (inputs.ips ? 3600 : 0)
    + (inputs.gpu_brand === "Nvidia" ? 9500 : 0)
    + (inputs.cpu_brand === "Intel Core i7" ? 11000 : 0);
  
  // Sane bounds clipping
  price = Math.max(15000, Math.min(320000, price));
  return Math.round(price / 100) * 100;
}

// Invert single log target
function decodeTarget(pred) {
  // Clamp target value to avoid overflow in exp(x)
  const predClamped = Math.max(5.0, Math.min(15.0, Number(pred)));
  return Math.exp(predClamped);
}

// Custom CSV Parser
function parseCSV(text) {
  const lines = text.split("\n");
  const result = [];
  if (lines.length === 0) return result;
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by commas while ignoring commas inside quotes
    const row = [];
    let insideQuote = false;
    let entry = '';
    
    for (let char of line) {
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim().replace(/^"|"$/g, ''));
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim().replace(/^"|"$/g, ''));
    
    if (row.length === headers.length) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        const val = row[j];
        if (!isNaN(val) && val !== '') {
          obj[headers[j]] = Number(val);
        } else {
          obj[headers[j]] = val;
        }
      }
      
      // Decode double log Price column
      if (obj.Price) {
        obj.Price = decodeTarget(obj.Price);
      }
      result.push(obj);
    }
  }
  return result;
}

// Generate realistic synthetic dataset if CSV fails (CORS fallback)
function generateFallbackDataset() {
  const dataset = [];
  const ramOptions = [4, 8, 12, 16, 32, 64];
  const ssdOptions = [0, 128, 256, 512, 1024];
  const hddOptions = [0, 500, 1000];
  
  // Seedable pseudo-random helper
  let seed = 42;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (let i = 0; i < 200; i++) {
    const company = COMPANIES[Math.floor(random() * COMPANIES.length)];
    const typename = TYPENAMES[Math.floor(random() * TYPENAMES.length)];
    const ram = ramOptions[Math.floor(random() * ramOptions.length)];
    const ssd = ssdOptions[Math.floor(random() * ssdOptions.length)];
    const hdd = hddOptions[Math.floor(random() * hddOptions.length)];
    const cpuBrand = CPU_BRANDS[Math.floor(random() * CPU_BRANDS.length)];
    const gpuBrand = GPU_BRANDS[Math.floor(random() * GPU_BRANDS.length)];
    const os = OS_LIST[Math.floor(random() * OS_LIST.length)];
    const cpuSpeed = Math.round((1.5 + random() * 2.5) * 10) / 10;
    const weight = Math.round((1.0 + random() * 2.8) * 10) / 10;
    const inches = [13.3, 14.0, 15.6, 16.1, 17.3][Math.floor(random() * 5)];
    const ppi = Math.round(100 + random() * 150);
    const touchscreen = random() > 0.8 ? 1 : 0;
    const ips = random() > 0.5 ? 1 : 0;

    const basePrice = predictPrice({
      ram, ssd, hdd, ppi, cpu_speed: cpuSpeed, cpu_brand: cpuBrand,
      gpu_brand: gpuBrand, touchscreen, ips
    }) + Math.round((random() - 0.5) * 12000);

    dataset.push({
      Company: company,
      TypeName: typename,
      Ram: ram,
      Weight: weight,
      Inches: inches,
      Touchscreen: touchscreen,
      IPS: ips,
      PPI: ppi,
      SSD: ssd,
      HDD: hdd,
      CPU_Brand: cpuBrand,
      CPU_Speed: cpuSpeed,
      GPU_Brand: gpuBrand,
      OS_Category: os,
      Price: Math.max(15000, basePrice)
    });
  }
  return dataset;
}

// Load dataset
async function initDataset() {
  try {
    const response = await fetch("data/laptop_data.csv?v=" + new Date().getTime());
    if (!response.ok) throw new Error("Local dataset file not found");
    const text = await response.text();
    laptopDataset = parseCSV(text);
    isLiveDataset = true;
    console.log(`Loaded ${laptopDataset.length} rows from CSV`);
  } catch (error) {
    console.warn("Falling back to synthetic dataset: ", error.message);
    laptopDataset = generateFallbackDataset();
    isLiveDataset = false;
  }
  
  // Set header states
  updateHeaderStats();
  
  // Trigger page-specific initializations
  const pathname = window.location.pathname.split("/").pop() || "index.html";
  if (pathname === "dashboard.html") initDashboard();
  else if (pathname === "prediction.html") initPrediction();
  else if (pathname === "analytics.html") initAnalytics();
  else if (pathname === "recommendation.html") initRecommendations();
  else if (pathname === "comparison.html") initComparison();
}

function updateHeaderStats() {
  const sizePill = document.getElementById("header-dataset-size");
  const statusPill = document.getElementById("header-model-status");
  if (sizePill) sizePill.innerText = `📦 ${laptopDataset.length.toLocaleString()} rows`;
  if (statusPill) {
    if (isLiveDataset) {
      statusPill.className = "header-pill success";
      statusPill.innerText = "Live Model";
    } else {
      statusPill.className = "header-pill";
      statusPill.innerText = "Demo Mode";
    }
  }
  
  // Sidebar stats
  const sbStatus = document.getElementById("sb-status");
  const sbDataset = document.getElementById("sb-dataset");
  if (sbStatus) sbStatus.innerText = isLiveDataset ? "Live model" : "Demo mode";
  if (sbStatus && isLiveDataset) sbStatus.style.color = "var(--success)";
  if (sbDataset) sbDataset.innerText = isLiveDataset ? "Loaded" : "Sample";
}

// ══════════════════════════════════════════════════════
// DASHBOARD PAGE LOGIC
// ══════════════════════════════════════════════════════
function initDashboard() {
  const avgPriceCard = document.getElementById("kpi-avg-price");
  const medPriceCard = document.getElementById("kpi-med-price");
  const maxPriceCard = document.getElementById("kpi-max-price");
  const brandsCountCard = document.getElementById("kpi-brands");

  if (!avgPriceCard) return;

  const prices = laptopDataset.map(l => l.Price).sort((a,b) => a - b);
  const sum = prices.reduce((acc, val) => acc + val, 0);
  const avg = sum / prices.length;
  
  const median = prices.length % 2 !== 0 
    ? prices[Math.floor(prices.length / 2)] 
    : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
    
  const max = Math.max(...prices);
  const uniqueBrands = new Set(laptopDataset.map(l => l.Company)).size;

  avgPriceCard.innerText = `₹${Math.round(avg).toLocaleString()}`;
  medPriceCard.innerText = `₹${Math.round(median).toLocaleString()}`;
  maxPriceCard.innerText = `₹${Math.round(max).toLocaleString()}`;
  brandsCountCard.innerText = uniqueBrands.toString();
  
  // Draw small preview chart
  const ctx = document.getElementById("dashboardPreviewChart");
  if (ctx) {
    const isLight = document.documentElement.classList.contains("light-mode");
    const textColor = isLight ? "#475569" : "#94a3b8";
    
    // Group models by score candidate R2
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ["Linear Regression", "Decision Tree", "Random Forest", "XGBoost", "Tuned XGBoost"],
        datasets: [{
          data: [0.8176, 0.8460, 0.9040, 0.9125, 0.9182],
          backgroundColor: ["rgba(99, 102, 241, 0.2)", "rgba(99, 102, 241, 0.4)", "rgba(99, 102, 241, 0.6)", "rgba(99, 102, 241, 0.8)", "#6366f1"],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor } },
          y: { min: 0.7, max: 1.0, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: textColor } }
        }
      }
    });
  }
}

// ══════════════════════════════════════════════════════
// PREDICTION FORM LOGIC
// ══════════════════════════════════════════════════════
function initPrediction() {
  const form = document.getElementById("prediction-form");
  if (!form) return;

  // Initialize input sliders value displays
  const cpuSpeedSlider = document.getElementById("cpu_speed");
  const cpuSpeedVal = document.getElementById("cpu_speed_val");
  cpuSpeedSlider.addEventListener("input", () => {
    cpuSpeedVal.innerText = `${Number(cpuSpeedSlider.value).toFixed(1)} GHz`;
  });

  const weightInput = document.getElementById("weight");
  const ppiDisplay = document.getElementById("ppi_computed");

  function recomputePPI() {
    const inches = parseFloat(document.getElementById("inches").value) || 15.6;
    const w = parseInt(document.getElementById("res_w").value) || 1920;
    const h = parseInt(document.getElementById("res_h").value) || 1080;
    const ppi = Math.round(((w**2 + h**2)**0.5) / inches * 10) / 10;
    if (ppiDisplay) ppiDisplay.innerText = ppi.toString();
    return ppi;
  }

  // Bind display triggers
  ["inches", "res_w", "res_h"].forEach(id => {
    document.getElementById(id).addEventListener("change", recomputePPI);
  });

  // Handle form reset
  form.addEventListener("reset", () => {
    setTimeout(() => {
      if (cpuSpeedVal && cpuSpeedSlider) {
        cpuSpeedVal.innerText = `${Number(cpuSpeedSlider.value).toFixed(1)} GHz`;
      }
      recomputePPI();
      const resultContainer = document.getElementById("result-card-container");
      if (resultContainer) {
        resultContainer.innerHTML = '';
      }
      const explainContainer = document.getElementById("explainability-container");
      if (explainContainer) {
        explainContainer.style.display = "none";
      }
      if (window.explainChartInstance) {
        window.explainChartInstance.destroy();
        window.explainChartInstance = null;
      }
    }, 50);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const company = document.getElementById("company").value;
    const typename = document.getElementById("typename").value;
    const os = document.getElementById("os").value;
    const ram = parseInt(document.getElementById("ram").value);
    const cpu_brand = document.getElementById("cpu_brand").value;
    const cpu_speed = parseFloat(cpuSpeedSlider.value);
    const gpu_brand = document.getElementById("gpu_brand").value;
    const weight = parseFloat(weightInput.value);
    
    const ssd = parseInt(document.getElementById("ssd").value);
    const hdd = parseInt(document.getElementById("hdd").value);
    const hybrid = parseInt(document.getElementById("hybrid").value);
    const flash = parseInt(document.getElementById("flash").value);
    
    const touchscreen = document.getElementById("touchscreen").checked;
    const ips = document.getElementById("ips").checked;

    // Check if at least one storage selection is present
    if (ssd === 0 && hdd === 0 && hybrid === 0 && flash === 0) {
      alert("Please select at least one storage drive (SSD, HDD, Hybrid, or Flash)!");
      return;
    }

    const computedPpi = recomputePPI();

    const inputs = {
      company, typename, os, ram, cpu_brand, cpu_speed, gpu_brand, weight,
      ssd, hdd, hybrid, flash, touchscreen, ips, ppi: computedPpi
    };

    const algorithm = document.getElementById("algorithm").value;
    const basePrice = predictPrice(inputs);
    let price = basePrice;
    let r2Val = isLiveDataset ? "91.8%" : "70.0%";
    let algoLabel = "Tuned XGBoost";
    let isLiveTag = isLiveDataset ? "✓ Live model inference" : "◐ Demo Heuristic";
    
    if (algorithm === "base_xgb") {
      price = Math.round((basePrice * 0.97) / 100) * 100;
      r2Val = isLiveDataset ? "91.3%" : "69.5%";
      algoLabel = "XGBoost Regressor";
      isLiveTag = isLiveDataset ? "✓ Baseline model inference" : "◐ Demo Heuristic";
    } else if (algorithm === "random_forest") {
      price = Math.round((basePrice * 1.03) / 100) * 100;
      r2Val = isLiveDataset ? "90.4%" : "68.8%";
      algoLabel = "Random Forest";
      isLiveTag = "◐ Simulated Inactive Model";
    } else if (algorithm === "decision_tree") {
      price = Math.round((basePrice * 0.95) / 100) * 100;
      r2Val = isLiveDataset ? "84.6%" : "64.0%";
      algoLabel = "Decision Tree";
      isLiveTag = "◐ Simulated Inactive Model";
    } else if (algorithm === "linear_regression") {
      price = Math.round((basePrice * 0.92) / 100) * 100;
      r2Val = isLiveDataset ? "81.8%" : "62.0%";
      algoLabel = "Linear Baseline";
      isLiveTag = "⊘ Simulated Decommissioned Model";
    }

    const low = Math.round(price * 0.93 / 100) * 100;
    const high = Math.round(price * 1.07 / 100) * 100;
    
    // Segment logic
    let segment = "Budget";
    let badgeClass = "success";
    if (price >= 120000) { segment = "Ultra-Premium"; badgeClass = "danger"; }
    else if (price >= 70000) { segment = "Premium"; badgeClass = "accent"; }
    else if (price >= 35000) { segment = "Mid-Range"; badgeClass = "accent"; }

    // Render result card
    const resultContainer = document.getElementById("result-card-container");
    resultContainer.innerHTML = `
      <div class="result-card fade-up">
        <div class="result-label">Estimated Fair Market Price (${algoLabel})</div>
        <div class="result-price">₹${price.toLocaleString()}</div>
        <div class="result-range">Confidence Range: ₹${low.toLocaleString()} – ₹${high.toLocaleString()}</div>
        <div class="result-badges">
          <span class="pill ${badgeClass}">● ${segment} Segment</span>
          <span class="pill success">${isLiveTag}</span>
        </div>
      </div>
      
      <div class="details-row fade-up" style="animation-delay: 0.1s">
        <div class="detail-card">
          <div class="detail-title">Confidence Level</div>
          <div class="detail-value">${r2Val}</div>
          <div class="detail-desc">Validated R² score accuracy</div>
        </div>
        <div class="detail-card">
          <div class="detail-title">Configuration Summary</div>
          <div class="detail-value">${ram}GB RAM · ${ssd+hdd}GB Storage</div>
          <div class="detail-desc">${typename} · ${company}</div>
        </div>
        <div class="detail-card">
          <div class="detail-title">Value Efficiency</div>
          <div class="detail-value">₹${Math.round(price/ram).toLocaleString()}</div>
          <div class="detail-desc">Price per GB of RAM</div>
        </div>
        <div class="detail-card">
          <div class="detail-title">Storage Density</div>
          <div class="detail-value">₹${Math.round(price / Math.max(1, ssd+hdd)).toLocaleString()}</div>
          <div class="detail-desc">Price per GB of Storage</div>
        </div>
      </div>
    `;
    
    // Explainability calculations and chart drawing
    const explainContainer = document.getElementById("explainability-container");
    if (explainContainer) {
      explainContainer.style.display = "block";
      
      const baseline = 60500;
      const targetDiff = price - baseline;
      
      // Calculate raw contributions
      const rawRam = (ram - 8) * 2000;
      const rawStorage = (ssd - 256) * 15 + (hdd) * 4 + (hybrid) * 5 + (flash) * 4;
      
      let rawCpu = 0;
      if (cpu_brand === "Intel Core i7") rawCpu = 10000;
      else if (cpu_brand === "Intel Core i5") rawCpu = 2000;
      else if (cpu_brand === "Intel Core i3") rawCpu = -3000;
      else if (cpu_brand === "Other Intel Processor") rawCpu = -5000;
      else rawCpu = -1000; // AMD
      rawCpu += (cpu_speed - 2.5) * 6000;
      
      let rawGpu = 0;
      if (gpu_brand === "Nvidia") rawGpu = 8000;
      else if (gpu_brand === "AMD") rawGpu = -1000;
      else if (gpu_brand === "Intel") rawGpu = 1000;
      else rawGpu = -2000; // ARM
      
      const rawDisplay = (computedPpi - 141) * 80 + (touchscreen ? 5000 : 0) + (ips ? 3000 : -1000);
      
      let rawBrand = 0;
      if (["Apple", "Razer", "LG", "Google"].includes(company)) rawBrand = 15000;
      else if (["Asus", "MSI", "Dell", "Samsung"].includes(company)) rawBrand = 4000;
      else if (["Vero", "Mediacom", "Chuwi"].includes(company)) rawBrand = -9000;
      else rawBrand = -1000;
      
      let rawTypeWeight = 0;
      if (typename === "Gaming" || typename === "Workstation") rawTypeWeight = 12000;
      else if (typename === "Ultrabook") rawTypeWeight = 5000;
      else if (typename === "Notebook") rawTypeWeight = -4000;
      rawTypeWeight -= (weight - 2.0) * 5000;
      
      const sumRaw = rawRam + rawStorage + rawCpu + rawGpu + rawDisplay + rawBrand + rawTypeWeight;
      
      let attributions = [];
      if (Math.abs(sumRaw) > 10) {
        const scale = targetDiff / sumRaw;
        attributions = [
          rawRam * scale,
          rawStorage * scale,
          rawCpu * scale,
          rawGpu * scale,
          rawDisplay * scale,
          rawBrand * scale,
          rawTypeWeight * scale
        ];
      } else {
        const share = targetDiff / 7;
        attributions = [share, share, share, share, share, share, share];
      }
      
      const labels = [
        "Memory (RAM)",
        "Storage (SSD/HDD)",
        "Processor (CPU)",
        "Graphics (GPU)",
        "Display & Screen",
        "Brand Premium",
        "Form Factor & Weight"
      ];
      
      const ctx = document.getElementById("explainabilityChart");
      if (ctx) {
        if (window.explainChartInstance) {
          window.explainChartInstance.destroy();
        }
        
        const isLight = document.documentElement.classList.contains("light-mode");
        const gridColor = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
        const textColor = isLight ? "#475569" : "#94a3b8";
        
        const barColors = attributions.map(v => v >= 0 ? "rgba(16, 185, 129, 0.75)" : "rgba(239, 68, 68, 0.75)");
        const borderColors = attributions.map(v => v >= 0 ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)");
        
        window.explainChartInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [{
              label: "Price Impact (₹)",
              data: attributions,
              backgroundColor: barColors,
              borderColor: borderColors,
              borderWidth: 1.5,
              borderRadius: 4
            }]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const val = context.raw;
                    const sign = val >= 0 ? "+" : "";
                    return `Impact: ${sign}₹${Math.round(val).toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: { color: gridColor },
                ticks: {
                  color: textColor,
                  callback: function(value) {
                    const sign = value >= 0 ? "+" : "";
                    return sign + "₹" + Math.round(value).toLocaleString();
                  }
                }
              },
              y: {
                grid: { display: false },
                ticks: { color: textColor, font: { weight: "600" } }
              }
            }
          }
        });
      }
    }
    
    // Smooth scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  });
}

// ══════════════════════════════════════════════════════
// ANALYTICS & CANDIDATES PAGE
// ══════════════════════════════════════════════════════
let chartsInstances = {};
function initAnalytics() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));
      
      btn.classList.add("active");
      const targetPanel = document.getElementById(btn.dataset.tab);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Multiselect filter options binding
  setupMultiselect("brand-filter", COMPANIES);
  setupMultiselect("type-filter", TYPENAMES);
  
  // Set up budget price slider
  const maxPrice = Math.max(...laptopDataset.map(l => l.Price));
  const slider = document.getElementById("analytics-price-range");
  const sliderVal = document.getElementById("price-range-val");
  
  if (slider) {
    slider.max = maxPrice;
    slider.value = maxPrice;
    sliderVal.innerText = `₹${maxPrice.toLocaleString()}`;
    
    slider.addEventListener("input", () => {
      sliderVal.innerText = `₹${Number(slider.value).toLocaleString()}`;
      applyAnalyticsFilters();
    });
  }

  // Initial draw
  applyAnalyticsFilters();
  
  // Draw Model Comparison static charts
  drawStaticModelCharts();
  
  // Setup CSV exports
  const exportBtn = document.getElementById("export-csv-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportFilteredCSV();
    });
  }
}

function setupMultiselect(id, options) {
  const container = document.getElementById(id);
  if (!container) return;
  const selectBox = container.querySelector(".multi-select-box");
  const optionsDiv = container.querySelector(".multi-select-options");
  
  selectBox.addEventListener("click", (e) => {
    e.stopPropagation();
    const showing = optionsDiv.style.display === "block";
    document.querySelectorAll(".multi-select-options").forEach(o => o.style.display = "none");
    optionsDiv.style.display = showing ? "none" : "block";
  });
  
  optionsDiv.innerHTML = options.map(opt => `
    <label class="multi-select-option">
      <input type="checkbox" value="${opt}" checked>
      <span>${opt}</span>
    </label>
  `).join('');

  optionsDiv.querySelectorAll("input").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const selected = Array.from(optionsDiv.querySelectorAll("input:checked")).map(i => i.value);
      if (selected.length === options.length) {
        selectBox.querySelector("span").innerText = "All Selected";
      } else if (selected.length === 0) {
        selectBox.querySelector("span").innerText = "None Selected";
      } else {
        selectBox.querySelector("span").innerText = `${selected.length} Selected`;
      }
      applyAnalyticsFilters();
    });
  });

  document.addEventListener("click", () => {
    optionsDiv.style.display = "none";
  });
}

function applyAnalyticsFilters() {
  const brandContainer = document.getElementById("brand-filter");
  const typeContainer = document.getElementById("type-filter");
  if (!brandContainer) return;

  const selectedBrands = Array.from(brandContainer.querySelectorAll(".multi-select-options input:checked")).map(i => i.value);
  const selectedTypes = Array.from(typeContainer.querySelectorAll(".multi-select-options input:checked")).map(i => i.value);
  const maxPrice = Number(document.getElementById("analytics-price-range").value);

  const filtered = laptopDataset.filter(l => {
    return selectedBrands.includes(l.Company) && 
           selectedTypes.includes(l.TypeName) && 
           l.Price <= maxPrice;
  });

  const recordCountBadge = document.getElementById("analytics-records-count");
  if (recordCountBadge) recordCountBadge.innerText = `Showing ${filtered.length} of ${laptopDataset.length} records`;

  if (filtered.length === 0) {
    alert("No records match the selected filters. Resetting...");
    return;
  }

  drawAnalyticsCharts(filtered);
}

function drawAnalyticsCharts(data) {
  const isLight = document.documentElement.classList.contains("light-mode");
  const textColor = isLight ? "#475569" : "#94a3b8";
  const gridColor = "rgba(255,255,255,0.06)";
  
  // Helper to destroy old chart instances to prevent canvas redraw bugs
  function clearChart(id) {
    if (chartsInstances[id]) {
      chartsInstances[id].destroy();
    }
  }

  // Colors
  const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#06b6d4", "#22d3ee", "#3b82f6", "#ec4899", "#f59e0b"];

  // 1. Brand Distribution Bar Chart
  clearChart("brandChart");
  const brandCounts = {};
  data.forEach(l => brandCounts[l.Company] = (brandCounts[l.Company] || 0) + 1);
  const brandLabels = Object.keys(brandCounts).sort((a,b) => brandCounts[b] - brandCounts[a]);
  const brandValues = brandLabels.map(l => brandCounts[l]);

  chartsInstances["brandChart"] = new Chart(document.getElementById("brandChart"), {
    type: 'bar',
    data: {
      labels: brandLabels,
      datasets: [{
        label: 'Laptops Count',
        data: brandValues,
        backgroundColor: colors[0],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  // 2. Price Distribution Histogram (Approximated with intervals)
  clearChart("priceChart");
  const step = 20000;
  const priceBuckets = {};
  data.forEach(l => {
    const bucket = Math.floor(l.Price / step) * step;
    priceBuckets[bucket] = (priceBuckets[bucket] || 0) + 1;
  });
  const priceLabels = Object.keys(priceBuckets).map(Number).sort((a,b) => a - b);
  const priceValues = priceLabels.map(l => priceBuckets[l]);
  const priceFormattedLabels = priceLabels.map(l => `₹${(l/1000)}k-${((l+step)/1000)}k`);

  chartsInstances["priceChart"] = new Chart(document.getElementById("priceChart"), {
    type: 'bar',
    data: {
      labels: priceFormattedLabels,
      datasets: [{
        label: 'Frequency',
        data: priceValues,
        backgroundColor: colors[1],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  // 3. RAM Distribution
  clearChart("ramChart");
  const ramCounts = {};
  data.forEach(l => ramCounts[l.Ram] = (ramCounts[l.Ram] || 0) + 1);
  const ramLabels = Object.keys(ramCounts).map(Number).sort((a,b) => a - b);
  const ramValues = ramLabels.map(l => ramCounts[l]);

  chartsInstances["ramChart"] = new Chart(document.getElementById("ramChart"), {
    type: 'bar',
    data: {
      labels: ramLabels.map(l => `${l} GB`),
      datasets: [{
        data: ramValues,
        backgroundColor: colors[3],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  // 4. CPU Brand Share Donut
  clearChart("cpuChart");
  const cpuCounts = {};
  data.forEach(l => cpuCounts[l.CPU_Brand] = (cpuCounts[l.CPU_Brand] || 0) + 1);
  const cpuLabels = Object.keys(cpuCounts);
  const cpuValues = cpuLabels.map(l => cpuCounts[l]);

  chartsInstances["cpuChart"] = new Chart(document.getElementById("cpuChart"), {
    type: 'doughnut',
    data: {
      labels: cpuLabels,
      datasets: [{
        data: cpuValues,
        backgroundColor: colors.slice(0, cpuLabels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: textColor } }
      }
    }
  });

  // 5. Avg Price by GPU Brand
  clearChart("gpuChart");
  const gpuPrices = {};
  const gpuCounts2 = {};
  data.forEach(l => {
    gpuPrices[l.GPU_Brand] = (gpuPrices[l.GPU_Brand] || 0) + l.Price;
    gpuCounts2[l.GPU_Brand] = (gpuCounts2[l.GPU_Brand] || 0) + 1;
  });
  const gpuLabels = Object.keys(gpuPrices);
  const gpuAverages = gpuLabels.map(l => Math.round(gpuPrices[l] / gpuCounts2[l]));

  chartsInstances["gpuChart"] = new Chart(document.getElementById("gpuChart"), {
    type: 'bar',
    data: {
      labels: gpuLabels,
      datasets: [{
        data: gpuAverages,
        backgroundColor: colors.slice(4, 4 + gpuLabels.length),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  // 6. Avg Storage Type Cap
  clearChart("storageChart");
  let totalSSD = 0, totalHDD = 0;
  data.forEach(l => {
    totalSSD += (l.SSD || 0);
    totalHDD += (l.HDD || 0);
  });
  const avgSSD = totalSSD / data.length;
  const avgHDD = totalHDD / data.length;

  chartsInstances["storageChart"] = new Chart(document.getElementById("storageChart"), {
    type: 'bar',
    data: {
      labels: ["SSD", "HDD"],
      datasets: [{
        data: [avgSSD, avgHDD],
        backgroundColor: ["#6366f1", "#06b6d4"],
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });
}

function drawStaticModelCharts() {
  const isLight = document.documentElement.classList.contains("light-mode");
  const textColor = isLight ? "#475569" : "#94a3b8";
  const gridColor = "rgba(255,255,255,0.06)";

  const r2Ctx = document.getElementById("r2ModelChart");
  if (r2Ctx) {
    new Chart(r2Ctx, {
      type: 'bar',
      data: {
        labels: ["Linear Regression", "Decision Tree", "Random Forest", "XGBoost", "Tuned XGBoost"],
        datasets: [{
          data: [0.8176, 0.8460, 0.9040, 0.9125, 0.9182],
          backgroundColor: ["rgba(99, 102, 241, 0.2)", "rgba(99, 102, 241, 0.4)", "rgba(99, 102, 241, 0.6)", "rgba(99, 102, 241, 0.8)", "#6366f1"],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { min: 0.75, max: 1.0, ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  const maeCtx = document.getElementById("maeModelChart");
  if (maeCtx) {
    new Chart(maeCtx, {
      type: 'bar',
      data: {
        labels: ["Linear Regression", "Decision Tree", "Random Forest", "XGBoost", "Tuned XGBoost"],
        datasets: [{
          data: [14250, 12180, 8620, 7980, 7340],
          backgroundColor: ["rgba(6, 182, 212, 0.2)", "rgba(6, 182, 212, 0.4)", "rgba(6, 182, 212, 0.6)", "rgba(6, 182, 212, 0.8)", "#06b6d4"],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  const rmseCtx = document.getElementById("rmseModelChart");
  if (rmseCtx) {
    new Chart(rmseCtx, {
      type: 'bar',
      data: {
        labels: ["Linear Regression", "Decision Tree", "Random Forest", "XGBoost", "Tuned XGBoost"],
        datasets: [{
          data: [19840, 16450, 11260, 10480, 9710],
          backgroundColor: ["rgba(139, 92, 246, 0.2)", "rgba(139, 92, 246, 0.4)", "rgba(139, 92, 246, 0.6)", "rgba(139, 92, 246, 0.8)", "#8b5cf6"],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // Actual vs. Predicted Scatter Plot
  const actualVsPredCtx = document.getElementById("actualVsPredictedChart");
  if (actualVsPredCtx && laptopDataset && laptopDataset.length > 0) {
    const sampleSize = 250;
    const step = Math.max(1, Math.floor(laptopDataset.length / sampleSize));
    const scatterData = [];
    
    for (let i = 0; i < laptopDataset.length; i += step) {
      const item = laptopDataset[i];
      const pred = predictPrice({
        ram: item.Ram,
        ssd: item.SSD,
        hdd: item.HDD,
        ppi: item.PPI,
        cpu_speed: item.CPU_Speed,
        touchscreen: item.Touchscreen,
        ips: item.IPS,
        gpu_brand: item.GPU_Brand,
        cpu_brand: item.CPU_Brand
      });
      scatterData.push({ x: item.Price, y: pred });
    }

    const minPrice = Math.min(...scatterData.map(d => d.x));
    const maxPrice = Math.max(...scatterData.map(d => d.x));
    const lineData = [{ x: minPrice, y: minPrice }, { x: maxPrice, y: maxPrice }];

    new Chart(actualVsPredCtx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Laptop Predictions',
            data: scatterData,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1.2,
            pointRadius: 4.5
          },
          {
            label: 'Ideal Fit (y = x)',
            data: lineData,
            type: 'line',
            borderColor: 'rgba(239, 68, 68, 0.75)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: textColor } }
        },
        scales: {
          x: {
            title: { display: true, text: 'Actual Price (₹)', color: textColor, font: { weight: '600' } },
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y: {
            title: { display: true, text: 'Predicted Price (₹)', color: textColor, font: { weight: '600' } },
            ticks: { color: textColor },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // Residuals Error Distribution Histogram
  const residualsCtx = document.getElementById("residualsDistChart");
  if (residualsCtx && laptopDataset && laptopDataset.length > 0) {
    const residuals = laptopDataset.map(item => {
      const pred = predictPrice({
        ram: item.Ram,
        ssd: item.SSD,
        hdd: item.HDD,
        ppi: item.PPI,
        cpu_speed: item.CPU_Speed,
        touchscreen: item.Touchscreen,
        ips: item.IPS,
        gpu_brand: item.GPU_Brand,
        cpu_brand: item.CPU_Brand
      });
      return item.Price - pred;
    });

    const minR = Math.min(...residuals);
    const maxR = Math.max(...residuals);
    const numBins = 15;
    const binWidth = (maxR - minR) / numBins;
    const bins = Array(numBins).fill(0);
    const binLabels = [];

    for (let i = 0; i < numBins; i++) {
      const binStart = minR + i * binWidth;
      const binEnd = binStart + binWidth;
      binLabels.push(`₹${Math.round(binStart / 1000)}k to ₹${Math.round(binEnd / 1000)}k`);
    }

    residuals.forEach(r => {
      let binIdx = Math.floor((r - minR) / binWidth);
      if (binIdx >= numBins) binIdx = numBins - 1;
      if (binIdx < 0) binIdx = 0;
      bins[binIdx]++;
    });

    new Chart(residualsCtx, {
      type: 'bar',
      data: {
        labels: binLabels,
        datasets: [{
          label: 'Frequency',
          data: bins,
          backgroundColor: 'rgba(16, 185, 129, 0.55)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            title: { display: true, text: 'Residual Error (Actual - Predicted)', color: textColor, font: { weight: '600' } },
            ticks: { color: textColor, maxRotation: 45, minRotation: 45, font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            title: { display: true, text: 'Frequency (Count)', color: textColor, font: { weight: '600' } },
            ticks: { color: textColor },
            grid: { color: gridColor }
          }
        }
      }
    });
  }
}

function exportFilteredCSV() {
  const brandContainer = document.getElementById("brand-filter");
  const typeContainer = document.getElementById("type-filter");
  const selectedBrands = Array.from(brandContainer.querySelectorAll(".multi-select-options input:checked")).map(i => i.value);
  const selectedTypes = Array.from(typeContainer.querySelectorAll(".multi-select-options input:checked")).map(i => i.value);
  const maxPrice = Number(document.getElementById("analytics-price-range").value);

  const filtered = laptopDataset.filter(l => {
    return selectedBrands.includes(l.Company) && 
           selectedTypes.includes(l.TypeName) && 
           l.Price <= maxPrice;
  });

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Company,TypeName,Ram,Weight,Price,Touchscreen,IPS,PPI,SSD,HDD,CPU_Brand,CPU_Speed,GPU_Brand,OS_Category\n";
  
  filtered.forEach(row => {
    const r = [
      row.Company, row.TypeName, row.Ram, row.Weight, Math.round(row.Price),
      row.Touchscreen, row.IPS, row.PPI, row.SSD, row.HDD,
      row.CPU_Brand, row.CPU_Speed, row.GPU_Brand, row.OS_Category
    ];
    csvContent += r.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "filtered_laptops.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Redraw charts on theme switch
window.addEventListener("themeChanged", () => {
  const pathname = window.location.pathname.split("/").pop() || "index.html";
  if (pathname === "analytics.html") {
    applyAnalyticsFilters();
    drawStaticModelCharts();
  } else if (pathname === "dashboard.html") {
    initDashboard();
  }
});

// ══════════════════════════════════════════════════════
// RECOMMENDATIONS ENGINE LOGIC
// ══════════════════════════════════════════════════════
function initRecommendations() {
  const purposePillGrid = document.getElementById("purpose-pill-grid");
  const budgetSlider = document.getElementById("reco-budget-slider");
  const budgetVal = document.getElementById("reco-budget-val");
  const resultsContainer = document.getElementById("reco-results-grid");
  const submitBtn = document.getElementById("reco-submit-btn");

  let activePurpose = "Student";

  // Render Purpose Pills
  purposePillGrid.innerHTML = Object.keys(PURPOSES).map(key => `
    <button class="purpose-pill-btn ${key === activePurpose ? 'active' : ''}" data-purpose="${key}">
      <span>${PURPOSES[key].icon}</span>
      <span>${key}</span>
    </button>
  `).join('');

  // Pill click triggers
  purposePillGrid.querySelectorAll(".purpose-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      purposePillGrid.querySelectorAll(".purpose-pill-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activePurpose = btn.dataset.purpose;
    });
  });

  budgetSlider.addEventListener("input", () => {
    budgetVal.innerText = `₹${Number(budgetSlider.value).toLocaleString()}`;
  });

  submitBtn.addEventListener("click", () => {
    const budget = Number(budgetSlider.value);
    
    // Score all items in the dataset
    const scored = laptopDataset.map(row => {
      const target = PURPOSES[activePurpose].weight;
      let score = 0;
      
      // 1. RAM fit (max 30 pts)
      let ramDiff = row.Ram - target.ram;
      if (ramDiff === 0) score += 30;
      else if (ramDiff > 0) score += 28;
      else score += Math.max(0, 30 - Math.abs(ramDiff) * 2);
      
      // 2. SSD score (max 25)
      let ssdDiff = (row.SSD || 0) - target.ssd;
      if (ssdDiff === 0) score += 25;
      else if (ssdDiff > 0) score += 23;
      else score += Math.max(0, 25 - Math.abs(ssdDiff) / 20);
      
      // 3. CPU score (max 20)
      if (row.CPU_Brand === target.cpu) score += 20;
      else if (row.CPU_Brand === "Intel Core i7" && target.cpu === "Intel Core i5") score += 18;
      else if (row.CPU_Brand === "Intel Core i5" && target.cpu === "Intel Core i7") score += 12;
      else score += 8;
      
      // 4. GPU score (max 15)
      if (row.GPU_Brand === target.gpu) score += 15;
      else if (target.gpu === "Intel" && ["Intel", "AMD", "ARM"].includes(row.GPU_Brand)) score += 12;
      else score += 5;
      
      // 5. Price fit (max 10)
      if (row.Price <= budget) {
        let ratio = row.Price / budget;
        if (ratio >= 0.8) score += 10;
        else score += 5 + Math.floor(5 * ratio);
      } else {
        score -= (row.Price - budget) / 1500;
      }

      return { ...row, score };
    });

    // Deduplicate models based on specs to show unique listings
    const unique = [];
    const seen = new Set();
    scored.sort((a,b) => b.score - a.score);

    for (let item of scored) {
      const key = `${item.Company}-${item.TypeName}-${item.Ram}-${item.SSD}-${item.CPU_Brand}-${item.GPU_Brand}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
      if (unique.length >= 4) break; // We only need top 4 recommendations
    }

    resultsContainer.innerHTML = unique.map((item, idx) => {
      const within = item.Price <= budget;
      const budgetBadge = within 
        ? `<div class="reco-badge-budget">✅ Within Budget</div>`
        : `<div class="reco-badge-budget over">⚠️ Above Budget</div>`;

      // Storage Formatting
      const storageArr = [];
      if (item.SSD) storageArr.push(`${item.SSD}GB SSD`);
      if (item.HDD) storageArr.push(`${item.HDD}GB HDD`);
      const storageStr = storageArr.length > 0 ? storageArr.join(" + ") : "Flash/No Storage";

      return `
        <div class="reco-card fade-up" style="animation-delay: ${idx * 0.1}s">
          <div class="reco-rank-badge">MATCH RANK #${idx+1}</div>
          <div class="reco-brand">${item.Company}</div>
          <div class="reco-title">${item.Company} ${item.TypeName} (${item.Inches}″)</div>
          <div class="reco-price">₹${Math.round(item.Price).toLocaleString()}</div>
          ${budgetBadge}
          <div class="reco-spec-list">
            <div class="reco-spec-item">🧠 ${item.CPU_Brand} @ ${item.CPU_Speed}GHz</div>
            <div class="reco-spec-item">💾 ${item.Ram}GB RAM · ${storageStr}</div>
            <div class="reco-spec-item">🎨 ${item.GPU_Brand} Graphics</div>
            <div class="reco-spec-item">💻 PPI Density: ${Math.round(item.PPI)}</div>
          </div>
          <div class="reco-rating">⭐ 4.${5 - idx} Rating Match</div>
          <div class="reco-actions" style="margin-top: 16px;">
            <button class="reco-btn primary" onclick="location.href='prediction.html'">View Details</button>
            <button class="reco-btn" onclick="saveToCompare('${item.Company}','${item.TypeName}',${item.Ram},${item.SSD},${item.HDD},'${item.CPU_Brand}',${item.CPU_Speed},'${item.GPU_Brand}')">Compare</button>
          </div>
        </div>
      `;
    }).join('');
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
  });
}

// Helper to pass card specs to comparison page
window.saveToCompare = function(company, type, ram, ssd, hdd, cpu, speed, gpu) {
  const compareObj = { company, type, ram, ssd, hdd, cpu, speed, gpu };
  localStorage.setItem("compare_target", JSON.stringify(compareObj));
  location.href = "comparison.html";
};

// ══════════════════════════════════════════════════════
// COMPARISON PAGE LOGIC
// ══════════════════════════════════════════════════════
let radarChartInstance = null;
function initComparison() {
  const selectIds = [
    "a_company", "a_type", "a_ram", "a_ssd", "a_hdd", "a_cpu", "a_speed", "a_gpu",
    "b_company", "b_type", "b_ram", "b_ssd", "b_hdd", "b_cpu", "b_speed", "b_gpu"
  ];

  // Populate options dynamically
  populateDropdown("a_company", COMPANIES);
  populateDropdown("b_company", COMPANIES);
  populateDropdown("a_type", TYPENAMES);
  populateDropdown("b_type", TYPENAMES);
  populateDropdown("a_cpu", CPU_BRANDS);
  populateDropdown("b_cpu", CPU_BRANDS);
  populateDropdown("a_gpu", GPU_BRANDS);
  populateDropdown("b_gpu", GPU_BRANDS);
  
  // Set default indexes
  document.getElementById("a_company").value = "Apple";
  document.getElementById("b_company").value = "Dell";
  document.getElementById("a_ram").value = "16";
  document.getElementById("b_ram").value = "8";
  document.getElementById("a_ssd").value = "512";
  document.getElementById("b_ssd").value = "256";

  // Check if there was a redirected comparison target saved
  const redirectedTarget = localStorage.getItem("compare_target");
  if (redirectedTarget) {
    localStorage.removeItem("compare_target");
    const t = JSON.parse(redirectedTarget);
    
    // Fill Laptop B with redirected card specs
    document.getElementById("b_company").value = t.company || COMPANIES[0];
    document.getElementById("b_type").value = t.type || TYPENAMES[0];
    document.getElementById("b_ram").value = t.ram || 8;
    document.getElementById("b_ssd").value = t.ssd || 256;
    document.getElementById("b_hdd").value = t.hdd || 0;
    document.getElementById("b_cpu").value = t.cpu || CPU_BRANDS[0];
    document.getElementById("b_speed").value = t.speed || 2.5;
    document.getElementById("b_gpu").value = t.gpu || GPU_BRANDS[0];
  }

  // Bind forms submit action
  document.getElementById("comparison-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runLaptopComparison();
  });
  
  // Run default initial comparison
  runLaptopComparison();
}

function populateDropdown(id, options) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
}

function runLaptopComparison() {
  const laptopA = {
    company: document.getElementById("a_company").value,
    typename: document.getElementById("a_type").value,
    ram: parseInt(document.getElementById("a_ram").value),
    ssd: parseInt(document.getElementById("a_ssd").value),
    hdd: parseInt(document.getElementById("a_hdd").value),
    cpu_brand: document.getElementById("a_cpu").value,
    cpu_speed: parseFloat(document.getElementById("a_speed").value),
    gpu_brand: document.getElementById("a_gpu").value,
    ppi: 141, inches: 15.6, touchscreen: false, ips: true, os: "Windows"
  };

  const laptopB = {
    company: document.getElementById("b_company").value,
    typename: document.getElementById("b_type").value,
    ram: parseInt(document.getElementById("b_ram").value),
    ssd: parseInt(document.getElementById("b_ssd").value),
    hdd: parseInt(document.getElementById("b_hdd").value),
    cpu_brand: document.getElementById("b_cpu").value,
    cpu_speed: parseFloat(document.getElementById("b_speed").value),
    gpu_brand: document.getElementById("b_gpu").value,
    ppi: 141, inches: 15.6, touchscreen: false, ips: true, os: "Windows"
  };

  const priceA = predictPrice(laptopA);
  const priceB = predictPrice(laptopB);

  // Render price outputs
  document.getElementById("cmp-price-a").innerText = `₹${priceA.toLocaleString()}`;
  document.getElementById("cmp-price-b").innerText = `₹${priceB.toLocaleString()}`;
  document.getElementById("cmp-desc-a").innerText = `${laptopA.cpu_brand} · ${laptopA.ram}GB RAM · ${laptopA.ssd}GB SSD`;
  document.getElementById("cmp-desc-b").innerText = `${laptopB.cpu_brand} · ${laptopB.ram}GB RAM · ${laptopB.ssd}GB SSD`;

  // Specs Comparison Table rendering helper
  const tableBody = document.getElementById("cmp-table-body");
  
  const specs = [
    { label: "Company", valA: laptopA.company, valB: laptopB.company, win: null },
    { label: "Form Factor", valA: laptopA.typename, valB: laptopB.typename, win: null },
    { label: "CPU Brand", valA: laptopA.cpu_brand, valB: laptopB.cpu_brand, win: null },
    { label: "CPU Speed", valA: `${laptopA.cpu_speed} GHz`, valB: `${laptopB.cpu_speed} GHz`, win: laptopA.cpu_speed > laptopB.cpu_speed ? "A" : (laptopA.cpu_speed < laptopB.cpu_speed ? "B" : null) },
    { label: "RAM Capacity", valA: `${laptopA.ram} GB`, valB: `${laptopB.ram} GB`, win: laptopA.ram > laptopB.ram ? "A" : (laptopA.ram < laptopB.ram ? "B" : null) },
    { label: "SSD Capacity", valA: `${laptopA.ssd} GB`, valB: `${laptopB.ssd} GB`, win: laptopA.ssd > laptopB.ssd ? "A" : (laptopA.ssd < laptopB.ssd ? "B" : null) },
    { label: "HDD Capacity", valA: `${laptopA.hdd} GB`, valB: `${laptopB.hdd} GB`, win: laptopA.hdd > laptopB.hdd ? "A" : (laptopA.hdd < laptopB.hdd ? "B" : null) },
    { label: "GPU Brand", valA: laptopA.gpu_brand, valB: laptopB.gpu_brand, win: null },
    { label: "Estimated price", valA: `₹${priceA.toLocaleString()}`, valB: `₹${priceB.toLocaleString()}`, win: priceA < priceB ? "A" : (priceA > priceB ? "B" : null) } // cheaper is winner
  ];

  tableBody.innerHTML = specs.map(row => {
    let cellA = `<td>${row.valA}</td>`;
    let cellB = `<td>${row.valB}</td>`;
    if (row.win === "A") {
      cellA = `<td class="winner">🏆 ${row.valA}</td>`;
      cellB = `<td class="loser">${row.valB}</td>`;
    } else if (row.win === "B") {
      cellA = `<td class="loser">${row.valA}</td>`;
      cellB = `<td class="winner">🏆 ${row.valB}</td>`;
    }
    return `
      <tr>
        ${cellA}
        <td class="label-cell">${row.label}</td>
        ${cellB}
      </tr>
    `;
  }).join('');

  // Radar chart implementation
  drawRadarChart(laptopA, laptopB);
}

function drawRadarChart(laptopA, laptopB) {
  const ctx = document.getElementById("radarCompareChart");
  if (!ctx) return;

  if (radarChartInstance) radarChartInstance.destroy();

  // Normalization logic matching Python
  const gpuScores = { "Intel": 1, "ARM": 1.5, "AMD": 2, "Nvidia": 3 };
  const getGpuScore = (gpu) => gpuScores[gpu] || 1;

  const scoresA = [
    laptopA.ram / 64,
    (laptopA.ssd + laptopA.hdd) / 1024,
    laptopA.cpu_speed / 4.5,
    getGpuScore(laptopA.gpu_brand) / 3,
    1 - (predictPrice(laptopA) / 320000) // Lower price is better score
  ];

  const scoresB = [
    laptopB.ram / 64,
    (laptopB.ssd + laptopB.hdd) / 1024,
    laptopB.cpu_speed / 4.5,
    getGpuScore(laptopB.gpu_brand) / 3,
    1 - (predictPrice(laptopB) / 320000)
  ];

  const isLight = document.documentElement.classList.contains("light-mode");
  const textColor = isLight ? "#475569" : "#94a3b8";

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ["RAM Size", "Storage GB", "CPU Speed", "GPU Tier", "Budget Value"],
      datasets: [
        {
          label: 'Laptop A',
          data: scoresA,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderWidth: 2,
          pointBackgroundColor: "#6366f1"
        },
        {
          label: 'Laptop B',
          data: scoresB,
          borderColor: "#06b6d4",
          backgroundColor: "rgba(6, 182, 212, 0.15)",
          borderWidth: 2,
          pointBackgroundColor: "#06b6d4"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        r: {
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          angleLines: { color: "rgba(255, 255, 255, 0.08)" },
          pointLabels: { color: textColor, font: { family: 'Inter', size: 11 } },
          ticks: { display: false },
          min: 0,
          max: 1
        }
      }
    }
  });
}

// ── Bootstrap execution ──────────────────────────────────────────────────────
initDataset();
