/**
 * Staff Page Controller - Minimal bootstrap version
 * 
 * This controller provides exactly one source of truth for staff data,
 * with DOM beacons for deterministic testing.
 */

(function(){
  // LOAD beacon at parse-time
  try { document.documentElement.setAttribute('data-staff-ctrl','loaded'); } catch {}
  window.__staffCtrlInitialized ??= false;

  window.staffControllerInit = async function(){
    if (window.__staffCtrlInitialized) return;
    window.__staffCtrlInitialized = true;
    try {
      console.log('🚀 Staff controller initializing...');
      
      // 1) fetch all staff (unfiltered 28)
      const res = await fetch('/api/staff/allstaff', { credentials:'include' });
      const all = await res.json();
      console.log(`📋 Fetched ${all.length} staff members`);

      // 2) optional roster
      let roster = [];
      try {
        const rr = await fetch('/api/staff/roster', { credentials:'include' });
        roster = rr.ok ? await rr.json() : [];
      } catch (e) {
        console.log('ℹ️ No roster endpoint, using empty roster');
      }

      // 3) render available-staff = all - roster
      const chosen = new Set(roster.map(r => r.name || r));
      const dd = document.getElementById('available-staff');
      if (dd) {
        dd.innerHTML = '';
        for (const name of all) {
          if (chosen.has(name)) continue;
          const o = document.createElement('option');
          o.value = o.textContent = name;
          dd.appendChild(o);
        }
        console.log(`✅ Populated dropdown with ${all.length - chosen.size} available staff`);
      }

      // 4) render roster into existing markup (#roster-list)
      const list = document.getElementById('roster-list');
      if (list) {
        list.innerHTML = '';
        roster.forEach((staff, index) => {
          const el = document.createElement(list.tagName === 'UL' ? 'li' : 'div');
          el.className = 'roster-grid';
          el.draggable = true;
          el.dataset.index = index;
          const name = staff.name || staff;
          const statusText = staff.status || null;
          const busyUntil = staff.busy_until || null;
          const isNext = staff.status === 'Next';
          const isBusy = staff.status === 'Busy';
          const countText = staff.todayCount || 0;
          
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
        console.log(`✅ Rendered ${roster.length} staff in roster`);
        
        // helper enhancer allowed, but must not create buttons
        window.rosterUI?.enhance?.(list);
      }

      // Show/hide empty message
      const emptyMessage = document.getElementById('empty-roster');
      if (emptyMessage) {
        emptyMessage.style.display = roster.length === 0 ? 'block' : 'none';
      }

      document.documentElement.setAttribute('data-staff-ctrl','init');
      console.log('✅ Staff controller initialized successfully');
      
    } catch (e) {
      console.error('[STAFF_CTRL/INIT_ERROR]', e);
      document.documentElement.setAttribute('data-staff-ctrl','error');
    }
  };
})();