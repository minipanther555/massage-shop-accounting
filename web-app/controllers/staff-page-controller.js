/**
 * Staff Page Controller - Contract-locked version
 * 
 * This controller provides exactly one source of truth for staff data,
 * with DOM beacons for deterministic testing and backup-spec compliance.
 */

(function(){
  // LOAD beacon at parse-time
  try { document.documentElement.setAttribute('data-staff-ctrl','loaded'); } catch {}
  window.__staffCtrlInitialized ??= false;

  // BACKUP-CONTRACT CONSTANTS — exact IDs/classes from staff.html.backup
  const SELECTORS = {
    rosterList: '#roster-list',
    emptyRoster: '#empty-roster',
    availableStaff: '#available-staff'
  };
  const CLASS = {
    section: 'section',
    rosterGrid: 'roster-grid',
    btn: 'btn',
    btnSecondary: 'btn-secondary'
  };

  // DATA PROJECTOR — protects against [object Object]
  function projectName(x) {
    if (x && typeof x === 'object') {
      if (typeof x.masseuse_name === 'string') return x.masseuse_name;
      if (typeof x.name === 'string') return x.name;
    }
    if (typeof x === 'string') return x;
    return '[invalid]';
  }

  // RENDER — uses projector; writes cards with backup classes only
  function renderRoster(roster) {
    const list = document.querySelector(SELECTORS.rosterList);
    const empty = document.querySelector(SELECTORS.emptyRoster);
    if (!list || !empty) throw new Error('DOM contract broken: roster anchors missing');

    list.innerHTML = '';

    if (!Array.isArray(roster) || roster.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    roster.forEach((staff, index) => {
      const el = document.createElement('div');
      el.className = CLASS.rosterGrid;
      el.draggable = true;
      el.dataset.index = index;
      
      const name = projectName(staff); // ← FIXED: Use projector
      const statusText = staff.status || null;
      const busyUntil = staff.busy_until || null;
      const isNext = staff.status === 'Next';
      const isBusy = staff.status && staff.status.startsWith('Busy until');
      const countText = staff.today_massages || 0;
      
      el.innerHTML = `
        <div>${staff.position || index + 1}</div>
        <div>${name}</div>
        <div>${isNext ? 'Next' : (isBusy ? `Busy until ${busyUntil || 'unknown'}` : 'Available')}</div>
        <div>${countText} today</div>
        <div>
          <button onclick="setNextInLine(${staff.position || index + 1})" class="btn btn-small" ${isNext ? 'disabled' : ''}>Next</button>
          <button onclick="moveUp(${staff.position || index + 1})" class="btn btn-small" ${staff.position === 1 ? 'disabled' : ''}>↑</button>
          <button onclick="moveDown(${staff.position || index + 1})" class="btn btn-small" ${staff.position === 20 ? 'disabled' : ''}>↓</button>
          <button onclick="removeFromRoster(${staff.position || index + 1})" class="btn btn-danger btn-small">✕</button>
        </div>
      `;
      list.appendChild(el);
    });
  }

  // DROPDOWN POPULATION — uses projector for consistency
  function renderDropdown(allStaff, roster) {
    const dd = document.querySelector(SELECTORS.availableStaff);
    if (!dd) return;

    dd.innerHTML = '<option value="">Select masseuse to add...</option>';
    
    // Use projector to get names consistently
    const chosen = new Set(roster.map(r => projectName(r)));
    
    allStaff.forEach(name => {
      if (chosen.has(name)) return;
      const o = document.createElement('option');
      o.value = o.textContent = name;
      dd.appendChild(o);
    });
  }

  window.staffControllerInit = async function(){
    if (window.__staffCtrlInitialized) return;
    window.__staffCtrlInitialized = true;
    try {
      console.log('🚀 Staff controller initializing...');
      
      // 1) fetch all staff (unfiltered)
      const res = await fetch('/api/staff/allstaff', { credentials:'include' });
      const all = await res.json();
      console.log(`📋 Fetched ${all.length} staff members`);

      // 2) fetch roster
      let roster = [];
      try {
        const rr = await fetch('/api/staff/roster', { credentials:'include' });
        roster = rr.ok ? await rr.json() : [];
      } catch (e) {
        console.log('ℹ️ No roster endpoint, using empty roster');
      }

      // 3) render with projector
      renderRoster(roster);
      renderDropdown(all, roster);

      document.documentElement.setAttribute('data-staff-ctrl','init');
      console.log('✅ Staff controller initialized successfully');
      
    } catch (e) {
      console.error('[STAFF_CTRL/INIT_ERROR]', e);
      document.documentElement.setAttribute('data-staff-ctrl','error');
    }
  };
})();