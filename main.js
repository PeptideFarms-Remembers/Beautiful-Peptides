// ── Synergy pairs: [nodeId1, nodeId2]
const synergies = [
  ["node-bpc157", "node-tb500"],
  ["node-bpc157", "node-ghkcu"],
  ["node-bpc157", "node-kpv"],
  ["node-cjc1295", "node-ipamorelin"],
  ["node-semax", "node-selank"],
  ["node-epitalon", "node-dsip"],
  ["node-semaglutide", "node-tirzepatide"],
  ["node-tirzepatide", "node-retatrutide"],
  ["node-motsc", "node-ss31"],
  ["node-sermorelin", "node-cjc1295"],
  ["node-igf1lr3", "node-cjc1295"],
];

// ── Apply lane header colors from data-color attribute
document.querySelectorAll('.lane').forEach(lane => {
  const color = lane.dataset.color;
  if (color) {
    lane.querySelector('.lane-header').style.background = color + '33'; // translucent fill
    lane.querySelector('.lane-header').style.borderBottom = `2px solid ${color}`;
    lane.querySelector('.lane-header').style.color = color;
    lane.style.borderColor = color + '44';
  }
});

// ── Draw SVG linking lines
const svg = document.getElementById('link-overlay');
const wrapper = document.querySelector('.chart-wrapper');

function getCenter(el) {
  const wrapperRect = wrapper.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return {
    x: elRect.left - wrapperRect.left + elRect.width / 2 + wrapper.scrollLeft,
    y: elRect.top - wrapperRect.top + elRect.height / 2
  };
}

function drawLines() {
  svg.innerHTML = '';
  svg.setAttribute('width', wrapper.scrollWidth);
  svg.setAttribute('height', wrapper.scrollHeight);

  synergies.forEach(([id1, id2]) => {
    const el1 = document.getElementById(id1);
    const el2 = document.getElementById(id2);
    if (!el1 || !el2) return;

    const p1 = getCenter(el1);
    const p2 = getCenter(el2);

    // Curved bezier path
    const cx = (p1.x + p2.x) / 2;
    const cy = Math.min(p1.y, p2.y) - 40;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`);
    path.classList.add('synergy-line');
    path.dataset.from = id1;
    path.dataset.to = id2;
    svg.appendChild(path);
  });
}

// ── Hover highlight logic
document.querySelectorAll('.peptide-node').forEach(node => {
  node.addEventListener('mouseenter', () => {
    const id = node.id;
    document.querySelectorAll('.synergy-line').forEach(line => {
      if (line.dataset.from === id || line.dataset.to === id) {
        line.classList.add('highlighted');
      }
    });
    node.classList.add('active');
  });

  node.addEventListener('mouseleave', () => {
    document.querySelectorAll('.synergy-line').forEach(line => {
      line.classList.remove('highlighted');
    });
    node.classList.remove('active');
  });
});

// ── Redraw lines on load and resize
window.addEventListener('load', drawLines);
window.addEventListener('resize', drawLines);
