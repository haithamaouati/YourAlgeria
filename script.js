const mapContainer = document.getElementById("map-container");
const tooltip = document.getElementById("tooltip");
const colorPicker = document.getElementById("colorPicker");
const regionDropdown = document.getElementById("regionDropdown");
const shareLinkInput = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyLink");
const shareBtn = document.getElementById("shareLinkBtn");
const storyInput = document.getElementById("storyInput");

let svg, regions;
let originalViewBox;
let activeRegion = null;

/* Load external SVG */
fetch("dz.svg")
  .then(r => r.text())
  .then(svgText => {
    mapContainer.innerHTML = svgText;
    initMap();
  });

function initMap() {
  svg = mapContainer.querySelector("svg");
  regions = [...svg.querySelectorAll("path")];
  originalViewBox = svg.getAttribute("viewBox").split(" ").map(Number);

  populateDropdown();
  bindInteractions();

  // Restore from hash if exists
  if (window.location.hash) restoreFromHash();
}

/* Populate dropdown */
function populateDropdown() {
  regions.forEach(r => {
    const option = document.createElement("option");
    option.value = r.id;
    option.textContent = `${r.id} — ${r.getAttribute("name")}`;
    regionDropdown.appendChild(option);
  });

  regionDropdown.onchange = () => {
    const selected = regions.find(r => r.id === regionDropdown.value);
    if (selected) selectRegion(selected);
  };
}

/* ViewBox helpers */
function setViewBox(v) {
  svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
  updateTooltip();
}

/* Tooltip and share link */
function updateTooltip() {
  if (!activeRegion) {
    tooltip.style.display = "none";
    shareLinkInput.value = "";
    return;
  }

  const b = activeRegion.getBBox();
  const vb = svg.viewBox.baseVal;
  const rect = svg.getBoundingClientRect();

  const x = (b.x + b.width / 2 - vb.x) * (rect.width / vb.width) + rect.left;
  const y = (b.y - vb.y) * (rect.height / vb.height) + rect.top - 10;

  tooltip.textContent = `${activeRegion.id} — ${activeRegion.getAttribute("name")}`;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.display = "block";

  // Encode region + story in Base64 in hash
  const storyEncoded = btoa(encodeURIComponent(storyInput.value));
  shareLinkInput.value = `${window.location.href.split('#')[0]}#${activeRegion.id}:${storyEncoded}`;
}

/* Selection */
function selectRegion(region) {
  if (activeRegion === region) {
    resetMap();
    return;
  }

  activeRegion?.classList.remove("selected");
  activeRegion = region;
  region.classList.add("selected");

  // Update dropdown
  regionDropdown.value = region.id;

  const b = region.getBBox();
  setViewBox({
    x: b.x - 20,
    y: b.y - 20,
    w: b.width + 40,
    h: b.height + 40
  });

  updateTooltip();
}

/* Reset */
function resetMap() {
  activeRegion?.classList.remove("selected");
  activeRegion = null;
  regionDropdown.value = "";
  storyInput.value = "";

  setViewBox({
    x: originalViewBox[0],
    y: originalViewBox[1],
    w: originalViewBox[2],
    h: originalViewBox[3]
  });

  tooltip.style.display = "none";
  shareLinkInput.value = "";
}

/* Controls and events */
function bindInteractions() {
  regions.forEach(r =>
    r.addEventListener("click", e => {
      e.stopPropagation();
      selectRegion(r);
    })
  );

  document.getElementById("zoomIn").onclick = () => {
    const v = svg.viewBox.baseVal;
    setViewBox({ x: v.x + v.width * 0.1, y: v.y + v.height * 0.1, w: v.width * 0.8, h: v.height * 0.8 });
  };

  document.getElementById("zoomOut").onclick = () => {
    const v = svg.viewBox.baseVal;
    setViewBox({ x: v.x - v.width * 0.1, y: v.y - v.height * 0.1, w: v.width * 1.2, h: v.height * 1.2 });
  };

  document.getElementById("reset").onclick = resetMap;

  colorPicker.oninput = e => {
    document.documentElement.style.setProperty("--select-color", e.target.value);
  };

  copyBtn.onclick = () => {
    if (shareLinkInput.value) {
      shareLinkInput.select();
      document.execCommand('copy');
      copyBtn.textContent = "Copied!";
      setTimeout(() => copyBtn.textContent = "Copy", 1500);
    }
  };

  shareBtn.onclick = () => {
    if (shareLinkInput.value && navigator.share) {
      navigator.share({
        title: "My Algeria",
        text: "Check my selected wilaya with my story:",
        url: shareLinkInput.value
      });
    } else {
      alert("Sharing is not supported on this device. Use Copy instead.");
    }
  };

  storyInput.oninput = updateTooltip;
}

/* Restore from URL hash */
function restoreFromHash() {
  const hash = window.location.hash.slice(1);
  const [regionId, storyEncoded] = hash.split(":");
  const region = regions.find(r => r.id === regionId);
  if (region) {
    selectRegion(region);
    if (storyEncoded) storyInput.value = decodeURIComponent(atob(storyEncoded));
    updateTooltip();
  }
}