// ══════════════════════════════════════════════
//  LOAD DATA & BOOT
// ══════════════════════════════════════════════
fetch('peptides.json')
  .then(r => r.json())
  .then(data => init(data))
  .catch(err => console.error('Failed to load peptides.json:', err));

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
function init(data) {
  const { lanes, peptides, synergies, cross_lane_links } = data;

  // ── Build lookup maps ──
  const peptideMap  = {};
  peptides.forEach(p => peptideMap[p.id] = p);

  const laneMap = {};
  lanes.forEach(l => laneMap[l.id] = l);

  // Synergy adjacency
  const adjacency = {};
  synergies.forEach(({ from, to }) => {
    if (!adjacency[from]) adjacency[from] = new Set();
    if (!adjacency[to])   adjacency[to]   = new Set();
    adjacency[from].add(to);
    adjacency[to].add(from);
  });

  // Cross-lane adjacency (peptide id → [lane ids])
  const crossMap = {};
  cross_lane_links.forEach(({ peptide, target_lane }) => {
    if (!crossMap[peptide]) crossMap[peptide] = [];
    crossMap[peptide].push(target_lane);
  });

  // ── Render lanes ──
  const grid = document.getElementById('swimlane-grid');
  grid.innerHTML = '';

  lanes.forEach(lane => {
    const lanePeptides = peptides.filter(p => p.lane === lane.id);

    const laneEl = document.createElement('div');
    laneEl.className = 'lane';
    laneEl.id = `lane-${lane.id}`;
    laneEl.dataset.color = lane.color;
    laneEl.style.backgroundColor = lane.color;

    // Header
    const header = document.createElement('div');
    header.className = 'lane-header';
    header.id = `header-${lane.id}`;
    header.innerHTML = `
      <div class="lane-emoji">${lane.emoji}</div>
      <div class="lane-title">${lane.label.replace('&', '&amp;')}</div>
    `;
    laneEl.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'lane-body';

    lanePeptides.forEach(p => {
      const node = document.createElement('div');
      node.className = 'peptide-node';
      node.id = `node-${p.id}`;
      node.dataset.peptideId = p.id;

      const visibleBadges = p.badges.slice(0, 5);
      const badgeRow = visibleBadges.length
        ? `<div class="node-badges">${visibleBadges.map(b => `<div class="node-badge">${b}</div>`).join('')}</div>`
        : '';

      node.innerHTML = `${badgeRow}<span class="node-label">${p.name}</span>`;
      node.style.borderLeftColor = lane.color;
      // Colored inner glow from the left edge using the lane color
      const r = parseInt(lane.color.slice(1,3), 16);
      const g = parseInt(lane.color.slice(3,5), 16);
      const b = parseInt(lane.color.slice(5,7), 16);
      node.style.boxShadow = [
        `inset 5px 0 16px rgba(${r},${g},${b},0.28)`,
        `0 3px 14px rgba(0,0,0,0.55)`,
        `0 1px 3px rgba(0,0,0,0.4)`,
        `inset 0 1px 0 rgba(255,255,255,0.07)`
      ].join(', ');
      body.appendChild(node);
    });

    laneEl.appendChild(body);
    grid.appendChild(laneEl);
  });

  // ── Draw SVG lines ──
  const svg     = document.getElementById('link-overlay');
  const wrapper = document.getElementById('chart-wrapper');

  function getCenter(el) {
    const wRect = wrapper.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    return {
      x: eRect.left - wRect.left + eRect.width  / 2,
      y: eRect.top  - wRect.top  + eRect.height / 2
    };
  }

  function getHeaderCenter(laneId) {
    const header = document.getElementById(`header-${laneId}`);
    if (!header) return null;
    const wRect = wrapper.getBoundingClientRect();
    const hRect = header.getBoundingClientRect();
    return {
      x: hRect.left - wRect.left + hRect.width  / 2,
      y: hRect.top  - wRect.top  + hRect.height / 2
    };
  }

  function drawLines() {
    svg.innerHTML = '';
    const W = wrapper.clientWidth;
    const H = wrapper.clientHeight;
    svg.setAttribute('width',  W);
    svg.setAttribute('height', H);
    svg.style.width  = W + 'px';
    svg.style.height = H + 'px';

    // Synergy lines (node → node)
    synergies.forEach(({ from, to }) => {
      const el1 = document.getElementById(`node-${from}`);
      const el2 = document.getElementById(`node-${to}`);
      if (!el1 || !el2) return;

      const p1 = getCenter(el1);
      const p2 = getCenter(el2);
      const cx = (p1.x + p2.x) / 2;
      const d  = `M ${p1.x} ${p1.y} C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.classList.add('synergy-line');
      path.dataset.from = from;
      path.dataset.to   = to;
      svg.appendChild(path);
    });

    // Cross-lane lines (node → lane header)
    cross_lane_links.forEach(({ peptide, target_lane }) => {
      const nodeEl = document.getElementById(`node-${peptide}`);
      if (!nodeEl) return;

      const p1 = getCenter(nodeEl);
      const p2 = getHeaderCenter(target_lane);
      if (!p2) return;

      const cx = (p1.x + p2.x) / 2;
      const d  = `M ${p1.x} ${p1.y} C ${cx} ${p1.y}, ${cx} ${p2.y}, ${p2.x} ${p2.y}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.classList.add('cross-lane-line');
      path.dataset.peptide     = peptide;
      path.dataset.targetLane  = target_lane;
      svg.appendChild(path);
    });
  }

  // ── Hover interactions ──
  function allNodes()      { return document.querySelectorAll('.peptide-node'); }
  function allSynLines()   { return document.querySelectorAll('.synergy-line'); }
  function allCrossLines() { return document.querySelectorAll('.cross-lane-line'); }
  function allHeaders()    { return document.querySelectorAll('.lane-header'); }

  function clearStates() {
    allNodes().forEach(n => n.classList.remove('state-hovered','state-connected','state-dimmed'));
    allSynLines().forEach(l => l.classList.remove('state-highlighted','state-dimmed'));
    allCrossLines().forEach(l => l.classList.remove('state-highlighted','state-dimmed'));
    allHeaders().forEach(h => h.classList.remove('state-cross-target'));
  }

  function applyHover(id) {
    const friends   = adjacency[id]  || new Set();
    const crossLanes = crossMap[id]  || [];

    // Nodes
    allNodes().forEach(n => {
      const nid = n.dataset.peptideId;
      if (nid === id)            n.classList.add('state-hovered');
      else if (friends.has(nid)) n.classList.add('state-connected');
      else                       n.classList.add('state-dimmed');
    });

    // Synergy lines
    allSynLines().forEach(line => {
      const connected = line.dataset.from === id || line.dataset.to === id;
      line.classList.add(connected ? 'state-highlighted' : 'state-dimmed');
    });

    // Cross-lane lines + header highlights
    allCrossLines().forEach(line => {
      const connected = line.dataset.peptide === id;
      line.classList.add(connected ? 'state-highlighted' : 'state-dimmed');
      if (connected) {
        const header = document.getElementById(`header-${line.dataset.targetLane}`);
        if (header) header.classList.add('state-cross-target');
      }
    });
  }

  // Attach hover listeners
  document.querySelectorAll('.peptide-node').forEach(node => {
    node.addEventListener('mouseenter', () => applyHover(node.dataset.peptideId));
    node.addEventListener('mouseleave', clearStates);
  });

  // ── Click tooltip ──
  const panel     = document.getElementById('tooltip-panel');
  const backdrop  = document.getElementById('tooltip-backdrop');
  const closeBtn  = document.getElementById('tooltip-close');

  function openTooltip(peptideId) {
    const p = peptideMap[peptideId];
    if (!p) return;

    const lane = laneMap[p.lane];

    const allIcons = [...new Set([...(p.badges || []), ...(p.tags || [])])];
    document.getElementById('tooltip-badges').textContent    = allIcons.join('  ');
    document.getElementById('tooltip-name').textContent      = p.name;
    document.getElementById('tooltip-lane-tag').textContent  = `${lane.emoji} ${lane.label}`;
    document.getElementById('tooltip-mechanism').textContent = p.mechanism;
    document.getElementById('tooltip-research').textContent  = p.research;
    document.getElementById('tooltip-side-effects').textContent = p.side_effects || 'No significant adverse effects documented.';

    // Dosing — render each route on its own line
    const dosingEl = document.getElementById('tooltip-dosing');
    if (p.dosing && typeof p.dosing === 'object') {
      dosingEl.innerHTML = Object.entries(p.dosing).map(([route, desc]) => {
        if (route === 'Notes') {
          return `<div class="dosing-notes">${desc}</div>`;
        }
        return `<div class="dosing-row"><span class="dosing-route">${route}</span><span class="dosing-desc">${desc}</span></div>`;
      }).join('');
    } else {
      dosingEl.textContent = p.dosing;
    }

    // Blood panel — render as small tags
    const bloodEl = document.getElementById('tooltip-blood-panel');
    if (p.blood_panel && p.blood_panel.length) {
      bloodEl.innerHTML = p.blood_panel.map(t => `<span class="blood-tag">${t}</span>`).join('');
    } else {
      bloodEl.textContent = 'No specific monitoring protocol established.';
    }

    // Synergy chips
    const synEl = document.getElementById('tooltip-synergies');
    const friends = adjacency[peptideId] || new Set();
    if (friends.size === 0) {
      synEl.textContent = 'No direct synergy partners listed.';
    } else {
      synEl.innerHTML = '';
      friends.forEach(fid => {
        const fp = peptideMap[fid];
        if (!fp) return;
        const chip = document.createElement('span');
        chip.className = 'tooltip-synergy-chip';
        chip.textContent = fp.name;
        chip.addEventListener('click', () => openTooltip(fid));
        synEl.appendChild(chip);
      });
    }

    // Suggest Edit button — build pre-populated GitHub issue URL
    const suggestBtn = document.getElementById('suggest-edit-btn');
    if (suggestBtn) {
      const dosingText = p.dosing && typeof p.dosing === 'object'
        ? Object.entries(p.dosing).map(([k, v]) => `${k}: ${v}`).join('\n')
        : (p.dosing || 'N/A');
      const bloodText = (p.blood_panel || []).length
        ? p.blood_panel.map(t => `- ${t}`).join('\n')
        : 'None specified';
      const badgeText = [...new Set([...(p.badges || []), ...(p.tags || [])])].join(' ');
      const synNames  = [...friends].map(fid => peptideMap[fid]?.name).filter(Boolean).join(', ') || 'None listed';
      const secondary = (p.also_in || []).map(lid => laneMap[lid]?.label).filter(Boolean).join(', ') || 'None';

      const issueBody = [
        `## Suggested Edit for: ${p.name}`,
        ``,
        `> **Instructions:** Edit any field below that needs updating, then describe your change and reasoning at the bottom. Include sources where possible.`,
        ``,
        `### Identity`,
        `**Name:** ${p.name}`,
        `**Primary Lane:** ${lane.label}`,
        `**Secondary Lanes:** ${secondary}`,
        `**Badges:** ${badgeText}`,
        ``,
        `### Mechanism of Action`,
        p.mechanism,
        ``,
        `### Dosing Protocol`,
        dosingText,
        ``,
        `### Side Effects & Safety`,
        p.side_effects || 'None documented.',
        ``,
        `### Blood Panel to Monitor`,
        bloodText,
        ``,
        `### Research Status`,
        p.research,
        ``,
        `### Synergy Partners`,
        synNames,
        ``,
        `---`,
        `## What I'd Like to Change`,
        ``,
        `*Replace this text with your suggested edit and reasoning. Include sources if possible.*`,
      ].join('\n');

      const issueTitle = `[Suggest Edit] ${p.name}`;
      suggestBtn.href =
        `https://github.com/PeptideFarms-Remembers/Beautiful-Peptides/issues/new` +
        `?title=${encodeURIComponent(issueTitle)}` +
        `&body=${encodeURIComponent(issueBody)}` +
        `&labels=suggest-edit`;
    }

    panel.classList.add('active');
    backdrop.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closeTooltip() {
    panel.classList.remove('active');
    backdrop.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.peptide-node').forEach(node => {
    node.addEventListener('click', () => openTooltip(node.dataset.peptideId));
  });

  closeBtn.addEventListener('click', closeTooltip);
  backdrop.addEventListener('click', closeTooltip);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTooltip(); });

  // ── Init draw + resize ──
  drawLines();
  window.addEventListener('resize', drawLines);
}