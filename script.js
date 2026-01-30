const mapContainer = document.getElementById("map-container");
const regionDropdown = document.getElementById("regionDropdown");
const shareLinkInput = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyLink");
const resetBtn = document.getElementById("resetBtn");
const storyInput = document.getElementById("storyInput");

let svg, regions;
let originalViewBox;
let activeRegion = null;

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

  if (window.location.hash) restoreFromHash();
}

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

function updateShareLink() {
  if (!activeRegion) {
    shareLinkInput.value = '';
    return;
  }
  const storyEncoded = btoa(encodeURIComponent(storyInput.value));
  shareLinkInput.value = `${window.location.href.split('#')[0]}#${activeRegion.id}:${storyEncoded}`;
}

function animateViewBox(start, end, duration = 500, easing = t => t*t*(3-2*t)) {
  let startTime = null;
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    let t = Math.min((timestamp - startTime) / duration, 1);
    t = easing(t);
    const current = start.map((s, i) => s + (end[i] - s) * t);
    svg.setAttribute("viewBox", current.join(" "));
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function selectRegion(region) {
  if (activeRegion === region) return;

  activeRegion?.classList.remove("selected");
  activeRegion = region;
  region.classList.add("selected");
  regionDropdown.value = region.id;

  // Zoom to selected region
  const b = region.getBBox();
  const padding = 30;
  const width = b.width + padding;
  const height = b.height + padding;
  const centerX = b.x + b.width / 2 - width / 2;
  const centerY = b.y + b.height / 2 - height / 2;
  const targetViewBox = [centerX, centerY, width, height];

  const currentViewBox = svg.getAttribute("viewBox").split(" ").map(Number);
  animateViewBox(currentViewBox, targetViewBox);

  updateShareLink();
}

function resetMap() {
  activeRegion?.classList.remove("selected");
  activeRegion = null;
  regionDropdown.value = "";
  storyInput.value = "";
  shareLinkInput.value = '';

  const currentViewBox = svg.getAttribute("viewBox").split(" ").map(Number);
  animateViewBox(currentViewBox, originalViewBox);
}

function bindInteractions() {
  regions.forEach(r =>
    r.addEventListener("click", e => {
      e.stopPropagation();
      selectRegion(r);
    })
  );

  copyBtn.onclick = () => {
    if (shareLinkInput.value) {
      shareLinkInput.select();
      document.execCommand('copy');
      copyBtn.textContent = "Copied!";
      setTimeout(() => copyBtn.textContent = "Copy", 1500);
    }
  };

  resetBtn.onclick = resetMap;
  storyInput.oninput = updateShareLink;
}

function restoreFromHash() {
  const hash = window.location.hash.slice(1);
  const [regionId, storyEncoded] = hash.split(":");
  const region = regions.find(r => r.id === regionId);
  if (region) {
    selectRegion(region);
    if (storyEncoded) storyInput.value = decodeURIComponent(atob(storyEncoded));
    updateShareLink();
  }
}