// ══════════════════════════════════════════════
//  SYNERGY PAIRS  [nodeId1, nodeId2]
// ══════════════════════════════════════════════
const synergies = [
  ["node-bpc157",    "node-tb500"],
  ["node-bpc157",    "node-ghkcu"],
  ["node-bpc157",    "node-kpv"],
  ["node-bpc157",    "node-bpc157-b"],   // cross-link to Beauty column
  ["node-ghkcu",     "node-ghkcu-b"],    // cross-link to Beauty column
  ["node-cjc1295",   "node-ipamorelin"],
  ["node-sermorelin","node-cjc1295"],
  ["node-igf1lr3",   "node-cjc1295"],
  ["node-semax",     "node-selank"],
  ["node-epitalon",  "node-dsip"],
  ["node-epitalon",  "node-epitalon-l"], // cross-link to Longevity column
  ["node-motsc",     "node-ss31"],
  ["node-motsc",     "node-motsc-l"],    // cross-link to Longevity column
  ["node-semaglutide","node-tirzepatide"],
  ["node-tirzepatide","node-retatrutide"],
  ["node-pinealon",  "node-epitalon"],
];

// ══════════════════════════════════════════════
//  BUILD ADJACENCY MAP  { nodeId -> Set of connected nodeIds }
// ══════════════════════════════════════════════
const adjacency = {};
synergies.forEach(([a, b]) => {
  if (!adjacency[a]) adjacency[a] = new Set();
  if (!adjacency[b]) adjacency[b] = new Set();
  adjacency[a].add(b);
  adjacency[b].add(a);
});

// ══════════════════════════════════════════════
//  APPLY LANE COLORS
// ══════════════════════════════════════════════
document.querySelectorAll('.lane').forEach(lane => {
  const color = lane.dataset.color;
  if (!color) return;

  // Full-column background: rich tinted dark
  lane.style.background = hexToRgba(color, 0.18);
  lane.style.borderColor = hexToRgba(color, 0.45);

  // Header: slightly more opaque
  const header = lane.querySelector('.lane-header');
  header.style.background = hexToRgba(color, 0.35);

  // Body: same tint as lane
  const body = lane.querySelector('.lane-body');
  body.style.background = hexToRgba(color, 0.10);

  // Tint the peptide nodes with the lane color subtly
  lane.querySelectorAll('.peptide-node').forEach(node => {
    node.style.borderColor = hexToRgba(color, 0.45);
    node.dataset.laneColor = color;
  });
});

// ══════════════════════════════════════════════
//  SVG LINKING LINES
// ══════════════════════════════════════════════
const svg    = document.getElementById('link-overlay');
const wrapper = document.getElementById('chart-wrapper');

function getCenter(el) {
  const wRect = wrapper.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  return {
    x: eRect.left - wRect.left + eRect.width  / 2 + wrapper.scrollLeft,
    y: eRect.top  - wRect.top  + eRect.height / 2
  };
}

function drawLines() {
  svg.innerHTML = '';
  svg.style.width  = wrapper.scrollWidth  + 'px';
  svg.style.height = wrapper.scrollHeight + 'px';

  synergies.forEach(([id1, id2]) => {
    const el1 = document.getElementById(id1);
    const el2 = document.getElementById(id2);
    if (!el1 || !el2) return;

    const p1 = getCenter(el1);
    const p2 = getCenter(el2);

    // Smooth cubic bezier — control points offset horizontally
    const dx = (p2.x - p1.x) * 0.45;
    const d  = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.classList.add('synergy-line');
    path.dataset.from = id1;
    path.dataset.to   = id2;
    svg.appendChild(path);
  });
}

// ══════════════════════════════════════════════
//  HOVER INTERACTION
// ══════════════════════════════════════════════
const allNodes = document.querySelectorAll('.peptide-node');

allNodes.forEach(node => {
  node.addEventListener('mouseenter', () => {
    const id        = node.id;
    const connected = adjacency[id] || new Set();

    allNodes.forEach(n => {
      if (n.id === id) {
        n.classList.add('state-hovered');
        n.classList.remove('state-connected', 'state-dimmed');
      } else if (connected.has(n.id)) {
        n.classList.add('state-connected');
        n.classList.remove('state-hovered', 'state-dimmed');
      } else {
        n.classList.add('state-dimmed');
        n.classList.remove('state-hovered', 'state-connected');
      }
    });

    document.querySelectorAll('.synergy-line').forEach(line => {
      if (line.dataset.from === id || line.dataset.to === id) {
        line.classList.add('state-highlighted');
        line.classList.remove('state-dimmed');
      } else {
        line.classList.add('state-dimmed');
        line.classList.remove('state-highlighted');
      }
    });
  });

  node.addEventListener('mouseleave', () => {
    allNodes.forEach(n => {
      n.classList.remove('state-hovered', 'state-connected', 'state-dimmed');
    });
    document.querySelectorAll('.synergy-line').forEach(line => {
      line.classList.remove('state-highlighted', 'state-dimmed');
    });
  });
});

// ══════════════════════════════════════════════
//  UTILITY: hex color → rgba string
// ══════════════════════════════════════════════
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
window.addEventListener('load',   drawLines);
window.addEventListener('resize', drawLines);
wrapper.addEventListener('scroll', drawLines);
