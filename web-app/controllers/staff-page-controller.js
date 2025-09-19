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

  // BIND ROSTER ITEM HANDLERS — controller-based event binding
  function bindRosterItemHandlers(element) {
    const buttons = element.querySelectorAll('button[data-action]');
    buttons.forEach(button => {
      const action = button.dataset.action;
      const position = parseInt(button.dataset.position);
      
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
          switch (action) {
            case 'setNext':
              await setNextInLine(position);
              break;
            case 'moveUp':
              await moveUp(position);
              break;
            case 'moveDown':
              await moveDown(position);
              break;
            case 'remove':
              await removeFromRoster(position);
              break;
          }
        } catch (error) {
          console.error(`Error handling ${action} for position ${position}:`, error);
        }
      });
    });
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
        <div>${index + 1}</div>
        <div><strong>${name}</strong></div>
        <div>
          <button class="btn ${isNext ? 'btn-next' : 'btn-secondary'} btn-small" data-action="setNext" data-position="${staff.position || index + 1}" ${isNext ? 'disabled' : ''}>${isNext ? '👤 NEXT' : 'Set Next'}</button>
          ${busyUntil ? `<br><small>Busy until ${busyUntil}</small>` : ''}
          ${isBusy ? `<br><small style="color: #ff6b6b;">${statusText}</small>` : ''}
        </div>
        <div><strong>${countText} today</strong></div>
        <div>
          <button class="btn btn-small" data-action="moveUp" data-position="${staff.position || index + 1}" ${staff.position === 1 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-small" data-action="moveDown" data-position="${staff.position || index + 1}" ${staff.position === 20 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-danger btn-small" data-action="remove" data-position="${staff.position || index + 1}">✕</button>
        </div>
      `;
      
      // Bind event handlers
      bindRosterItemHandlers(el);
      
      list.appendChild(el);
    });
    
    // Render beacon for test harness
    document.documentElement.dataset.staffRender = String(Date.now());
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
    
    // Dropdown beacon for test harness
    document.documentElement.dataset.staffDropdown = String(Date.now());
  }

  // API ACTION HANDLERS — follow Dropdown→API→Re-fetch→Render discipline
  async function setNextInLine(position) {
    try {
      // Clear all existing "Next" statuses
      const roster = await api.getStaffRoster();
      const activeStaff = roster.filter(r => r.masseuse_name && r.masseuse_name.trim() !== '');
      
      for (const staff of activeStaff) {
        if (staff.status === 'Next') {
          await api.updateStaff(staff.position, {
            masseuse_name: staff.masseuse_name,
            status: null
          });
        }
      }
      
      // Set selected person as next
      const staffMember = roster.find(r => r.position === position);
      if (staffMember) {
        await api.updateStaff(position, {
          masseuse_name: staffMember.masseuse_name,
          status: 'Next'
        });
      }
      
      // Re-fetch and render
      const updatedRoster = await api.getStaffRoster();
      renderRoster(updatedRoster);
      
    } catch (error) {
      console.error('Error setting next in line:', error);
    }
  }

  async function moveUp(position) {
    try {
      if (position === 1) return; // Can't move up from position 1
      
      const roster = await api.getStaffRoster();
      const previousPosition = position - 1;
      const staffMember = roster.find(r => r.position === position);
      const previousStaff = roster.find(r => r.position === previousPosition);
      
      if (staffMember && previousStaff) {
        // Swap the two staff members
        await api.updateStaff(position, {
          masseuse_name: previousStaff.masseuse_name,
          status: previousStaff.status
        });
        await api.updateStaff(previousPosition, {
          masseuse_name: staffMember.masseuse_name,
          status: staffMember.status
        });
        
        // Re-fetch and render
        const updatedRoster = await api.getStaffRoster();
        renderRoster(updatedRoster);
      }
    } catch (error) {
      console.error('Error moving staff up:', error);
    }
  }

  async function moveDown(position) {
    try {
      if (position === 20) return; // Can't move down from position 20
      
      const roster = await api.getStaffRoster();
      const nextPosition = position + 1;
      const staffMember = roster.find(r => r.position === position);
      const nextStaff = roster.find(r => r.position === nextPosition);
      
      if (staffMember && nextStaff) {
        // Swap the two staff members
        await api.updateStaff(position, {
          masseuse_name: nextStaff.masseuse_name,
          status: nextStaff.status
        });
        await api.updateStaff(nextPosition, {
          masseuse_name: staffMember.masseuse_name,
          status: staffMember.status
        });
        
        // Re-fetch and render
        const updatedRoster = await api.getStaffRoster();
        renderRoster(updatedRoster);
      }
    } catch (error) {
      console.error('Error moving staff down:', error);
    }
  }

  async function removeFromRoster(position) {
    try {
      const roster = await api.getStaffRoster();
      const staffMember = roster.find(r => r.position === position);
      
      if (staffMember) {
        await api.removeStaffFromRoster(position);
        
        // Re-fetch and render
        const updatedRoster = await api.getStaffRoster();
        renderRoster(updatedRoster);
        
        // Update dropdown using cached AllStaff (no re-fetch needed)
        renderDropdown(allStaffCache, updatedRoster);
      }
    } catch (error) {
      console.error('Error removing staff:', error);
    }
  }

  window.staffControllerInit = async function(apiClient){
    if (window.__staffCtrlInitialized) return;
    window.__staffCtrlInitialized = true;
    
    // Store API client globally
    if (apiClient) {
      window.api = apiClient;
    }
    
    // Cache AllStaff to avoid re-fetching on every add
    let allStaffCache = null;
    let addLocked = false;
    
    try {
      console.log('🚀 Staff controller initializing...');
      
      // Ensure API client is available
      if (!window.api) {
        throw new Error('API client not available');
      }
      
      // 1) fetch all staff (unfiltered) - cache for session
      allStaffCache = await window.api.getAllStaff();
      console.log(`📋 Fetched ${allStaffCache.length} staff members`);

      // 2) fetch roster
      let roster = [];
      try {
        roster = await window.api.getStaffRoster();
      } catch (e) {
        console.log('ℹ️ No roster endpoint, using empty roster');
      }

      // 3) render with projector
      renderRoster(roster);
      renderDropdown(allStaffCache, roster);

      // Bind the Add to Roster button
      const addBtn = document.getElementById('add-to-roster-btn');
      if (addBtn) {
        addBtn.addEventListener('click', async () => {
          if (addLocked) return;
          addLocked = true;
          
          try {
            console.log('🔧 Add button clicked');
            const select = document.getElementById('available-staff');
            const selectedOption = select.options[select.selectedIndex];
            console.log('🔧 Selected option:', selectedOption.value, selectedOption.text);
            
            if (selectedOption.value) {
              const masseuseName = selectedOption.text;
              
              // Calculate first empty slot from current in-memory roster (no pre-GET needed)
              const positions = roster.map(r => r.position).sort((a,b) => a - b);
              let nextPosition = 1;
              for (const pos of positions) {
                if (pos === nextPosition) nextPosition++;
                else if (pos > nextPosition) break;
              }
              console.log('🔧 Adding staff:', masseuseName, 'at position:', nextPosition);
              
              // PUT request - ignore response, do fresh GET to be safe
              await api.addToRoster(nextPosition, { masseuse_name: masseuseName });
              console.log('🔧 API call completed');
              
              // Get fresh roster state from server
              roster = await api.getStaffRoster();
              console.log('🔧 Updated roster:', roster);
              
              renderRoster(roster);
              console.log('🔧 Roster rendered');
              
              // Update dropdown using cached AllStaff (no re-fetch needed)
              renderDropdown(allStaffCache, roster);
              console.log('🔧 Dropdown updated');
              
              select.value = '';
            } else {
              console.log('🔧 No staff selected');
            }
          } catch (error) {
            console.error('Error adding staff to roster:', error);
          } finally {
            addLocked = false;
          }
        });
      }
      
      // Bind the Clear All button
      const clearBtn = document.getElementById('clear-roster-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          try {
            console.log('🔧 Clear All button clicked');
            if (confirm('Clear all staff from today\'s roster?')) {
              console.log('🔧 Confirm dialog accepted, calling clearRoster');
              await api.clearRoster();
              console.log('🔧 clearRoster completed');
              
              // Update local roster state (no GET needed)
              roster = [];
              console.log('🔧 Local roster cleared');
              
              renderRoster(roster);
              console.log('🔧 renderRoster completed');
              
              // Update dropdown using cached AllStaff (no re-fetch needed)
              renderDropdown(allStaffCache, roster);
              console.log('🔧 renderDropdown completed');
            } else {
              console.log('🔧 Confirm dialog cancelled');
            }
          } catch (error) {
            console.error('Error clearing roster:', error);
          }
        });
      }

      document.documentElement.setAttribute('data-staff-ctrl','init');
      console.log('✅ Staff controller initialized successfully');
      
    } catch (e) {
      console.error('[STAFF_CTRL/INIT_ERROR]', e);
      document.documentElement.setAttribute('data-staff-ctrl','error');
    }
  };
})();