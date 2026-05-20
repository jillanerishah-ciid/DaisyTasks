(function () {

  // ── CONSTANTS ──────────────────────────────────────────────────────────────

  // Petal/accent colors offered in the plant creation form
  const COLORS = ['#e85d8a','#e8955d','#d4b820','#5d8ae8','#9b5de8','#c45de8','#e05050'];

  // Key used to read/write state in browser.storage.local
  const STORAGE_KEY = 'gardenState';

  // Labels for the four growth stages (index matches task.stage value 0–3)
  const STAGE_NAMES = ['seedling', 'sprouting', 'budding', 'blooming'];

  // All available plant types shown in the form picker.
  const PLANT_TYPES = [
    { id: 'daisy',     label: 'Daisy' },
    { id: 'sunflower', label: 'Sunflower' },
    { id: 'cosmos',    label: 'Cosmos' },
  ];

  // All types the dice can roll — surprise-only types that can go in the vase.
  // First roll always gives a duck (handled in pickRandomSurpriseType).
  const SURPRISE_TYPES = [
    'tulip','cactus','duck','daffodil','mushroom','frog',
  ];

  // Sample task names the user can click to fill in the input quickly.
  const SAMPLE_TASKS = ['💧 drink water','📧 reply to email','☕ take a break'];

  // ── STATE ──────────────────────────────────────────────────────────────────
  // Everything here is persisted across tabs and sites via browser.storage.local.
  //
  //  tasks    — active task objects: { id, name, type, color, stage, watered, target }
  //  vases    — completed task mementos: { name, color } — shown as flower vases
  //  collapsed — true = garden is hidden, only the toggle button shows
  //  layout   — 'strip' (default: transparent full-width bar) or
  //             'panel' (window-box: compact corner panel with planter box)
  //  nextId   — auto-incrementing counter so each task gets a unique id
  let state = {
    tasks: [],
    vases: [],     // picked flowers — displayed in bouquet vase
    collapsed: false,
    layout: 'strip',
    nextId: 0,
    surpriseDuckGiven: false, // first dice roll always gives a duck
  };

  // Persist the current state object to localStorage.
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // Load initial state from localStorage if available.
  function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        state = Object.assign({}, state, JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored state:', e);
      }
    }
  }

  // Listen for changes from other tabs.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        state = Object.assign({}, state, JSON.parse(e.newValue));
        render();
      } catch (e) {
        console.error('Failed to parse storage event:', e);
      }
    }
  });

  // Ephemeral form state — not persisted, resets when page reloads.
  // Held outside the form's DOM so selections survive re-renders triggered by
  // clicking a swatch or plant type pill (which calls render on just the form).
  let formState   = { name: '', type: 'daisy', color: COLORS[0], target: 1, isDiceType: false };
  let notepadOpen = false; // ephemeral — not persisted


  // ── SVG GENERATORS ─────────────────────────────────────────────────────────
  // Reused green shades for stems and leaves
  const gn = '#6db36d';  // mid green (leaves, stems)
  const lg = '#8dc87d';  // lighter green (secondary leaves)
  const dg = '#4a8a4a';  // dark green (sunflower stems)

  // Stage 0 seedling is virtually the same for all flower/stem-type plants,
  // so we share it rather than repeating it in every SVG function.
  function seedling0() {
    return `<svg width="34" height="56" viewBox="0 0 34 56" xmlns="http://www.w3.org/2000/svg">
      <line x1="17" y1="56" x2="17" y2="28" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="9"  cy="36" rx="8" ry="4" fill="${gn}" transform="rotate(-35,9,36)"/>
      <ellipse cx="25" cy="36" rx="8" ry="4" fill="${gn}" transform="rotate(35,25,36)"/>
      <ellipse cx="17" cy="27" rx="4" ry="5" fill="${lg}"/>
    </svg>`;
  }

  // ── Daisy: multi-petal flower on a leafy stem ──────────────────────────────
  // 'c' is the petal colour chosen by the user.
  // Petals at stage 3 are drawn as 8 ellipses rotated around a shared centre
  // using SVG transform="rotate(angle, cx, cy)" — this keeps the geometry simple.
  function daisySVG(stage, c) {
    switch (stage) {
      case 0: return seedling0();
      case 1: return `<svg width="40" height="72" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1="72" x2="20" y2="18" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="9"  cy="50" rx="11" ry="5" fill="${gn}"  transform="rotate(-40,9,50)"/>
        <ellipse cx="31" cy="38" rx="11" ry="5" fill="${gn}"  transform="rotate(40,31,38)"/>
        <ellipse cx="9"  cy="34" rx="9"  ry="4" fill="${lg}"  transform="rotate(-35,9,34)"/>
        <ellipse cx="20" cy="14" rx="5"  ry="7" fill="${c}"   opacity="0.5"/>
      </svg>`;
      case 2: return `<svg width="44" height="86" viewBox="0 0 44 86" xmlns="http://www.w3.org/2000/svg">
        <line x1="22" y1="86" x2="22" y2="22" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="9"  cy="60" rx="13" ry="6" fill="${gn}"  transform="rotate(-42,9,60)"/>
        <ellipse cx="35" cy="48" rx="13" ry="6" fill="${gn}"  transform="rotate(42,35,48)"/>
        <ellipse cx="9"  cy="42" rx="11" ry="5" fill="${lg}"  transform="rotate(-38,9,42)"/>
        <ellipse cx="35" cy="33" rx="11" ry="5" fill="${lg}"  transform="rotate(38,35,33)"/>
        <ellipse cx="22" cy="14" rx="8"  ry="11" fill="${c}"/>
        <ellipse cx="22" cy="14" rx="5"  ry="7"  fill="${c}"  opacity="0.5" transform="rotate(40,22,14)"/>
      </svg>`;
      case 3: return `<svg width="52" height="96" viewBox="0 0 52 96" xmlns="http://www.w3.org/2000/svg">
        <line x1="26" y1="96" x2="26" y2="34" stroke="${gn}" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="12" cy="68" rx="14" ry="7" fill="${gn}"  transform="rotate(-42,12,68)"/>
        <ellipse cx="40" cy="54" rx="14" ry="7" fill="${gn}"  transform="rotate(42,40,54)"/>
        <ellipse cx="12" cy="50" rx="12" ry="6" fill="${lg}"  transform="rotate(-38,12,50)"/>
        <ellipse cx="40" cy="40" rx="12" ry="6" fill="${lg}"  transform="rotate(38,40,40)"/>
        <!-- 8 petals, each rotated 45° apart around the flower centre (26,18) -->
        <ellipse cx="26" cy="8"  rx="7" ry="11" fill="${c}"/>
        <ellipse cx="26" cy="27" rx="7" ry="11" fill="${c}"/>
        <ellipse cx="14" cy="18" rx="11" ry="7" fill="${c}"/>
        <ellipse cx="38" cy="18" rx="11" ry="7" fill="${c}"/>
        <ellipse cx="17" cy="9"  rx="7" ry="10" fill="${c}"  transform="rotate(-45,17,9)"/>
        <ellipse cx="35" cy="9"  rx="7" ry="10" fill="${c}"  transform="rotate(45,35,9)"/>
        <ellipse cx="17" cy="26" rx="7" ry="10" fill="${c}"  transform="rotate(45,17,26)"/>
        <ellipse cx="35" cy="26" rx="7" ry="10" fill="${c}"  transform="rotate(-45,35,26)"/>
        <circle  cx="26" cy="18" r="8"   fill="#f5e04a"/>
        <circle  cx="26" cy="18" r="4.5" fill="#d4a017"/>
      </svg>`;
    }
  }

  // ── Tulip: classic cupped bloom ────────────────────────────────────────────
  // The cup shape is built with SVG path arcs rather than ellipses,
  // giving it a rounder, more three-dimensional silhouette.
  function tulipSVG(stage, c) {
    switch (stage) {
      case 0: return seedling0();
      case 1: return `<svg width="36" height="72" viewBox="0 0 36 72" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="72" x2="18" y2="16" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="8"  cy="48" rx="11" ry="5" fill="${gn}" transform="rotate(-38,8,48)"/>
        <ellipse cx="28" cy="36" rx="11" ry="5" fill="${gn}" transform="rotate(38,28,36)"/>
        <!-- closed bud hint at the top -->
        <ellipse cx="18" cy="12" rx="6"  ry="9" fill="${c}" opacity="0.4"/>
      </svg>`;
      case 2: return `<svg width="36" height="84" viewBox="0 0 36 84" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="84" x2="18" y2="24" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="8"  cy="58" rx="13" ry="6" fill="${gn}" transform="rotate(-40,8,58)"/>
        <ellipse cx="28" cy="44" rx="13" ry="6" fill="${gn}" transform="rotate(40,28,44)"/>
        <ellipse cx="8"  cy="40" rx="10" ry="4" fill="${lg}" transform="rotate(-36,8,40)"/>
        <!-- closed tulip cup using a path -->
        <path d="M10,22 Q18,8 26,22 Q22,28 18,28 Q14,28 10,22 Z" fill="${c}"/>
        <path d="M13,20 Q18,10 23,20" fill="${c}" opacity="0.6"/>
      </svg>`;
      case 3: return `<svg width="38" height="92" viewBox="0 0 38 92" xmlns="http://www.w3.org/2000/svg">
        <line x1="19" y1="92" x2="19" y2="30" stroke="${gn}" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="8"  cy="64" rx="14" ry="6" fill="${gn}" transform="rotate(-40,8,64)"/>
        <ellipse cx="30" cy="50" rx="14" ry="6" fill="${gn}" transform="rotate(40,30,50)"/>
        <ellipse cx="8"  cy="46" rx="11" ry="5" fill="${lg}" transform="rotate(-36,8,46)"/>
        <!-- open tulip: main cup + two side petals -->
        <path d="M9,26  Q19,6  29,26 Q26,34 19,34 Q12,34 9,26  Z" fill="${c}"/>
        <path d="M5,30  Q6,14  19,10 Q8,24  9,30  Z" fill="${c}" opacity="0.75"/>
        <path d="M33,30 Q32,14 19,10 Q30,24 29,30 Z" fill="${c}" opacity="0.75"/>
        <ellipse cx="19" cy="28" rx="6" ry="8" fill="${c}" opacity="0.35"/>
      </svg>`;
    }
  }

  // ── Sunflower: large bloom with many yellow petals and a textured seed disk ─
  // Petals are thin ellipses rotated in 30° increments around centre (29,22).
  function sunflowerSVG(stage, c) {
    const y = '#f5d020'; // golden yellow petals
    switch (stage) {
      case 0: return seedling0();
      case 1: return `<svg width="42" height="76" viewBox="0 0 42 76" xmlns="http://www.w3.org/2000/svg">
        <line x1="21" y1="76" x2="21" y2="18" stroke="${dg}" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="9"  cy="52" rx="14" ry="6" fill="${gn}" transform="rotate(-42,9,52)"/>
        <ellipse cx="33" cy="38" rx="14" ry="6" fill="${gn}" transform="rotate(42,33,38)"/>
        <circle  cx="21" cy="13" r="8" fill="${y}" opacity="0.5"/>
      </svg>`;
      case 2: return `<svg width="46" height="88" viewBox="0 0 46 88" xmlns="http://www.w3.org/2000/svg">
        <line x1="23" y1="88" x2="23" y2="26" stroke="${dg}" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="10" cy="62" rx="15" ry="6" fill="${gn}" transform="rotate(-42,10,62)"/>
        <ellipse cx="36" cy="48" rx="15" ry="6" fill="${gn}" transform="rotate(42,36,48)"/>
        <ellipse cx="10" cy="44" rx="12" ry="5" fill="${lg}" transform="rotate(-38,10,44)"/>
        <ellipse cx="23" cy="10" rx="8" ry="11" fill="${y}"/>
        <ellipse cx="23" cy="10" rx="8" ry="11" fill="${y}" transform="rotate(45,23,10)"/>
        <circle  cx="23" cy="10" r="6" fill="#a0620a"/>
      </svg>`;
      case 3: return `<svg width="58" height="100" viewBox="0 0 58 100" xmlns="http://www.w3.org/2000/svg">
        <line x1="29" y1="100" x2="29" y2="38" stroke="${dg}" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="13" cy="72" rx="16" ry="7" fill="${gn}"  transform="rotate(-42,13,72)"/>
        <ellipse cx="45" cy="56" rx="16" ry="7" fill="${gn}"  transform="rotate(42,45,56)"/>
        <ellipse cx="13" cy="54" rx="14" ry="6" fill="${lg}"  transform="rotate(-38,13,54)"/>
        <ellipse cx="45" cy="42" rx="14" ry="6" fill="${lg}"  transform="rotate(38,45,42)"/>
        <!-- 12 petals at 30° intervals, all rotating around centre (29,22) -->
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(30,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(60,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(90,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(120,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(150,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(180,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(210,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(240,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(270,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(300,29,22)"/>
        <ellipse cx="29" cy="8" rx="5" ry="12" fill="${y}" transform="rotate(330,29,22)"/>
        <!-- dark seed disk with dot-pattern seeds -->
        <circle cx="29" cy="22" r="12" fill="#7a3e00"/>
        <circle cx="29" cy="22" r="8"  fill="#5a2e00"/>
        <circle cx="29" cy="16" r="1.5" fill="#9a6030" opacity="0.7"/>
        <circle cx="34" cy="19" r="1.5" fill="#9a6030" opacity="0.7"/>
        <circle cx="35" cy="25" r="1.5" fill="#9a6030" opacity="0.7"/>
        <circle cx="29" cy="28" r="1.5" fill="#9a6030" opacity="0.7"/>
        <circle cx="23" cy="25" r="1.5" fill="#9a6030" opacity="0.7"/>
        <circle cx="23" cy="19" r="1.5" fill="#9a6030" opacity="0.7"/>
      </svg>`;
    }
  }

  // ── Cosmos: tall airy stem, 8 narrow petals, prominent golden disc ─────────
  // Petals are thinner than daisy (rx=3 vs rx=7) and the seed disc is bigger.
  // Leaves are tiny paired ellipses at steep angles — feathery, cosmos-like.
  function cosmosSVG(stage, c) {
    switch (stage) {
      case 0: return seedling0();
      case 1: return `<svg width="32" height="68" viewBox="0 0 32 68" xmlns="http://www.w3.org/2000/svg">
        <line x1="16" y1="68" x2="16" y2="20" stroke="${gn}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="8"  cy="46" rx="9" ry="3" fill="${gn}" transform="rotate(-52,8,46)"/>
        <ellipse cx="24" cy="36" rx="9" ry="3" fill="${gn}" transform="rotate(52,24,36)"/>
        <ellipse cx="16" cy="18" rx="3.5" ry="5.5" fill="${c}" opacity="0.55"/>
      </svg>`;
      case 2: return `<svg width="38" height="84" viewBox="0 0 38 84" xmlns="http://www.w3.org/2000/svg">
        <line x1="19" y1="84" x2="19" y2="26" stroke="${gn}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="8"  cy="58" rx="11" ry="3" fill="${gn}" transform="rotate(-52,8,58)"/>
        <ellipse cx="30" cy="46" rx="11" ry="3" fill="${gn}" transform="rotate(52,30,46)"/>
        <ellipse cx="8"  cy="42" rx="9"  ry="2.5" fill="${lg}" transform="rotate(-48,8,42)"/>
        <ellipse cx="19" cy="14" rx="4"  ry="8"  fill="${c}" opacity="0.5"/>
        <ellipse cx="19" cy="14" rx="4"  ry="8"  fill="${c}" opacity="0.5" transform="rotate(90,19,20)"/>
        <circle  cx="19" cy="20" r="5" fill="#e8c030"/>
      </svg>`;
      case 3: return `<svg width="48" height="96" viewBox="0 0 48 96" xmlns="http://www.w3.org/2000/svg">
        <line x1="24" y1="96" x2="24" y2="34" stroke="${gn}" stroke-width="2" stroke-linecap="round"/>
        <ellipse cx="10" cy="66" rx="13" ry="3" fill="${gn}" transform="rotate(-52,10,66)"/>
        <ellipse cx="38" cy="52" rx="13" ry="3" fill="${gn}" transform="rotate(52,38,52)"/>
        <ellipse cx="10" cy="50" rx="11" ry="2.5" fill="${lg}" transform="rotate(-48,10,50)"/>
        <ellipse cx="38" cy="40" rx="11" ry="2.5" fill="${lg}" transform="rotate(48,38,40)"/>
        <!-- 8 narrow petals -->
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(45,24,20)"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(90,24,20)"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(135,24,20)"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(180,24,20)"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(225,24,20)"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(270,24,20)"/>
        <ellipse cx="24" cy="8"  rx="3" ry="12" fill="${c}" transform="rotate(315,24,20)"/>
        <circle cx="24" cy="20" r="9"   fill="#e8c030"/>
        <circle cx="24" cy="20" r="5.5" fill="#d4a018"/>
        <circle cx="24" cy="20" r="2.5" fill="#b88010"/>
      </svg>`;
    }
  }

  // Keep roseSVG as alias so any tasks saved before the rename still render correctly.
  function roseSVG(stage, c) { return cosmosSVG(stage, c); }

  // ── Daffodil: pale petals + user-colour trumpet ────────────────────────────
  function daffodilSVG(stage, c) {
    const py = '#f5d020'; // golden yellow petals
    switch (stage) {
      case 0: return seedling0();
      case 1: return `<svg width="28" height="66" viewBox="0 0 28 66" xmlns="http://www.w3.org/2000/svg">
        <line x1="14" y1="66" x2="14" y2="16" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="6"  cy="44" rx="10" ry="3" fill="${gn}" transform="rotate(-55,6,44)"/>
        <ellipse cx="22" cy="36" rx="10" ry="3" fill="${gn}" transform="rotate(55,22,36)"/>
        <ellipse cx="14" cy="13" rx="4" ry="6" fill="${py}" opacity="0.5"/>
      </svg>`;
      case 2: return `<svg width="36" height="84" viewBox="0 0 36 84" xmlns="http://www.w3.org/2000/svg">
        <line x1="18" y1="84" x2="18" y2="26" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="7"  cy="56" rx="13" ry="3.5" fill="${gn}" transform="rotate(-55,7,56)"/>
        <ellipse cx="29" cy="44" rx="13" ry="3.5" fill="${gn}" transform="rotate(55,29,44)"/>
        <!-- 6 opening petals, half-visible -->
        <ellipse cx="18" cy="9"  rx="4.5" ry="12" fill="${py}" opacity="0.8"/>
        <ellipse cx="18" cy="9"  rx="4.5" ry="12" fill="${py}" opacity="0.8" transform="rotate(60,18,20)"/>
        <ellipse cx="18" cy="9"  rx="4.5" ry="12" fill="${py}" opacity="0.8" transform="rotate(120,18,20)"/>
        <ellipse cx="18" cy="9"  rx="4.5" ry="12" fill="${py}" opacity="0.8" transform="rotate(180,18,20)"/>
        <ellipse cx="18" cy="9"  rx="4.5" ry="12" fill="${py}" opacity="0.8" transform="rotate(240,18,20)"/>
        <ellipse cx="18" cy="9"  rx="4.5" ry="12" fill="${py}" opacity="0.8" transform="rotate(300,18,20)"/>
        <circle cx="18" cy="20" r="6" fill="${c}" opacity="0.7"/>
        <circle cx="18" cy="20" r="3.5" fill="${c}"/>
      </svg>`;
      case 3: return `<svg width="50" height="96" viewBox="0 0 50 96" xmlns="http://www.w3.org/2000/svg">
        <line x1="25" y1="96" x2="25" y2="36" stroke="${gn}" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="10" cy="66" rx="15" ry="3.5" fill="${gn}" transform="rotate(-55,10,66)"/>
        <ellipse cx="40" cy="52" rx="15" ry="3.5" fill="${gn}" transform="rotate(55,40,52)"/>
        <ellipse cx="10" cy="50" rx="12" ry="3"   fill="${lg}" transform="rotate(-50,10,50)"/>
        <!-- 6 pale outer petals -->
        <ellipse cx="25" cy="8"  rx="5.5" ry="14" fill="${py}"/>
        <ellipse cx="25" cy="8"  rx="5.5" ry="14" fill="${py}" transform="rotate(60,25,22)"/>
        <ellipse cx="25" cy="8"  rx="5.5" ry="14" fill="${py}" transform="rotate(120,25,22)"/>
        <ellipse cx="25" cy="8"  rx="5.5" ry="14" fill="${py}" transform="rotate(180,25,22)"/>
        <ellipse cx="25" cy="8"  rx="5.5" ry="14" fill="${py}" transform="rotate(240,25,22)"/>
        <ellipse cx="25" cy="8"  rx="5.5" ry="14" fill="${py}" transform="rotate(300,25,22)"/>
        <!-- trumpet / corona in user colour -->
        <circle cx="25" cy="22" r="10" fill="${c}" opacity="0.9"/>
        <circle cx="25" cy="22" r="6.5" fill="${c}"/>
        <circle cx="25" cy="22" r="3.5" fill="rgba(255,240,200,0.6)"/>
      </svg>`;
    }
  }

  // ── Mushroom: chunky spotted cap, grows from tiny bump ────────────────────
  function mushroomSVG(stage) {
    const cap = '#e03838'; // red cap
    const spt = '#ffffff'; // white spots
    const stm = '#f5f0e0'; // cream stem
    switch (stage) {
      case 0: return `<svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="13" cy="16" rx="8" ry="9" fill="${cap}"/>
        <circle  cx="13" cy="12" r="3" fill="${spt}" opacity="0.9"/>
        <rect x="10" y="18" width="6" height="7" rx="2" fill="${stm}"/>
      </svg>`;
      case 1: return `<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="32" width="8" height="12" rx="3" fill="${stm}"/>
        <ellipse cx="18" cy="30" rx="16" ry="6" fill="#f0e8d0" opacity="0.7"/>
        <ellipse cx="18" cy="20" rx="16" ry="14" fill="${cap}"/>
        <circle  cx="18" cy="14" r="4"   fill="${spt}" opacity="0.9"/>
        <circle  cx="8"  cy="22" r="2.5" fill="${spt}" opacity="0.9"/>
        <circle  cx="28" cy="20" r="2.5" fill="${spt}" opacity="0.9"/>
      </svg>`;
      case 2: return `<svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="44" width="12" height="18" rx="5" fill="${stm}"/>
        <ellipse cx="24" cy="44" rx="20" ry="5" fill="#f0e8d0" opacity="0.75"/>
        <ellipse cx="24" cy="28" rx="22" ry="18" fill="${cap}"/>
        <ellipse cx="16" cy="20" rx="9" ry="5" fill="rgba(255,180,160,0.28)"/>
        <circle  cx="24" cy="16" r="5"   fill="${spt}" opacity="0.9"/>
        <circle  cx="10" cy="28" r="3.5" fill="${spt}" opacity="0.9"/>
        <circle  cx="38" cy="26" r="3.5" fill="${spt}" opacity="0.9"/>
        <circle  cx="18" cy="36" r="2.5" fill="${spt}" opacity="0.85"/>
        <circle  cx="32" cy="34" r="2.5" fill="${spt}" opacity="0.85"/>
      </svg>`;
      case 3: return `<svg width="58" height="82" viewBox="0 0 58 82" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="56" width="14" height="24" rx="6" fill="${stm}"/>
        <ellipse cx="29" cy="56" rx="24" ry="6" fill="#ede4cc" opacity="0.8"/>
        <ellipse cx="29" cy="34" rx="26" ry="22" fill="${cap}"/>
        <ellipse cx="18" cy="22" rx="12" ry="7"  fill="rgba(255,190,170,0.25)"/>
        <circle  cx="29" cy="18" r="6"   fill="${spt}" opacity="0.9"/>
        <circle  cx="12" cy="32" r="4"   fill="${spt}" opacity="0.9"/>
        <circle  cx="46" cy="30" r="4"   fill="${spt}" opacity="0.9"/>
        <circle  cx="20" cy="46" r="3"   fill="${spt}" opacity="0.88"/>
        <circle  cx="40" cy="44" r="3"   fill="${spt}" opacity="0.88"/>
        <circle  cx="29" cy="48" r="2.5" fill="${spt}" opacity="0.8"/>
      </svg>`;
    }
  }

  // ── Frog: egg → tadpole → froglet → cute sitting frog ─────────────────────
  function frogSVG(stage) {
    const fg  = '#6abf6a'; // frog green
    const fgd = '#4a9a4a'; // darker green
    switch (stage) {
      case 0: return `<svg width="30" height="28" viewBox="0 0 30 28" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="15" cy="16" rx="12" ry="10" fill="rgba(160,220,160,0.5)" stroke="#8acd8a" stroke-width="1"/>
        <circle cx="11" cy="14" r="2.5" fill="rgba(60,100,60,0.7)"/>
        <circle cx="17" cy="17" r="2"   fill="rgba(60,100,60,0.7)"/>
        <circle cx="20" cy="12" r="2.2" fill="rgba(60,100,60,0.7)"/>
        <circle cx="10" cy="20" r="1.8" fill="rgba(60,100,60,0.6)"/>
      </svg>`;
      case 1: return `<svg width="38" height="46" viewBox="0 0 38 46" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,34 Q28,30 32,20 Q36,10 30,8" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <ellipse cx="16" cy="34" rx="14" ry="10" fill="${fg}"/>
        <circle  cx="16" cy="24" r="9" fill="${fg}"/>
        <circle  cx="12" cy="18" r="2.5" fill="${fgd}"/>
        <circle  cx="20" cy="18" r="2.5" fill="${fgd}"/>
        <circle  cx="12.5" cy="17.5" r="1" fill="rgba(0,0,0,0.6)"/>
        <circle  cx="20.5" cy="17.5" r="1" fill="rgba(0,0,0,0.6)"/>
      </svg>`;
      case 2: return `<svg width="44" height="54" viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="22" cy="40" rx="18" ry="12" fill="${fg}"/>
        <path d="M8,46 Q2,52 6,54 Q10,56 12,50"  fill="${fg}"/>
        <path d="M36,46 Q42,52 38,54 Q34,56 32,50" fill="${fg}"/>
        <circle  cx="22" cy="26" r="14" fill="${fg}"/>
        <circle  cx="15" cy="18" r="5"  fill="${fg}"/>
        <circle  cx="29" cy="18" r="5"  fill="${fg}"/>
        <circle  cx="15" cy="17" r="3"  fill="white"/>
        <circle  cx="29" cy="17" r="3"  fill="white"/>
        <circle  cx="15.5" cy="16.5" r="1.4" fill="#111"/>
        <circle  cx="29.5" cy="16.5" r="1.4" fill="#111"/>
        <path d="M16,32 Q22,37 28,32" stroke="${fgd}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>`;
      case 3: return `<svg width="54" height="62" viewBox="0 0 54 62" xmlns="http://www.w3.org/2000/svg">
        <!-- body -->
        <ellipse cx="27" cy="44" rx="20" ry="16" fill="${fg}"/>
        <!-- back legs -->
        <ellipse cx="10" cy="56" rx="10" ry="5" fill="${fgd}" transform="rotate(-18,10,56)"/>
        <ellipse cx="44" cy="56" rx="10" ry="5" fill="${fgd}" transform="rotate(18,44,56)"/>
        <!-- belly lighter -->
        <ellipse cx="27" cy="46" rx="13" ry="10" fill="#98dd90" opacity="0.5"/>
        <!-- head -->
        <ellipse cx="27" cy="28" rx="18" ry="14" fill="${fg}"/>
        <!-- eye bumps -->
        <circle cx="17" cy="16" r="7.5" fill="${fg}"/>
        <circle cx="37" cy="16" r="7.5" fill="${fg}"/>
        <!-- eyes -->
        <circle cx="17" cy="15" r="5"   fill="white"/>
        <circle cx="37" cy="15" r="5"   fill="white"/>
        <circle cx="17.6" cy="14.5" r="2.8" fill="#111"/>
        <circle cx="37.6" cy="14.5" r="2.8" fill="#111"/>
        <circle cx="18.6" cy="13.5" r="1.1" fill="rgba(255,255,255,0.75)"/>
        <circle cx="38.6" cy="13.5" r="1.1" fill="rgba(255,255,255,0.75)"/>
        <!-- nostrils -->
        <circle cx="23" cy="24" r="1.5" fill="${fgd}"/>
        <circle cx="31" cy="24" r="1.5" fill="${fgd}"/>
        <!-- smile -->
        <path d="M17,32 Q27,40 37,32" stroke="${fgd}" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
    }
  }

  // ── Rubber duck: egg → hatched duckling → forming → full cute rubber duck ────
  function duckSVG(stage) {
    switch (stage) {
      case 0: return `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="14" cy="22" rx="11" ry="15" fill="#f8f4e0" stroke="#e0d8b0" stroke-width="1.2"/>
        <path d="M9,13 L12,16 L10,20 L14,17 L17,20" stroke="#d4c880" stroke-width="1.5"
              fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      case 1: return `<svg width="32" height="46" viewBox="0 0 32 46" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="34" r="10" fill="#f5d020"/>
        <circle cx="17" cy="16" r="9"  fill="#f5d020"/>
        <path   d="M24,15 L31,12 L31,19 Z" fill="#e87820"/>
        <circle cx="22" cy="11" r="1.8" fill="#1a1010"/>
        <circle cx="22.7" cy="10.3" r="0.7" fill="rgba(255,255,255,0.75)"/>
      </svg>`;
      case 2: return `<svg width="38" height="56" viewBox="0 0 38 56" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="19" cy="43" rx="15" ry="11" fill="#f5d020"/>
        <circle  cx="20" cy="22" r="13" fill="#f5d020"/>
        <path    d="M30,20 L38,17 L38,24 Z" fill="#e87820"/>
        <circle  cx="27" cy="15" r="2.2" fill="#1a1010"/>
        <circle  cx="27.8" cy="14.2" r="0.9" fill="rgba(255,255,255,0.75)"/>
        <ellipse cx="11" cy="45" rx="8" ry="4.5" fill="#e0bb14" opacity="0.5"/>
      </svg>`;
      case 3: return `<svg width="50" height="70" viewBox="0 0 50 70" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="25" cy="54" rx="20" ry="13" fill="#f5d020"/>
        <circle  cx="26" cy="28" r="18" fill="#f5d020"/>
        <ellipse cx="42" cy="27" rx="7" ry="4.5" fill="#e87820" transform="rotate(-10,42,27)"/>
        <circle  cx="34" cy="18" r="5"  fill="#1a1010"/>
        <circle  cx="35.8" cy="16.4" r="2" fill="rgba(255,255,255,0.78)"/>
        <ellipse cx="14" cy="57" rx="11" ry="6" fill="#e0bb14" opacity="0.5"/>
      </svg>`;
    }
  }

  // ── Succulent: rosette plant — flat and ground-hugging ─────────────────────
  // Drawn as overlapping ellipses rotated around the rosette centre.
  // 'c' becomes the leaf-tip accent colour (like a pink-tipped echeveria).
  // Stage 3 adds a thin flower stalk that grows from the centre.
  function succulentSVG(stage, c) {
    const sb = '#5a9e5a'; // base leaf colour
    const sm = '#7dc87d'; // mid leaf colour
    const sl = '#a0d88a'; // light centre colour
    switch (stage) {
      case 0: return `<svg width="36" height="34" viewBox="0 0 36 34" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="18" cy="18" rx="7" ry="10" fill="${sb}"/>
        <ellipse cx="18" cy="18" rx="7" ry="10" fill="${sb}" transform="rotate(60,18,18)"/>
        <ellipse cx="18" cy="18" rx="7" ry="10" fill="${sb}" transform="rotate(120,18,18)"/>
        <circle  cx="18" cy="18" r="5"  fill="${sl}"/>
        <ellipse cx="18" cy="9"  rx="2.5" ry="3.5" fill="${c}" opacity="0.55"/>
        <ellipse cx="18" cy="9"  rx="2.5" ry="3.5" fill="${c}" opacity="0.55" transform="rotate(60,18,18)"/>
        <ellipse cx="18" cy="9"  rx="2.5" ry="3.5" fill="${c}" opacity="0.55" transform="rotate(120,18,18)"/>
      </svg>`;
      case 1: return `<svg width="46" height="44" viewBox="0 0 46 44" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="23" cy="24" rx="11" ry="15" fill="${sb}"/>
        <ellipse cx="23" cy="24" rx="11" ry="15" fill="${sb}" transform="rotate(45,23,24)"/>
        <ellipse cx="23" cy="24" rx="11" ry="15" fill="${sb}" transform="rotate(90,23,24)"/>
        <ellipse cx="23" cy="24" rx="11" ry="15" fill="${sb}" transform="rotate(135,23,24)"/>
        <ellipse cx="23" cy="24" rx="7"  ry="10" fill="${sm}"/>
        <ellipse cx="23" cy="24" rx="7"  ry="10" fill="${sm}" transform="rotate(60,23,24)"/>
        <ellipse cx="23" cy="24" rx="7"  ry="10" fill="${sm}" transform="rotate(120,23,24)"/>
        <circle  cx="23" cy="24" r="5"   fill="${sl}"/>
        <ellipse cx="23" cy="10" rx="3"  ry="4"  fill="${c}"  opacity="0.6"/>
        <ellipse cx="23" cy="10" rx="3"  ry="4"  fill="${c}"  opacity="0.6" transform="rotate(45,23,24)"/>
        <ellipse cx="23" cy="10" rx="3"  ry="4"  fill="${c}"  opacity="0.6" transform="rotate(90,23,24)"/>
        <ellipse cx="23" cy="10" rx="3"  ry="4"  fill="${c}"  opacity="0.6" transform="rotate(135,23,24)"/>
      </svg>`;
      case 2: return `<svg width="56" height="54" viewBox="0 0 56 54" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="28" cy="30" rx="14" ry="19" fill="${sb}"/>
        <ellipse cx="28" cy="30" rx="14" ry="19" fill="${sb}" transform="rotate(36,28,30)"/>
        <ellipse cx="28" cy="30" rx="14" ry="19" fill="${sb}" transform="rotate(72,28,30)"/>
        <ellipse cx="28" cy="30" rx="14" ry="19" fill="${sb}" transform="rotate(108,28,30)"/>
        <ellipse cx="28" cy="30" rx="14" ry="19" fill="${sb}" transform="rotate(144,28,30)"/>
        <ellipse cx="28" cy="30" rx="9"  ry="13" fill="${sm}"/>
        <ellipse cx="28" cy="30" rx="9"  ry="13" fill="${sm}" transform="rotate(60,28,30)"/>
        <ellipse cx="28" cy="30" rx="9"  ry="13" fill="${sm}" transform="rotate(120,28,30)"/>
        <ellipse cx="28" cy="30" rx="6"  ry="9"  fill="${sl}"/>
        <ellipse cx="28" cy="30" rx="6"  ry="9"  fill="${sl}" transform="rotate(60,28,30)"/>
        <ellipse cx="28" cy="30" rx="6"  ry="9"  fill="${sl}" transform="rotate(120,28,30)"/>
        <circle  cx="28" cy="30" r="5"   fill="${c}" opacity="0.5"/>
        <ellipse cx="28" cy="12" rx="3"  ry="4"  fill="${c}"  opacity="0.55"/>
        <ellipse cx="28" cy="12" rx="3"  ry="4"  fill="${c}"  opacity="0.55" transform="rotate(36,28,30)"/>
        <ellipse cx="28" cy="12" rx="3"  ry="4"  fill="${c}"  opacity="0.55" transform="rotate(72,28,30)"/>
        <ellipse cx="28" cy="12" rx="3"  ry="4"  fill="${c}"  opacity="0.55" transform="rotate(108,28,30)"/>
        <ellipse cx="28" cy="12" rx="3"  ry="4"  fill="${c}"  opacity="0.55" transform="rotate(144,28,30)"/>
      </svg>`;
      case 3: return `<svg width="60" height="74" viewBox="0 0 60 74" xmlns="http://www.w3.org/2000/svg">
        <!-- flower stalk rising from centre -->
        <line x1="30" y1="26" x2="30" y2="6" stroke="${sm}" stroke-width="2"/>
        <!-- tiny flower at tip of stalk -->
        <ellipse cx="30" cy="4" rx="4" ry="5" fill="${c}"/>
        <ellipse cx="30" cy="4" rx="4" ry="5" fill="${c}" transform="rotate(60,30,4)"/>
        <ellipse cx="30" cy="4" rx="4" ry="5" fill="${c}" transform="rotate(120,30,4)"/>
        <circle  cx="30" cy="4" r="3"  fill="#f5e04a"/>
        <!-- rosette below -->
        <ellipse cx="30" cy="46" rx="15" ry="20" fill="${sb}"/>
        <ellipse cx="30" cy="46" rx="15" ry="20" fill="${sb}" transform="rotate(36,30,46)"/>
        <ellipse cx="30" cy="46" rx="15" ry="20" fill="${sb}" transform="rotate(72,30,46)"/>
        <ellipse cx="30" cy="46" rx="15" ry="20" fill="${sb}" transform="rotate(108,30,46)"/>
        <ellipse cx="30" cy="46" rx="15" ry="20" fill="${sb}" transform="rotate(144,30,46)"/>
        <ellipse cx="30" cy="46" rx="10" ry="14" fill="${sm}"/>
        <ellipse cx="30" cy="46" rx="10" ry="14" fill="${sm}" transform="rotate(60,30,46)"/>
        <ellipse cx="30" cy="46" rx="10" ry="14" fill="${sm}" transform="rotate(120,30,46)"/>
        <ellipse cx="30" cy="46" rx="6"  ry="9"  fill="${sl}"/>
        <ellipse cx="30" cy="46" rx="6"  ry="9"  fill="${sl}" transform="rotate(60,30,46)"/>
        <ellipse cx="30" cy="46" rx="6"  ry="9"  fill="${sl}" transform="rotate(120,30,46)"/>
        <ellipse cx="30" cy="28" rx="3"  ry="5"  fill="${c}"  opacity="0.6"/>
        <ellipse cx="30" cy="28" rx="3"  ry="5"  fill="${c}"  opacity="0.6" transform="rotate(36,30,46)"/>
        <ellipse cx="30" cy="28" rx="3"  ry="5"  fill="${c}"  opacity="0.6" transform="rotate(72,30,46)"/>
        <ellipse cx="30" cy="28" rx="3"  ry="5"  fill="${c}"  opacity="0.6" transform="rotate(108,30,46)"/>
        <ellipse cx="30" cy="28" rx="3"  ry="5"  fill="${c}"  opacity="0.6" transform="rotate(144,30,46)"/>
        <circle  cx="30" cy="46" r="5"  fill="${c}" opacity="0.45"/>
      </svg>`;
    }
  }

  // ── Cactus: ribbed column with arms and a crown flower at stage 3 ──────────
  // Spines are short lines. Arms are path shapes attached to the main column.
  // 'c' is the flower colour at the top (only visible at stage 3).
  function cactusSVG(stage, c) {
    const cv = '#5a9e4a'; // main cactus body colour
    const cl = '#7abf5a'; // highlight / inner lighter tone
    switch (stage) {
      case 0: return `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="15" cy="26" rx="9" ry="12" fill="${cv}"/>
        <line x1="11" y1="20" x2="9"  y2="17" stroke="#c8e898" stroke-width="1"/>
        <line x1="15" y1="17" x2="15" y2="14" stroke="#c8e898" stroke-width="1"/>
        <line x1="19" y1="20" x2="21" y2="17" stroke="#c8e898" stroke-width="1"/>
        <ellipse cx="15" cy="26" rx="5" ry="8" fill="${cl}" opacity="0.45"/>
      </svg>`;
      case 1: return `<svg width="34" height="62" viewBox="0 0 34 62" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="17" cy="40" rx="11" ry="20" fill="${cv}"/>
        <line x1="11" y1="24" x2="9"  y2="20" stroke="#c8e898" stroke-width="1"/>
        <line x1="17" y1="22" x2="17" y2="18" stroke="#c8e898" stroke-width="1"/>
        <line x1="23" y1="24" x2="25" y2="20" stroke="#c8e898" stroke-width="1"/>
        <line x1="11" y1="36" x2="8"  y2="33" stroke="#c8e898" stroke-width="1"/>
        <line x1="23" y1="36" x2="26" y2="33" stroke="#c8e898" stroke-width="1"/>
        <ellipse cx="17" cy="40" rx="6" ry="12" fill="${cl}" opacity="0.35"/>
      </svg>`;
      case 2: return `<svg width="48" height="74" viewBox="0 0 48 74" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="50" rx="12" ry="22" fill="${cv}"/>
        <!-- left arm: path curves out from the main body -->
        <path d="M12,44 Q4,40 4,30 Q4,22 10,22 Q16,22 16,30 L16,36" fill="${cv}"/>
        <line x1="5"  y1="28" x2="2"  y2="25" stroke="#c8e898" stroke-width="1"/>
        <line x1="5"  y1="34" x2="2"  y2="33" stroke="#c8e898" stroke-width="1"/>
        <line x1="18" y1="34" x2="15" y2="30" stroke="#c8e898" stroke-width="1"/>
        <line x1="30" y1="34" x2="33" y2="30" stroke="#c8e898" stroke-width="1"/>
        <line x1="17" y1="46" x2="14" y2="43" stroke="#c8e898" stroke-width="1"/>
        <line x1="31" y1="46" x2="34" y2="43" stroke="#c8e898" stroke-width="1"/>
        <ellipse cx="24" cy="50" rx="6" ry="13" fill="${cl}" opacity="0.35"/>
      </svg>`;
      case 3: return `<svg width="56" height="88" viewBox="0 0 56 88" xmlns="http://www.w3.org/2000/svg">
        <!-- crown flower petals rotating around (28,14) -->
        <ellipse cx="28" cy="6" rx="4" ry="6" fill="${c}"/>
        <ellipse cx="28" cy="6" rx="4" ry="6" fill="${c}" transform="rotate(60,28,14)"/>
        <ellipse cx="28" cy="6" rx="4" ry="6" fill="${c}" transform="rotate(120,28,14)"/>
        <ellipse cx="28" cy="6" rx="4" ry="6" fill="${c}" transform="rotate(180,28,14)"/>
        <ellipse cx="28" cy="6" rx="4" ry="6" fill="${c}" transform="rotate(240,28,14)"/>
        <ellipse cx="28" cy="6" rx="4" ry="6" fill="${c}" transform="rotate(300,28,14)"/>
        <circle  cx="28" cy="14" r="5" fill="#f5e04a"/>
        <!-- main column, left arm, right arm -->
        <ellipse cx="28" cy="60" rx="13" ry="26" fill="${cv}"/>
        <path d="M15,56 Q4,50 4,38 Q4,26 12,26 Q18,26 18,36 L18,44" fill="${cv}"/>
        <path d="M41,52 Q52,46 52,34 Q52,22 44,22 Q38,22 38,32 L38,42" fill="${cv}"/>
        <line x1="21" y1="38" x2="17" y2="34" stroke="#c8e898" stroke-width="1"/>
        <line x1="35" y1="38" x2="39" y2="34" stroke="#c8e898" stroke-width="1"/>
        <line x1="20" y1="52" x2="16" y2="49" stroke="#c8e898" stroke-width="1"/>
        <line x1="36" y1="52" x2="40" y2="49" stroke="#c8e898" stroke-width="1"/>
        <line x1="5"  y1="36" x2="2"  y2="33" stroke="#c8e898" stroke-width="1"/>
        <line x1="51" y1="32" x2="54" y2="29" stroke="#c8e898" stroke-width="1"/>
        <ellipse cx="28" cy="60" rx="7" ry="16" fill="${cl}" opacity="0.3"/>
      </svg>`;
    }
  }

  // ── Tree: round-canopy deciduous tree with blossoms at stage 3 ─────────────
  // Canopy is layered circles (dark outer → light inner) for a sense of depth.
  // Stage 2 and 3 have branch lines poking out below the canopy.
  // 'c' is the blossom colour — try pink for cherry, white for pear, etc.
  function treeSVG(stage, c) {
    const tr  = '#8B5E3C'; // trunk brown
    const trd = '#5a3a10'; // dark trunk detail
    const tg  = '#5a9e4a'; // outer canopy
    const tmg = '#7dc85a'; // mid canopy
    const tlg = '#a0d870'; // bright inner canopy
    switch (stage) {
      case 0: return `<svg width="34" height="56" viewBox="0 0 34 56" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="38" width="4" height="18" rx="1.5" fill="${tr}"/>
        <circle cx="17" cy="32" r="10" fill="${tg}"/>
        <circle cx="12" cy="29" r="7"  fill="${tmg}"/>
        <circle cx="22" cy="28" r="7"  fill="${tmg}"/>
        <circle cx="17" cy="26" r="7"  fill="${tlg}"/>
      </svg>`;
      case 1: return `<svg width="46" height="72" viewBox="0 0 46 72" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="46" width="6" height="26" rx="2" fill="${tr}"/>
        <ellipse cx="18" cy="70" rx="8" ry="3" fill="${trd}" opacity="0.3"/>
        <circle cx="23" cy="28" r="18" fill="${tg}"/>
        <circle cx="16" cy="24" r="13" fill="${tmg}"/>
        <circle cx="28" cy="22" r="13" fill="${tmg}"/>
        <circle cx="23" cy="18" r="11" fill="${tlg}"/>
      </svg>`;
      case 2: return `<svg width="54" height="84" viewBox="0 0 54 84" xmlns="http://www.w3.org/2000/svg">
        <rect x="24" y="54" width="7" height="30" rx="3" fill="${tr}"/>
        <!-- branches visible below canopy -->
        <line x1="27" y1="62" x2="16" y2="54" stroke="${tr}" stroke-width="3" stroke-linecap="round"/>
        <line x1="27" y1="58" x2="38" y2="50" stroke="${tr}" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="24" cy="80" rx="10" ry="3" fill="${trd}" opacity="0.28"/>
        <circle cx="27" cy="32" r="22" fill="${tg}"/>
        <circle cx="19" cy="26" r="16" fill="${tmg}"/>
        <circle cx="33" cy="24" r="16" fill="${tmg}"/>
        <circle cx="27" cy="19" r="13" fill="${tlg}"/>
        <!-- a few early blossoms -->
        <circle cx="18" cy="17" r="4"   fill="${c}" opacity="0.7"/>
        <circle cx="32" cy="14" r="4"   fill="${c}" opacity="0.7"/>
        <circle cx="12" cy="26" r="3.5" fill="${c}" opacity="0.65"/>
        <circle cx="38" cy="22" r="3.5" fill="${c}" opacity="0.65"/>
        <circle cx="22" cy="24" r="1.8" fill="#f5e04a" opacity="0.9"/>
        <circle cx="34" cy="22" r="1.8" fill="#f5e04a" opacity="0.9"/>
      </svg>`;
      case 3: return `<svg width="64" height="98" viewBox="0 0 64 98" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="62" width="8" height="36" rx="3" fill="${tr}"/>
        <line x1="32" y1="72" x2="18" y2="60" stroke="${tr}" stroke-width="4" stroke-linecap="round"/>
        <line x1="32" y1="66" x2="46" y2="54" stroke="${tr}" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="30" cy="94" rx="14" ry="4" fill="${trd}" opacity="0.25"/>
        <circle cx="32" cy="36" r="28" fill="${tg}"/>
        <circle cx="22" cy="28" r="20" fill="${tmg}"/>
        <circle cx="40" cy="26" r="20" fill="${tmg}"/>
        <circle cx="32" cy="20" r="17" fill="${tlg}"/>
        <!-- full bloom — many blossoms scattered across canopy -->
        <circle cx="20" cy="16" r="5"   fill="${c}" opacity="0.85"/>
        <circle cx="36" cy="12" r="6"   fill="${c}" opacity="0.9"/>
        <circle cx="48" cy="20" r="5"   fill="${c}" opacity="0.85"/>
        <circle cx="14" cy="26" r="5"   fill="${c}" opacity="0.8"/>
        <circle cx="44" cy="32" r="4.5" fill="${c}" opacity="0.8"/>
        <circle cx="26" cy="10" r="4.5" fill="${c}" opacity="0.85"/>
        <circle cx="18" cy="34" r="4"   fill="${c}" opacity="0.75"/>
        <circle cx="40" cy="14" r="4"   fill="${c}" opacity="0.8"/>
        <!-- yellow centres -->
        <circle cx="20" cy="16" r="2.2" fill="#f5e04a" opacity="0.95"/>
        <circle cx="36" cy="12" r="2.8" fill="#f5e04a" opacity="0.95"/>
        <circle cx="48" cy="20" r="2.2" fill="#f5e04a" opacity="0.95"/>
        <circle cx="14" cy="26" r="2.2" fill="#f5e04a" opacity="0.9"/>
        <circle cx="44" cy="32" r="2"   fill="#f5e04a" opacity="0.9"/>
        <circle cx="26" cy="10" r="2"   fill="#f5e04a" opacity="0.9"/>
      </svg>`;
    }
  }

  // Dispatch to the correct SVG function based on plant type string.
  function plantSVG(type, stage, color) {
    switch (type) {
      case 'sunflower': return sunflowerSVG(stage, color);
      case 'cosmos':    return cosmosSVG(stage, color);
      case 'rose':      return roseSVG(stage, color);   // backward compat alias
      case 'tulip':     return tulipSVG(stage, color);
      case 'succulent': return succulentSVG(stage, color);
      case 'cactus':    return cactusSVG(stage, color);
      case 'tree':      return treeSVG(stage, color);
      case 'daffodil':  return daffodilSVG(stage, color);
      case 'mushroom':  return mushroomSVG(stage);
      case 'frog':      return frogSVG(stage);
      case 'duck':      return duckSVG(stage);
      default:          return daisySVG(stage, color);
    }
  }

  // Large pot for strip/garden mode — wide enough to display the task label on it.
  function bigPotSVG() {
    return `<svg width="54" height="34" viewBox="0 0 54 34" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="0" width="38" height="7" rx="3.5" fill="#c87040"/>
      <path d="M10,7 L12,32 L42,32 L44,7 Z" fill="#b85e30"/>
      <path d="M13,11 Q12,22 13,29" stroke="rgba(255,180,120,0.22)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="27" cy="7" rx="15" ry="4" fill="#3a1a08" opacity="0.3"/>
    </svg>`;
  }

  // Small pot for panel/window-box mode — label appears above the flower instead.
  function smallPotSVG() {
    return `<svg width="30" height="18" viewBox="0 0 30 18" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="0" width="22" height="4" rx="2" fill="#c87040"/>
      <path d="M5,4 L7,16 L23,16 L25,4 Z" fill="#b85e30"/>
      <ellipse cx="15" cy="4" rx="9" ry="2.5" fill="#3a1a08" opacity="0.28"/>
    </svg>`;
  }

  // Alias kept so existing SVG call-sites continue to work.
  function potSVG() { return bigPotSVG(); }

  // Draws a type-specific mini flower head at SVG coordinate (fx, fy).
  // Used to draw type-specific flower heads inside the shared bouquet vase.
  function miniFlowerHead(type, color, fx, fy) {
    switch (type) {
      case 'sunflower':
        return [0,45,90,135,180,225,270,315].map(a =>
          `<ellipse cx="${fx}" cy="${(fy-4).toFixed(1)}" rx="1.5" ry="3" fill="#f5e04a" opacity="0.9"
                    transform="rotate(${a},${fx},${fy})"/>`
        ).join('') + `<circle cx="${fx}" cy="${fy}" r="2.5" fill="#7a3e00"/>`;
      case 'rose':
        return [0,72,144,216,288].map(a =>
          `<ellipse cx="${fx}" cy="${(fy-4).toFixed(1)}" rx="2.5" ry="4" fill="${color}" opacity="0.85"
                    transform="rotate(${a},${fx},${fy})"/>`
        ).join('') +
        [36,108,180,252,324].map(a =>
          `<ellipse cx="${fx}" cy="${(fy-2.5).toFixed(1)}" rx="1.8" ry="2.8" fill="${color}"
                    transform="rotate(${a},${fx},${fy})"/>`
        ).join('') +
        `<circle cx="${fx}" cy="${fy}" r="1.8" fill="rgba(255,225,210,0.8)"/>`;
      case 'cosmos':
        return [0,45,90,135,180,225,270,315].map(a =>
          `<ellipse cx="${fx}" cy="${(fy-4.5).toFixed(1)}" rx="1.6" ry="4" fill="${color}" opacity="0.9"
                    transform="rotate(${a},${fx},${fy})"/>`
        ).join('') +
        `<circle cx="${fx}" cy="${fy}" r="3" fill="#e8c030"/>
         <circle cx="${fx}" cy="${fy}" r="1.8" fill="#c09010"/>`;
      case 'daffodil':
        return [0,60,120,180,240,300].map(a =>
          `<ellipse cx="${fx}" cy="${(fy-5).toFixed(1)}" rx="2" ry="5" fill="#f5d020" opacity="0.9"
                    transform="rotate(${a},${fx},${fy})"/>`
        ).join('') +
        `<circle cx="${fx}" cy="${fy}" r="3.5" fill="${color}"/>
         <circle cx="${fx}" cy="${fy}" r="1.8" fill="rgba(255,240,200,0.7)"/>`;
      case 'duck':
      case 'mushroom':
      case 'frog':
        // Non-stem creatures: sit at vase rim, no tall stem
        if (type === 'mushroom') {
          return `<ellipse cx="${fx}" cy="${fy}" rx="7" ry="4.5" fill="#e03838"/>
            <circle cx="${fx}" cy="${fy-1}" r="2.5" fill="white" opacity="0.9"/>
            <rect x="${fx-2.5}" y="${fy+2}" width="5" height="5" rx="1.5" fill="#f5f0e0"/>`;
        }
        if (type === 'frog') {
          return `<ellipse cx="${fx}" cy="${fy}" rx="6" ry="4" fill="#6abf6a"/>
            <circle cx="${fx-3}" cy="${fy-5}" r="3" fill="#6abf6a"/>
            <circle cx="${fx+3}" cy="${fy-5}" r="3" fill="#6abf6a"/>
            <circle cx="${fx-3}" cy="${fy-6}" r="2" fill="white"/>
            <circle cx="${fx+3}" cy="${fy-6}" r="2" fill="white"/>
            <circle cx="${fx-2.5}" cy="${fy-6}" r="1" fill="#111"/>
            <circle cx="${fx+3.5}" cy="${fy-6}" r="1" fill="#111"/>`;
        }
        // duck
        return `<ellipse cx="${fx}"   cy="${fy}"   rx="6"   ry="4.5" fill="#f5d020"/>
          <circle  cx="${fx+1}" cy="${fy-6}" r="4.5" fill="#f5d020"/>
          <ellipse cx="${fx+7}" cy="${fy-5}" rx="3.5" ry="2.2" fill="#e87820" transform="rotate(-10,${fx+7},${fy-5})"/>
          <circle  cx="${fx+3}" cy="${fy-9}" r="1.3" fill="#1a1010"/>`;
      case 'daisy':
      default:
        return [0,60,120,180,240,300].map(a =>
          `<ellipse cx="${fx}" cy="${(fy-4).toFixed(1)}" rx="2" ry="3.5" fill="${color}" opacity="0.92"
                    transform="rotate(${a},${fx},${fy})"/>`
        ).join('') + `<circle cx="${fx}" cy="${fy}" r="2.5" fill="#f5e04a"/>`;
    }
  }

  // Returns the inner HTML for a .gdn-vase element: a split structure so only
  // the flower heads animate on click (the glass body stays put).
  // Capped at 5 flowers; each is drawn in its actual plant type/colour.
  function bouquetHTML(vases) {
    if (vases.length === 0) return '';
    const shown = vases.slice(-5);
    const n     = shown.length;
    const cx    = 20;
    const neckY = 24;

    const halfSpread = Math.min(28, n * 7);
    const angles = n === 1 ? [0]
      : shown.map((_, i) => -halfSpread + (i / (n - 1)) * halfSpread * 2);

    const RIM_TYPES = new Set(['mushroom']);
    const WATER_CREATURES = new Set(['duck', 'frog']);

    const stems = shown.map((v, i) => {
      const rad    = angles[i] * Math.PI / 180;
      const isRim  = RIM_TYPES.has(v.type);
      const isWater = WATER_CREATURES.has(v.type);
      // Rim creatures (mushroom) float near the neck; flowers fan out on longer stems
      // Duck and frog sit on top of the water surface
      let x2, y2;
      if (isWater) {
        x2 = cx;
        y2 = 36;  // on water surface
      } else {
        const len = isRim ? 5 : 18 + (i % 2) * 5;
        x2 = cx + Math.sin(rad) * len;
        y2 = neckY - Math.cos(rad) * len;
      }
      return { v, isRim, x2, y2 };
    });

    // Only draw stems for stem-type flowers (not for rim creatures or water creatures)
    const stemsSVG = stems
      .filter(s => !s.isRim && !WATER_CREATURES.has(s.v.type))
      .map(s => `<line x1="${cx}" y1="${neckY}" x2="${s.x2.toFixed(1)}" y2="${s.y2.toFixed(1)}"
             stroke="#5a9e5a" stroke-width="1.5" stroke-linecap="round"/>`)
      .join('');

    const flowersSVG = stems.map(({ v, x2, y2 }) =>
      miniFlowerHead(v.type || 'daisy', v.color, +x2.toFixed(1), +y2.toFixed(1))
    ).join('');

    const vasePath = `M11,64 Q9,54 9,44 Q9,34 12,30 L12,26 Q12,24 20,24 Q28,24 28,26 L28,30
                      Q31,34 31,44 Q31,54 29,64 Z`;

    // .gdn-vase-flowers animates on click; .gdn-vase-body stays still
    return `<div class="gdn-vase-flowers">
        <svg width="40" height="74" viewBox="0 -10 40 74" xmlns="http://www.w3.org/2000/svg">
          ${stemsSVG}${flowersSVG}
        </svg>
      </div>
      <div class="gdn-vase-body">
        <svg width="40" height="74" viewBox="0 -10 40 74" xmlns="http://www.w3.org/2000/svg">
          <path d="${vasePath}" fill="rgba(195,230,248,0.55)" stroke="#88b4cc" stroke-width="1.5"/>
          <!-- water fill inside vase -->
          <path d="M13,62 Q11,54 11,46 Q11,40 16,38 Q20,38 24,38 Q29,40 29,46 Q29,54 27,62 Z"
                fill="rgba(100,180,240,0.38)"/>
          <ellipse cx="20" cy="38" rx="7" ry="2.2" fill="rgba(140,210,250,0.55)"/>
          <path d="M11,40 Q10,33 14,30" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"
                fill="none" stroke-linecap="round"/>
        </svg>
      </div>`;
  }

  // Legacy alias — kept so any stray call-sites still compile.
  function vaseSVG(color) { return ''; }

  // Watering-can SVG. Rendered at 70×54 so it's clearly visible over the plant.
  // Spout points upper-right; clockwise CSS tilt tips it downward to pour.
  // Spout tip in viewBox coords is (50,10). Rendered scale: 70/54 × 54/42.
  // After 32° clockwise CSS tilt around the SVG centre (35,27 rendered),
  // the spout tip lands at ~(68,31) in rendered pixels — that's where drops fall.
  function waterCanSVG(count) {
    // Body: tall rounded rectangle (clearly can-shaped, not a kettle/ball)
    // Handle: arch above the opening
    // Spout: long arm from upper-right, clockwise tilt tips it downward to pour
    return `<svg width="74" height="58" viewBox="0 0 58 46" class="gdn-can-svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Body -->
      <rect x="4" y="12" width="30" height="28" rx="5" fill="#7baed4"/>
      <!-- Top opening / rim -->
      <rect x="6" y="10" width="26" height="5" rx="2.5" fill="#6a9ec4"/>
      <!-- Highlight -->
      <ellipse cx="12" cy="21" rx="5" ry="7" fill="rgba(255,255,255,0.2)"/>
      <!-- Handle: arch over the top from left side to right -->
      <path d="M10,10 Q19,1 28,10" stroke="#5a8eb8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <!-- Spout: from right side of body, angled upper-right -->
      <path d="M34,20 Q41,15 48,11" stroke="#6a9ec4" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <!-- Nozzle head (small perforated cap) -->
      <ellipse cx="48" cy="11" rx="3" ry="2" fill="#5a8eb8" transform="rotate(-28,48,11)"/>
      <circle  cx="48" cy="10" r="0.9" fill="#3a6e98"/>
      <circle  cx="50" cy="12" r="0.9" fill="#3a6e98"/>
      <!-- Count -->
      <circle cx="19" cy="26" r="9" fill="rgba(255,255,255,0.88)"/>
      <text x="19" y="30" text-anchor="middle" font-size="10" font-family="Georgia,serif" fill="#446688" font-weight="bold">${count}</text>
    </svg>`;
  }

  // HTML-escape a string for safe insertion into SVG or HTML attributes.
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }


  // ── WATERING ANIMATION ─────────────────────────────────────────────────────
  // Creates a temporary fixed-position element over the plant, plays a
  // tilting-can CSS animation with falling drop elements, then calls onDone
  // so the caller can update state after the visual completes.
  function animateWatering(wrap, count, onDone) {
    const rect = wrap.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'gdn-water-anim';
    // Position so the can sits clearly above the plant, not covering the flower or label.
    // The can SVG is 54px tall; top:rect.top-120 puts the can well above the plant.
    // Centre the can horizontally over the plant; nozzle tip after 32° tilt ≈ x=66
    const left = Math.max(4, rect.left + rect.width / 2 - 58);
    el.style.cssText = `position:fixed;left:${left}px;top:${rect.top - 120}px;pointer-events:none;z-index:2147483647;`;
    el.innerHTML = waterCanSVG(count) + `<div class="gdn-drops">
      <div class="gdn-drop" style="left:64px;top:26px;animation-delay:0.20s"></div>
      <div class="gdn-drop" style="left:66px;top:28px;animation-delay:0.25s"></div>
      <div class="gdn-drop" style="left:63px;top:30px;animation-delay:0.22s"></div>
      <div class="gdn-drop" style="left:65px;top:32px;animation-delay:0.30s"></div>
    </div>`;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); onDone(); }, 900);
  }


  // ── DOUBLE-CLICK POPUP ─────────────────────────────────────────────────────
  // This popup is appended directly to <body> as a fixed-position element.
  // Attaching it to the garden container would clip it when the plant row
  // has overflow:auto, so we position it independently using getBoundingClientRect.
  let floatPop = null;
  let docHandler = null;

  function removeFloatPop() {
    if (floatPop)   { floatPop.remove(); floatPop = null; }
    if (docHandler) { document.removeEventListener('click', docHandler); docHandler = null; }
  }

  // Show the pick/remove menu anchored above a plant wrap element.
  function showMenu(wrap, task) {
    removeFloatPop();
    const rect = wrap.getBoundingClientRect();
    const popW = 210;

    // Keep the popup within the viewport horizontally
    let left = rect.left + rect.width / 2 - popW / 2;
    if (left < 8) left = 8;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;

    floatPop = document.createElement('div');
    floatPop.className = 'gdn-float-pop';
    floatPop.style.cssText = `position:fixed;z-index:2147483647;bottom:${window.innerHeight - rect.top + 10}px;left:${left}px;width:${popW}px;`;

    const prog = task.target > 1 ? ` · ${Math.min(task.watered || 0, task.target)}/${task.target}` : '';
    floatPop.innerHTML = `
      <div class="gdn-fp-name">${esc(task.name)}</div>
      <div class="gdn-fp-meta">${STAGE_NAMES[task.stage]}${prog} · watered ${task.watered || 0}×</div>
      <div class="gdn-fp-row">
        <button class="gdn-fp-pick"  data-id="${task.id}">✂️ pick</button>
        <button class="gdn-fp-pause" data-id="${task.id}">${task.paused ? '▶' : '⏸'}</button>
        <button class="gdn-fp-del"   data-id="${task.id}">🗑</button>
      </div>`;
    document.body.appendChild(floatPop);

    // Pick: move the flower/duck into the shared bouquet vase, then celebrate
    floatPop.querySelector('.gdn-fp-pick').onclick = (e) => {
      e.stopPropagation();
      const t = state.tasks.find(x => x.id === +e.currentTarget.dataset.id);
      if (t) {
        state.tasks = state.tasks.filter(x => x.id !== t.id);
        state.vases.push({ name: t.name, color: t.color, type: t.type });
        save(); render();
        const vaseEl = root.querySelector('.gdn-vase');
        if (vaseEl) spawnConfetti(vaseEl);
      }
      removeFloatPop();
    };

    // Pause/resume: toggle sway without closing the popup or re-rendering
    floatPop.querySelector('.gdn-fp-pause').onclick = (e) => {
      e.stopPropagation();
      const t = state.tasks.find(x => x.id === +e.currentTarget.dataset.id);
      if (t) {
        t.paused = !t.paused;
        e.currentTarget.textContent = t.paused ? '▶' : '⏸';
        const inner = root.querySelector(`[data-id="${t.id}"] .gdn-plant-inner`);
        if (inner) inner.classList.toggle('gdn-paused', t.paused);
        save();
      }
    };

    // Delete: remove task entirely, no vase
    floatPop.querySelector('.gdn-fp-del').onclick = (e) => {
      e.stopPropagation();
      state.tasks = state.tasks.filter(x => x.id !== +e.currentTarget.dataset.id);
      save(); render(); removeFloatPop();
    };

    // Clicking anywhere outside the popup closes it.
    // The 10ms delay prevents the same click that opened the popup from closing it.
    setTimeout(() => {
      docHandler = () => removeFloatPop();
      document.addEventListener('click', docHandler);
    }, 10);
  }


  // ── CONFETTI ───────────────────────────────────────────────────────────────
  // Spawns a short burst of confetti particles above a given element.
  // Particles are appended to <body> as fixed elements and self-remove after 1s.
  // CSS custom properties --dx / --dy drive each particle's unique trajectory.
  function spawnConfetti(el) {
    const rect   = el.getBoundingClientRect();
    const cx     = rect.left + rect.width / 2;
    const cy     = rect.top + 4;
    const colors = ['#e85d8a','#f5d020','#5d8ae8','#9b5de8','#e8955d','#6db36d','#e87820','#80c8ff'];
    for (let i = 0; i < 22; i++) {
      const p    = document.createElement('div');
      const size = (5 + Math.random() * 5).toFixed(1);
      const dx   = ((Math.random() - 0.5) * 96).toFixed(1);
      const dy   = (-(28 + Math.random() * 68)).toFixed(1);
      p.style.cssText =
        `position:fixed;left:${(cx + (Math.random()-0.5)*18).toFixed(1)}px;top:${cy}px;`
        + `width:${size}px;height:${size}px;background:${colors[i % colors.length]};`
        + `border-radius:${Math.random() > 0.45 ? '50%' : '3px'};`
        + `pointer-events:none;z-index:2147483647;--dx:${dx}px;--dy:${dy}px;`;
      p.className = 'gdn-confetti-bit';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  }

  // ── SURPRISE TYPE PICKER ───────────────────────────────────────────────────
  // Called when the dice pill is clicked. First call always returns 'duck'.
  // Subsequent calls pick randomly from all SURPRISE_TYPES.
  // Returns the chosen type string and updates state.surpriseDuckGiven.
  function pickRandomSurpriseType() {
    if (!state.surpriseDuckGiven) {
      state.surpriseDuckGiven = true;
      save();
      return 'duck';
    }
    return SURPRISE_TYPES[Math.floor(Math.random() * SURPRISE_TYPES.length)];
  }

  // ── RENDERING ──────────────────────────────────────────────────────────────

  // Top-level render. Sets the root class for CSS layout switching,
  // then delegates to the correct layout renderer.
  function render() {
    // Apply layout class to root so CSS can adjust positioning
    root.className = state.layout === 'panel' ? 'gdn-mode-panel' : 'gdn-mode-strip';

    if (state.collapsed) {
      renderCollapsed();
    } else if (state.layout === 'panel') {
      renderPanel();
    } else {
      renderStrip();
    }

    attachEvents();
    // Safety: reset any accidental vertical scroll on the plants row
    const pr = root.querySelector('.gdn-plants-row');
    if (pr) pr.scrollTop = 0;
  }

  // Collapsed state: just a small circular toggle button in the bottom-right corner.
  function renderCollapsed() {
    root.innerHTML = `<div class="gdn-collapsed">
      <button class="gdn-toggle-btn" id="gdn-toggle">🌿</button>
    </div>`;
  }

  // Builds the HTML for a single plant+pot unit.
  // layout='strip' → bigger pot with label on it.
  // layout='panel' → label above the flower, small pot below (no text on pot).
  function plantUnitHTML(t, i, layout) {
    const dur   = (2.6 + (i * 0.21) % 1.2).toFixed(2);
    const delay = ((i * 0.43) % 2.4).toFixed(2);
    const svg   = plantSVG(t.type || 'daisy', t.stage, t.color);

    const pausedClass = t.paused ? ' gdn-paused' : '';

    if (layout === 'panel') {
      return `<div class="gdn-plant-wrap" data-id="${t.id}">
        <div class="gdn-label-top">${esc(t.name)}</div>
        <div class="gdn-plant-inner${pausedClass}" style="animation-duration:${dur}s;animation-delay:-${delay}s">${svg}</div>
        <div class="gdn-pot-small">${smallPotSVG()}</div>
      </div>`;
    }

    return `<div class="gdn-plant-wrap" data-id="${t.id}">
      <div class="gdn-label-top gdn-label-strip">${esc(t.name)}</div>
      <div class="gdn-plant-inner${pausedClass}" style="animation-duration:${dur}s;animation-delay:-${delay}s">${svg}</div>
      ${bigPotSVG()}
    </div>`;
  }

  // Returns the notepad popup HTML (task log).
  // Each row shows an X button on hover so items can be removed.
  function renderNotepad() {
    const activeHTML = state.tasks.length > 0
      ? state.tasks.map(t => `
          <div class="gdn-np-item">
            <span>☐ ${esc(t.name)}</span>
            <button class="gdn-np-x" data-task-id="${t.id}" title="remove">×</button>
          </div>`).join('')
      : '<div class="gdn-np-empty">nothing growing yet</div>';
    const doneHTML = (state.vases || []).length > 0
      ? `<div class="gdn-np-divider"></div>` +
        (state.vases).map((v, i) => `
          <div class="gdn-np-item gdn-np-done">
            <span><s>${esc(v.name)}</s></span>
            <button class="gdn-np-x" data-vase-idx="${i}" title="remove">×</button>
          </div>`).join('')
      : '';
    return `<div class="gdn-notepad${notepadOpen ? ' gdn-notepad-visible' : ''}" id="gdn-notepad">
      <div class="gdn-np-title">🌱 garden log</div>
      ${activeHTML}${doneHTML}
    </div>`;
  }

  // STRIP LAYOUT (default)
  function renderStrip() {
    root.innerHTML = `<div class="gdn-strip">
      <div class="gdn-strip-stage">
        <div class="gdn-plants-row">
          ${state.tasks.length === 0 ? `<div class="gdn-empty">plant something →</div>` : ''}
          ${state.tasks.map((t, i) => plantUnitHTML(t, i, 'strip')).join('')}
        </div>
      </div>
      <div class="gdn-strip-bar">
        <button class="gdn-add-btn"      id="gdn-add-btn">＋ add</button>
        <button class="gdn-layout-btn"   id="gdn-layout-toggle" title="Switch to window-box layout">⬜ window box</button>
        <button class="gdn-np-btn"       id="gdn-np-btn" title="Task log">📓</button>
        <button class="gdn-hide-btn"     id="gdn-collapse">▾ hide</button>
        ${state.vases.length > 0 ? `<div class="gdn-strip-vases"><div class="gdn-vase" title="click to celebrate">${bouquetHTML(state.vases)}</div></div>` : ''}
      </div>
      <div class="gdn-add-form" id="gdn-add-form">${renderAddForm()}</div>
      ${renderNotepad()}
    </div>`;
  }

  // PANEL LAYOUT (window-box option)
  function renderPanel() {
    root.innerHTML = `<div class="gdn-panel">
      <div class="gdn-panel-body">
        <div class="gdn-plants-row">
          ${state.tasks.length === 0 ? `<div class="gdn-empty">plant something →</div>` : ''}
          ${state.tasks.map((t, i) => plantUnitHTML(t, i, 'panel')).join('')}
        </div>
        <div class="gdn-vase-shelf">
          ${state.vases.length > 0 ? `<div class="gdn-vase" title="click to celebrate">${bouquetHTML(state.vases)}</div>` : ''}
        </div>
      </div>
      <div class="gdn-planterbox"></div>
      <div class="gdn-footer">
        <button class="gdn-add-btn"      id="gdn-add-btn">＋ add</button>
        <button class="gdn-layout-btn"   id="gdn-layout-toggle" title="Switch to garden layout">▬ garden</button>
        <button class="gdn-np-btn"       id="gdn-np-btn" title="Task log">📓</button>
        <button class="gdn-hide-btn"     id="gdn-collapse">▾ hide</button>
      </div>
      <div class="gdn-add-form" id="gdn-add-form">${renderAddForm()}</div>
      ${renderNotepad()}
    </div>`;
  }

  // Shared add-task form used by both layouts.
  // Re-rendered in-place when the user changes the colour swatch or plant type
  // (without a full render() call), so formState drives selection highlights.
  function renderAddForm() {
    const swatches = COLORS.map(c => `
      <button class="gdn-swatch${formState.color === c ? ' gdn-swatch-sel' : ''}"
              data-color="${c}" style="background:${c}"></button>`).join('');

    // Show plant type previews at stage 2 so they look interesting but not overwhelming
    const pills = PLANT_TYPES.map(pt => `
      <div class="gdn-type-pill${formState.type === pt.id ? ' gdn-type-sel' : ''}" data-type="${pt.id}">
        <div class="gdn-type-preview">${plantSVG(pt.id, 2, formState.color)}</div>
        <div class="gdn-type-label">${pt.label}</div>
      </div>`).join('');

    const diceSelClass = formState.isDiceType ? ' gdn-type-sel' : '';
    const diceInner = `<div class="gdn-type-preview gdn-dice-preview">🎲</div>
                       <div class="gdn-type-label">surprise</div>`;
    const dicePill = `
      <div class="gdn-type-pill gdn-type-dice${diceSelClass}" id="gdn-surprise" title="Roll a surprise plant!">
        ${diceInner}
      </div>`;

    const suggestions = SAMPLE_TASKS.map(t =>
      `<button class="gdn-suggest-btn" data-val="${esc(t)}">${esc(t)}</button>`
    ).join('');

    return `
      <div class="gdn-task-suggestions">${suggestions}</div>
      <div class="gdn-form-field">
        <input id="gdn-input" type="text"
               placeholder="what would you like to do/remember?"
               maxlength="50" autocomplete="off"
               value="${esc(formState.name)}"/>
      </div>
      <div class="gdn-type-row">${pills}${dicePill}</div>
      <div class="gdn-form-bottom">
        <div class="gdn-colors">${swatches}</div>
        <div class="gdn-counter-wrap">
          <span class="gdn-cnt-label">times</span>
          <button class="gdn-cnt-btn" id="gdn-cnt-minus">−</button>
          <span class="gdn-cnt-val"   id="gdn-cnt-val">${formState.target}</span>
          <button class="gdn-cnt-btn" id="gdn-cnt-plus">+</button>
        </div>
        <div class="gdn-form-actions">
          <button id="gdn-submit">🌱 plant</button>
          <button id="gdn-cancel">✕</button>
        </div>
      </div>`;
  }


  // ── EVENT HANDLING ─────────────────────────────────────────────────────────
  // Called after every render(). Re-attaches all listeners to the freshly
  // created DOM nodes (innerHTML replacement removes old listeners).
  function attachEvents() {
    const q = s => root.querySelector(s);

    // Toggle visibility
    q('#gdn-toggle')   && q('#gdn-toggle').addEventListener('click',   () => { state.collapsed = false; save(); render(); });
    q('#gdn-collapse') && q('#gdn-collapse').addEventListener('click', () => { state.collapsed = true;  save(); render(); });

    // Dice pill: roll a random type and show its preview in the form.
    // User still types a task name and clicks "plant" to confirm.
    const dicePill = q('#gdn-surprise');
    if (dicePill) {
      dicePill.addEventListener('click', e => {
        e.stopPropagation();
        const type = pickRandomSurpriseType();
        formState.type       = type;
        formState.color      = (type === 'duck' || type === 'mushroom' || type === 'frog')
          ? formState.color  // keep current colour (creatures ignore it anyway)
          : COLORS[Math.floor(Math.random() * COLORS.length)];
        formState.isDiceType = true;
        refreshForm();
      });
    }

    // Switch between strip and panel layouts
    q('#gdn-layout-toggle') && q('#gdn-layout-toggle').addEventListener('click', () => {
      state.layout = state.layout === 'panel' ? 'strip' : 'panel';
      save(); render();
    });

    // Open / close the add form
    const addBtn  = q('#gdn-add-btn');
    const addForm = q('#gdn-add-form');
    addBtn && addBtn.addEventListener('click', e => {
      e.stopPropagation();
      addForm.classList.toggle('gdn-form-visible');
      if (addForm.classList.contains('gdn-form-visible')) q('#gdn-input') && q('#gdn-input').focus();
    });

    // Form field bindings
    q('#gdn-input')     && q('#gdn-input').addEventListener('input', e => { formState.name = e.target.value; });
    q('#gdn-input')     && q('#gdn-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') addForm.classList.remove('gdn-form-visible'); });
    q('#gdn-cnt-minus') && q('#gdn-cnt-minus').addEventListener('click', () => { if (formState.target > 1)  { formState.target--; q('#gdn-cnt-val').textContent = formState.target; } });
    q('#gdn-cnt-plus')  && q('#gdn-cnt-plus').addEventListener('click',  () => { if (formState.target < 50) { formState.target++; q('#gdn-cnt-val').textContent = formState.target; } });
    q('#gdn-submit')    && q('#gdn-submit').addEventListener('click', addTask);
    q('#gdn-cancel')    && q('#gdn-cancel').addEventListener('click', () => addForm && addForm.classList.remove('gdn-form-visible'));

    // Colour swatch or plant type changes: re-render just the form interior
    // so the selection highlights update without losing the open state.
    function refreshForm() {
      formState.name = q('#gdn-input') ? q('#gdn-input').value : formState.name;
      addForm.innerHTML = renderAddForm();
      addForm.classList.add('gdn-form-visible');
      attachEvents(); // re-run so new form elements get listeners
    }
    root.querySelectorAll('.gdn-swatch').forEach(sw => {
      sw.addEventListener('click', e => { e.stopPropagation(); formState.color = sw.dataset.color; refreshForm(); });
    });
    root.querySelectorAll('.gdn-type-pill:not(.gdn-type-dice)').forEach(pill => {
      pill.addEventListener('click', e => {
        e.stopPropagation();
        formState.type       = pill.dataset.type;
        formState.isDiceType = false;
        refreshForm();
      });
    });

    // Sample task chips: click to fill the input
    root.querySelectorAll('.gdn-suggest-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        formState.name = btn.dataset.val;
        const inp = q('#gdn-input');
        if (inp) { inp.value = formState.name; inp.focus(); }
      });
    });

    // Notepad toggle: show/hide the task log
    q('#gdn-np-btn') && q('#gdn-np-btn').addEventListener('click', e => {
      e.stopPropagation();
      notepadOpen = !notepadOpen;
      const np = root.querySelector('#gdn-notepad');
      if (np) np.classList.toggle('gdn-notepad-visible', notepadOpen);
    });

    // Notepad X buttons: remove a task or a picked flower from the log
    const np = root.querySelector('#gdn-notepad');
    if (np) {
      np.querySelectorAll('.gdn-np-x').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (btn.dataset.taskId !== undefined) {
            state.tasks = state.tasks.filter(t => t.id !== +btn.dataset.taskId);
          } else if (btn.dataset.vaseIdx !== undefined) {
            state.vases.splice(+btn.dataset.vaseIdx, 1);
          }
          notepadOpen = true; // keep notepad open after delete
          save(); render();
        });
      });
    }

    // Vase click: only the flower heads jump (the glass body stays still)
    root.querySelectorAll('.gdn-vase').forEach(v => {
      v.addEventListener('click', () => {
        const flowers = v.querySelector('.gdn-vase-flowers');
        if (!flowers) return;
        flowers.classList.remove('gdn-vase-jump');
        void flowers.offsetWidth;
        flowers.classList.add('gdn-vase-jump');
        setTimeout(() => flowers.classList.remove('gdn-vase-jump'), 700);
      });
    });

    // Plants: single click = water, double-click = open pick/remove menu.
    // A 220ms timer distinguishes single from double: if a second click arrives
    // within that window, we cancel the water action and open the menu instead.
    root.querySelectorAll('.gdn-plant-wrap').forEach(wrap => {
      const id = +wrap.dataset.id;
      let clickTimer = null;

      wrap.addEventListener('click', e => {
        e.stopPropagation();
        if (clickTimer) return; // wait for dblclick to handle it
        clickTimer = setTimeout(() => { clickTimer = null; waterTask(id, wrap); }, 220);
      });

      wrap.addEventListener('dblclick', e => {
        e.stopPropagation();
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        const task = state.tasks.find(t => t.id === id);
        if (task) showMenu(wrap, task);
      });
    });
  }


  // ── TASK ACTIONS ───────────────────────────────────────────────────────────

  // Water a task: increment the watered counter and recalculate stage.
  // Stage is proportional to progress toward target: 0%, 33%, 66%, 100% = stages 0–3.
  // The watering-can animation plays first; state updates and re-render happen after.
  function waterTask(id, wrap) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.watered = (task.watered || 0) + 1;
    task.stage   = Math.min(3, Math.floor((task.watered / task.target) * 4));
    save();
    animateWatering(wrap, task.watered, () => {
      render();
      // Add a grow-in animation to the freshly rendered plant wrap
      const fresh = root.querySelector(`[data-id="${id}"]`);
      if (fresh) {
        fresh.classList.add('gdn-just-grew');
        setTimeout(() => fresh.classList.remove('gdn-just-grew'), 700);
      }
    });
  }

  // Read the form, push a new task onto state, reset ephemeral form fields, save.
  function addTask() {
    const input = root.querySelector('#gdn-input');
    const name  = (input ? input.value : formState.name).trim();
    if (!name) {
      // Pulse the text box to remind the user to type something
      if (input) {
        input.classList.remove('gdn-input-required');
        void input.offsetWidth;
        input.classList.add('gdn-input-required');
        input.focus();
        setTimeout(() => input.classList.remove('gdn-input-required'), 1400);
      }
      return;
    }
    state.tasks.push({
      id:      state.nextId++,
      name,
      type:    formState.type,
      color:   formState.color,
      stage:   0,
      watered: 0,
      target:  formState.target,
    });
    formState.name       = '';
    formState.target     = 1;
    formState.isDiceType = false;
    save(); render();
    const af = root.querySelector('#gdn-add-form');
    if (af) af.classList.remove('gdn-form-visible');
  }


  // ── INIT ───────────────────────────────────────────────────────────────────

  // Create the garden root element and attach it to the page body.
  const root = document.createElement('div');
  root.id = 'gdn-root';
  document.body.appendChild(root);

  // Load persisted state from localStorage before first render.
  loadState();

  render();

})();
