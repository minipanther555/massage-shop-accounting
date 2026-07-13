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

  // ---- BEGIN TEMP BACK-COMPAT SHIM (remove after cleanup) ----
  let ALL_STAFF = Array.isArray(globalThis.ALL_STAFF) ? globalThis.ALL_STAFF : [];
  let CURRENT_ROSTER = Array.isArray(globalThis.CURRENT_ROSTER) ? globalThis.CURRENT_ROSTER : [];

  // Map old names to the new sources of truth to prevent ReferenceError
  Object.defineProperty(globalThis, 'allStaffCache', {
    configurable: true,
    get() { return ALL_STAFF; },
    set(v) { ALL_STAFF = Array.isArray(v) ? v : []; }
  });
  Object.defineProperty(globalThis, 'rosterCache', {
    configurable: true,
    get() { return CURRENT_ROSTER; },
    set(v) { CURRENT_ROSTER = Array.isArray(v) ? v : []; }
  });
  // ---- END TEMP BACK-COMPAT SHIM ----

  // Robust safe helpers - prevent crashes on undefined
  const safeArr = (a) => Array.isArray(a) ? a : [];
  const safeNames = (x) => {
    if (Array.isArray(x)) return x;
    if (x && Array.isArray(x.names)) return x.names;
    if (x && Array.isArray(x.data)) return x.data;
    return [];
  };

  let addLocked = false;
  let HELPER_ROWS = [];
  let DAY_OFF_ROWS = [];
  const HELPER_COLLAPSE_STORAGE_KEY = 'todayStaffHelperSectionsCollapsed';

  // BACKUP-CONTRACT CONSTANTS — exact IDs/classes from staff.html.backup
  const SELECTORS = {
    rosterList: '#roster-list',
    emptyRoster: '#empty-roster',
    availableStaff: '#available-staff',
    showAddStaffModal: '#show-add-staff-modal-btn',
    addStaffModal: '#roster-staff-modal',
    addStaffForm: '#roster-staff-form',
    addStaffName: '#roster-staff-name',
    closeAddStaffModal: '#close-roster-staff-modal',
    cancelAddStaffModal: '#cancel-roster-staff-modal',
    clearRosterModal: '#clear-roster-modal',
    closeClearRosterModal: '#close-clear-roster-modal',
    cancelClearRosterModal: '#cancel-clear-roster-modal',
    confirmClearRoster: '#confirm-clear-roster-btn',
    todayHelperSection: '.today-helper-section',
    dayOffSection: '#day-off-section',
    collapseHelperSections: '#collapse-helper-sections-btn',
    showHelperSections: '#show-helper-sections-btn'
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
        <div class="staff-position">${index + 1}</div>
        <div class="staff-name-cell"><strong>${name}</strong><span class="drag-hint">ลากเพื่อจัดลำดับ</span></div>
        <div class="staff-next-cell">
          <button class="btn ${isNext ? 'btn-next' : 'btn-secondary'} btn-small staff-next-btn" data-action="setNext" data-position="${staff.position || index + 1}" ${isNext ? 'disabled' : ''}>${isNext ? 'คิวถัดไป' : 'ตั้งคิว'}</button>
          ${busyUntil ? `<br><small>Busy until ${busyUntil}</small>` : ''}
          ${isBusy ? `<br><small style="color: #ff6b6b;">${statusText}</small>` : ''}
        </div>
        <div class="staff-count" aria-label="นวดวันนี้ ${countText} ครั้ง"><span class="staff-count-label">นวดวันนี้</span> <strong>${countText}</strong> <span>ครั้ง</span></div>
        <div class="staff-row-actions">
          <button class="btn btn-small staff-order-btn" data-action="moveUp" data-position="${staff.position || index + 1}" ${staff.position === 1 ? 'disabled' : ''} aria-label="เลื่อนขึ้น">ขึ้น</button>
          <button class="btn btn-small staff-order-btn" data-action="moveDown" data-position="${staff.position || index + 1}" ${staff.position === 20 ? 'disabled' : ''} aria-label="เลื่อนลง">ลง</button>
          <button class="btn btn-danger btn-small staff-remove-btn" data-action="remove" data-position="${staff.position || index + 1}">ลบ</button>
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
  function renderDropdown(available) {
    const dd = document.querySelector(SELECTORS.availableStaff);
    if (!dd) return;

    dd.innerHTML = '<option value="">แตะเพื่อเลือกพนักงาน...</option>';
    
    // Null-safe: guard against undefined inputs
    const list = safeArr(available);
    
    list.forEach(name => {
      const o = document.createElement('option');
      if (name && typeof name === 'object') {
        o.value = String(name.staff_id || name.id || name.display_name || name.name);
        o.textContent = name.display_name || name.name || name.masseuse_name;
        o.dataset.staffId = String(name.staff_id || name.id || '');
      } else {
        o.value = o.textContent = name;
      }
      dd.appendChild(o);
    });
    
    // Dropdown beacon for test harness
    document.documentElement.dataset.staffDropdown = String(Date.now());
  }

  function formatBaht(value) {
    return `฿${Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
  }

  function areHelperSectionsCollapsed() {
    try {
      return localStorage.getItem(HELPER_COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function applyHelperCollapseState() {
    document.body.classList.toggle('helpers-collapsed', areHelperSectionsCollapsed());
  }

  function setHelperSectionsCollapsed(isCollapsed) {
    try {
      if (isCollapsed) localStorage.setItem(HELPER_COLLAPSE_STORAGE_KEY, '1');
      else localStorage.removeItem(HELPER_COLLAPSE_STORAGE_KEY);
    } catch {}
    applyHelperCollapseState();
  }

  function bindHelperCollapseControls() {
    document.querySelector(SELECTORS.collapseHelperSections)?.addEventListener('click', () => {
      setHelperSectionsCollapsed(true);
    });
    document.querySelector(SELECTORS.showHelperSections)?.addEventListener('click', () => {
      setHelperSectionsCollapsed(false);
      document.querySelector(SELECTORS.todayHelperSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    applyHelperCollapseState();
  }

  function renderHelperRows(rows) {
    const list = document.querySelector('#today-helper-list');
    const error = document.querySelector('#today-helper-error');
    if (!list) return;
    if (error) error.style.display = 'none';
    list.innerHTML = '';

    safeArr(rows)
      .filter(row => row.today_planning_status !== 'day_off_today')
      .forEach((row) => {
        const el = document.createElement('div');
        const isAdded = row.today_planning_status === 'added_to_today_staff' || !row.can_add_to_today_staff;
        el.className = `today-helper-row${isAdded ? ' is-added' : ''}`;
        el.innerHTML = `
          <strong>${row.display_name}</strong>
          <span class="today-helper-commission">${formatBaht(row.previous_day_commission)}</span>
          <span class="today-helper-flag">${row.was_day_off_yesterday ? 'หยุดเมื่อวาน' : ''}</span>
          <span>
            <button type="button" class="btn btn-small helper-add-btn" data-staff-id="${row.staff_id}" ${isAdded ? 'disabled' : ''}>เพิ่ม</button>
            <button type="button" class="btn btn-secondary btn-small helper-day-off-btn" data-staff-id="${row.staff_id}" ${isAdded ? 'disabled' : ''}>หยุดวันนี้</button>
          </span>
        `;
        list.appendChild(el);
      });

    list.querySelectorAll('.helper-add-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        await addTodayStaffById(button.dataset.staffId);
      });
    });
    list.querySelectorAll('.helper-day-off-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        await api.markTodayStaffDayOff({ staff_id: Number(button.dataset.staffId) });
        await refreshTodayStaffPage();
      });
    });
  }

  function renderDayOffRows(rows) {
    const section = document.querySelector('#day-off-section');
    const list = document.querySelector('#day-off-list');
    if (!section || !list) return;
    list.innerHTML = '';
    const dayOffRows = safeArr(rows);
    section.style.display = dayOffRows.length ? 'block' : 'none';
    applyHelperCollapseState();

    dayOffRows.forEach((row) => {
      const el = document.createElement('div');
      el.className = 'day-off-row';
      el.innerHTML = `
        <strong>${row.display_name}</strong>
        <span>หยุดวันนี้</span>
        <button type="button" class="btn btn-small restore-day-off-btn" data-staff-id="${row.staff_id}">กลับมาเพิ่มได้</button>
      `;
      list.appendChild(el);
    });

    list.querySelectorAll('.restore-day-off-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        await api.restoreTodayStaffDayOff({ staff_id: Number(button.dataset.staffId) });
        await refreshTodayStaffPage();
      });
    });
  }

  function showHelperError(message) {
    const error = document.querySelector('#today-helper-error');
    const list = document.querySelector('#today-helper-list');
    if (list) list.innerHTML = '';
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
  }

  async function refreshTodayStaffPage() {
    let state = null;
    try {
      state = await api.getTodayStaffState();
      CURRENT_ROSTER = safeArr(state.today_staff);
      DAY_OFF_ROWS = safeArr(state.day_off_today);
      renderRoster(CURRENT_ROSTER);
      renderDayOffRows(DAY_OFF_ROWS);
      renderDropdown(safeArr(state.dropdown_staff));
    } catch (error) {
      console.error('Error refreshing Today Staff state:', error);
      CURRENT_ROSTER = safeArr(await api.getStaffRoster());
      renderRoster(CURRENT_ROSTER);
      const inRoster = new Set(CURRENT_ROSTER.map(x => x?.masseuse_name).filter(Boolean));
      renderDropdown(safeArr(ALL_STAFF).filter(n => !inRoster.has(n)));
    }

    try {
      const helper = await api.getTodayStaffHelper();
      HELPER_ROWS = safeArr(helper.rows);
      renderHelperRows(HELPER_ROWS);
    } catch (error) {
      console.error('Error refreshing helper data:', error);
      showHelperError('โหลดรายได้เมื่อวานไม่ได้ ยังเลือกชื่อจากช่องด้านล่างได้');
    }
  }

  async function addTodayStaffById(staffId) {
    await api.addTodayStaff({ staff_id: Number(staffId) });
    await refreshTodayStaffPage();
  }

  function openAddStaffModal() {
    const modal = document.querySelector(SELECTORS.addStaffModal);
    const input = document.querySelector(SELECTORS.addStaffName);
    const form = document.querySelector(SELECTORS.addStaffForm);

    if (!modal || !input || !form) return;
    form.reset();
    modal.style.display = 'block';
    input.focus();
  }

  function closeAddStaffModal() {
    const modal = document.querySelector(SELECTORS.addStaffModal);
    if (modal) modal.style.display = 'none';
  }

  function openClearRosterModal() {
    const modal = document.querySelector(SELECTORS.clearRosterModal);
    if (modal) modal.style.display = 'block';
  }

  function closeClearRosterModal() {
    const modal = document.querySelector(SELECTORS.clearRosterModal);
    if (modal) modal.style.display = 'none';
  }

  async function clearVisibleRoster() {
    try {
      console.log('🔧 Confirmed clear roster, calling clearRoster');
      await api.clearRoster();
      console.log('🔧 clearRoster completed');

      await refreshTodayStaffPage();

      closeClearRosterModal();
      globalThis.showToast?.('ล้างรายชื่อวันนี้แล้ว');
    } catch (error) {
      console.error('Error clearing roster:', error);
      globalThis.showToast?.('Error clearing roster', 'error');
    }
  }

  async function refreshMasterStaffDropdown(preselectName) {
    ALL_STAFF = safeNames(await window.api.getAllStaff());
    await refreshTodayStaffPage();

    const dd = document.querySelector(SELECTORS.availableStaff);
    if (dd && preselectName) {
      const option = Array.from(dd.options).find(o => o.textContent === preselectName);
      if (option) dd.value = option.value;
    }
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
      
      const previousPosition = position - 1;
      const staffMember = CURRENT_ROSTER.find(r => r.position === position);
      const previousStaff = CURRENT_ROSTER.find(r => r.position === previousPosition);
      
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
        
        // Re-fetch and render - single source of truth
        CURRENT_ROSTER = await api.getStaffRoster();
        renderRoster(CURRENT_ROSTER);
      }
    } catch (error) {
      console.error('Error moving staff up:', error);
    }
  }

  async function moveDown(position) {
    try {
      if (position === 20) return; // Can't move down from position 20
      
      const nextPosition = position + 1;
      const staffMember = CURRENT_ROSTER.find(r => r.position === position);
      const nextStaff = CURRENT_ROSTER.find(r => r.position === nextPosition);
      
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
        
        // Re-fetch and render - single source of truth
        CURRENT_ROSTER = await api.getStaffRoster();
        renderRoster(CURRENT_ROSTER);
      }
    } catch (error) {
      console.error('Error moving staff down:', error);
    }
  }

  async function removeFromRoster(position) {
    try {
      await api.removeStaffFromRoster(position);

      // Fresh read (don't trust write responses)
      const fresh = safeArr(await api.getStaffRoster());
      CURRENT_ROSTER = fresh;

      const all = safeNames(ALL_STAFF);
      const inRoster = new Set(fresh.map(x => x?.masseuse_name).filter(Boolean));
      const available = all.filter(n => !inRoster.has(n));

      renderRoster(fresh);
      renderDropdown(available);
      
      // Test hook marker
      if (window.__staffTest) {
        window.__staffTest.lastOp = 'remove_done';
        window.__staffTest.state.ALL_STAFF = safeArr(ALL_STAFF);
        window.__staffTest.state.CURRENT_ROSTER = safeArr(CURRENT_ROSTER);
      }
    } catch (e) {
      console.error('Error removing staff:', e);
    }
  }

  window.staffControllerInit = async function(apiClient){
    if (window.__staffCtrlInitialized) return;
    window.__staffCtrlInitialized = true;
    
    // Store API client globally
    if (apiClient) {
      window.api = apiClient;
    }
    
    try {
      console.log('🚀 Staff controller initializing...');
      
      // Ensure API client is available
      if (!window.api) {
        throw new Error('API client not available');
      }
      
      // 1) fetch all staff (unfiltered) - single source of truth
      ALL_STAFF = safeNames(await window.api.getAllStaff());
      console.log(`📋 Fetched ${ALL_STAFF.length} staff members`);

      await refreshTodayStaffPage();

      // Bind the Add to Roster button
      bindHelperCollapseControls();

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
              const selectedStaffId = selectedOption.dataset.staffId || null;
              console.log('🔧 Adding Today Staff:', masseuseName, selectedStaffId);
              await api.addTodayStaff(selectedStaffId ? { staff_id: Number(selectedStaffId) } : { display_name: masseuseName });
              await refreshTodayStaffPage();
              
              // Test hook marker
              if (window.__staffTest) {
                window.__staffTest.lastOp = 'add_done';
                window.__staffTest.state.ALL_STAFF = safeArr(ALL_STAFF);
                window.__staffTest.state.CURRENT_ROSTER = safeArr(CURRENT_ROSTER);
              }
              
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

      // Bind Add New Staff modal controls
      const showAddStaffBtn = document.querySelector(SELECTORS.showAddStaffModal);
      const addStaffForm = document.querySelector(SELECTORS.addStaffForm);
      const closeAddStaffBtn = document.querySelector(SELECTORS.closeAddStaffModal);
      const cancelAddStaffBtn = document.querySelector(SELECTORS.cancelAddStaffModal);
      const addStaffModal = document.querySelector(SELECTORS.addStaffModal);

      showAddStaffBtn?.addEventListener('click', openAddStaffModal);
      closeAddStaffBtn?.addEventListener('click', closeAddStaffModal);
      cancelAddStaffBtn?.addEventListener('click', closeAddStaffModal);
      addStaffModal?.addEventListener('click', (event) => {
        if (event.target === addStaffModal) closeAddStaffModal();
      });

      addStaffForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const input = document.querySelector(SELECTORS.addStaffName);
        const name = input?.value.trim();
        if (!name) {
          globalThis.showToast?.('Please enter a staff name', 'error');
          return;
        }

        try {
          await window.api.addStaff({ name });
          closeAddStaffModal();
          await refreshMasterStaffDropdown(name);
          globalThis.showToast?.(`${name} added. Select Add to Roster to put them on today's list.`);
        } catch (error) {
          console.error('Error creating staff member:', error);
          globalThis.showToast?.(error.message || 'Error adding staff member', 'error');
        }
      });
      
      // Bind the Clear All button
      const clearBtn = document.getElementById('clear-roster-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', openClearRosterModal);
      }

      const clearRosterModal = document.querySelector(SELECTORS.clearRosterModal);
      const closeClearBtn = document.querySelector(SELECTORS.closeClearRosterModal);
      const cancelClearBtn = document.querySelector(SELECTORS.cancelClearRosterModal);
      const confirmClearBtn = document.querySelector(SELECTORS.confirmClearRoster);

      closeClearBtn?.addEventListener('click', closeClearRosterModal);
      cancelClearBtn?.addEventListener('click', closeClearRosterModal);
      clearRosterModal?.addEventListener('click', (event) => {
        if (event.target === clearRosterModal) closeClearRosterModal();
      });
      confirmClearBtn?.addEventListener('click', clearVisibleRoster);

      document.documentElement.setAttribute('data-staff-ctrl','init');
      console.log('✅ Staff controller initialized successfully');
      
      // PWTEST-only test hook (no globals in prod)
      if (document.cookie.includes('PWTEST=1')) {
        window.__staffTest = {
          ready: true,
          lastOp: null,
          state: {
            ALL_STAFF: safeArr(ALL_STAFF),
            CURRENT_ROSTER: safeArr(CURRENT_ROSTER)
          },
          getState: () => ({ ALL_STAFF: safeArr(ALL_STAFF), CURRENT_ROSTER: safeArr(CURRENT_ROSTER) })
        };
        
        // Contract check - fail fast if API method missing
        if (typeof window.api?.removeStaffFromRoster !== 'function') {
          console.error('[CONTRACT] api.removeStaffFromRoster missing');
          const b = document.createElement('div');
          b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#b91c1c;color:#fff;padding:6px 10px;z-index:99999;font:12px sans-serif';
          b.textContent = 'CONTRACT ERROR: api.removeStaffFromRoster missing';
          document.body.prepend(b);
        }
      }
      
    } catch (e) {
      console.error('[STAFF_CTRL/INIT_ERROR]', e);
      document.documentElement.setAttribute('data-staff-ctrl','error');
    }
  };
})();// Test hot-reload Fri Sep 19 13:49:58 +07 2025
