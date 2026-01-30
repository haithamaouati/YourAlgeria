const mapContainer = document.getElementById("map-container");
const dropdown = document.getElementById("regionDropdown");
const shareLink = document.getElementById("shareLink");
const storyInput = document.getElementById("storyInput");
const regionInfo = document.getElementById("regionInfo");

const copyBtn = document.getElementById("copyLink");
const resetBtn = document.getElementById("resetBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

let svg, regions, originalViewBox;
let activeRegion = null;

fetch("dz.svg")
  .then(r => r.text())
  .then(svgText => {
    mapContainer.innerHTML = svgText;
    initMap();
  });

function initMap() {
  svg = mapContainer.querySelector("svg");
  originalViewBox = svg.getAttribute("viewBox").split(" ").map(Number);

  addGrid();
  regions = [...svg.querySelectorAll("path")];

  regions.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = `${r.id} — ${r.getAttribute("name")}`;
    dropdown.appendChild(opt);

    r.addEventListener("click", () => selectRegion(r));
  });

  dropdown.onchange = () => {
    const region = regions.find(r => r.id === dropdown.value);
    if (region) selectRegion(region);
  };

  copyBtn.onclick = copyLink;
  resetBtn.onclick = resetAll;
  zoomOutBtn.onclick = zoomOut;
  storyInput.oninput = updateLink;

  loadFromHash();
}

function addGrid() {
  const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
  grid.classList.add("grid");

  const step = 50;
  const [x, y, w, h] = originalViewBox;

  for (let i = x; i < x + w; i += step) {
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", i);
    line.setAttribute("y1", y);
    line.setAttribute("x2", i);
    line.setAttribute("y2", y + h);
    grid.appendChild(line);
  }

  for (let i = y; i < y + h; i += step) {
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", i);
    line.setAttribute("x2", x + w);
    line.setAttribute("y2", i);
    grid.appendChild(line);
  }

  svg.insertBefore(grid, svg.firstChild);
}

function selectRegion(region) {
  activeRegion?.classList.remove("selected");
  activeRegion = region;
  region.classList.add("selected");
  dropdown.value = region.id;

  const box = region.getBBox();
  const padding = 30;
  animateViewBox([
    box.x - padding,
    box.y - padding,
    box.width + padding * 2,
    box.height + padding * 2
  ]);

  regionInfo.textContent = `${region.id} — ${region.getAttribute("name")}`;
  updateLink();
}

function animateViewBox(target) {
  const start = svg.getAttribute("viewBox").split(" ").map(Number);
  let t = 0;

  function frame() {
    t += 0.04;
    if (t > 1) t = 1;

    const eased = t * t * (3 - 2 * t);
    const current = start.map((s, i) => s + (target[i] - s) * eased);
    svg.setAttribute("viewBox", current.join(" "));

    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function zoomOut() {
  animateViewBox(originalViewBox);
}

function updateLink() {
  if (!activeRegion) return;
  try {
    const story = btoa(unescape(encodeURIComponent(storyInput.value)));
    shareLink.value = `${location.origin}${location.pathname}#${activeRegion.id}:${story}`;
  } catch {
    shareLink.value = "";
  }
}

function copyLink() {
  if (!shareLink.value) return;
  shareLink.select();
  document.execCommand("copy");
  copyBtn.textContent = "Copied";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
}

function resetAll() {
  activeRegion?.classList.remove("selected");
  activeRegion = null;
  dropdown.value = "";
  storyInput.value = "";
  shareLink.value = "";
  regionInfo.textContent = "No region selected";
  zoomOut();
  history.replaceState(null, "", location.pathname);
}

function loadFromHash() {
  if (!location.hash) return;

  const hash = location.hash.slice(1);
  const colonIndex = hash.indexOf(":");
  if (colonIndex === -1) return;

  const regionId = hash.slice(0, colonIndex);
  const encodedStory = hash.slice(colonIndex + 1);

  const region = regions.find(r => r.id === regionId);
  if (!region) return;

  selectRegion(region);

  try {
    storyInput.value = decodeURIComponent(escape(atob(encodedStory)));
  } catch {
    storyInput.value = "";
  }
}

/* Particle background */
const canvas = document.getElementById("particle-bg");
const ctx = canvas.getContext("2d");

let w, h;
let particles = [];
const PARTICLE_COUNT = 80;
const COLOR = "#00ff00";

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.size = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 0, ${this.alpha})`;
    ctx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle());
}

function connect() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        ctx.strokeStyle = `rgba(0, 255, 0, ${1 - dist / 120})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, w, h);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  connect();
  requestAnimationFrame(animate);
}

animate();
