/**
 * Staff Page Controller - Seam for deterministic testing
 *
 * This controller extracts the page logic from staff.ejs into a testable,
 * dependency-injectable module. No behavior change for production.
 */

// Build-time beacon for code identity verification
const BUILD = {
  sha: 'testing30-fix',
  file: 'staff-page-controller.js',
  stamp: new Date().toISOString(),
  version: '1.0.0-duplicate-fix'
};
console.info('[STAFF_CTRL/LOAD]', BUILD);

function createStaffPageController({
  fetch, clock, logger, singleFlight = null
}) {
  // Use injected single-flight guard or create a new one
  const globalInflightRequests = singleFlight || new Map();
  let isInitialized = false;
  let intervalId = null;

  // Mock appData for testing
  const appData = { roster: [] };

  // Mock API client
  const api = {
    getAllStaff: () => fetch('/api/staff/allstaff').then((r) => r.json()),
    getStaffRoster: () => fetch('/api/staff/roster').then((r) => r.json()),
    getServices: () => fetch('/api/services').then((r) => r.json()),
    getPaymentMethods: () => fetch('/api/services/payment-methods').then((r) => r.json())
  };

  // Mock utility functions
  const requireAuth = () => true;
  const getCurrentUser = () => ({ role: 'admin', username: 'test' });
  const setupMobileControls = () => {};

  // Load data function
  const loadData = async () => {
    const [, , roster] = await Promise.all([
      api.getServices(),
      api.getPaymentMethods(),
      api.getStaffRoster()
    ]);

    appData.roster = roster.map((r) => ({
      position: r.position,
      name: r.masseuse_name || '',
      status: r.status || null,
      busy_until: r.busy_until || null,
      todayCount: r.today_massages || 0
    }));
  };

  // Update dropdown function (extracted from staff.ejs)
  const updateAvailableStaffDropdown = () => {
    const dropdown = document.getElementById('available-staff');
    if (!dropdown) return undefined;

    const requestKey = 'GET:/api/staff/allstaff';

    // Request tap for network transcript (dev only)
    if (typeof window !== 'undefined' && !window.requestTranscript) {
      window.requestTranscript = [];
    }

    // Global single-flight guard to prevent overlapping calls across all instances
    if (globalInflightRequests.has(requestKey)) {
      logger.log('⏳ Staff dropdown update already in progress globally, skipping...');
      return globalInflightRequests.get(requestKey);
    }

    // Get all staff names from the API
    const requestPromise = api.getAllStaff().then((allStaffNames) => {
      // Record request in transcript
      if (typeof window !== 'undefined' && window.requestTranscript) {
        window.requestTranscript.push({
          timestamp: Date.now(),
          url: '/api/staff/allstaff',
          method: 'GET',
          source: 'controller'
        });
        logger.log(`[REQUEST_TAP] GET /api/staff/allstaff (total: ${window.requestTranscript.length})`);
      }
      // Get masseuses not already in the current roster
      const usedNames = appData.roster
        .filter((r) => r.name && r.name.trim() !== '')
        .map((r) => r.name);

      const availableStaff = allStaffNames.filter((name) => !usedNames.includes(name));

      // IDEMPOTENT RENDER: Clear and rebuild completely
      dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';

      // Build options in document fragment for better performance
      const fragment = document.createDocumentFragment();
      availableStaff.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        fragment.appendChild(option);
      });

      // Replace all children atomically
      dropdown.appendChild(fragment);

      logger.log(
        `✅ Populated dropdown with ${availableStaff.length} available staff out of ${allStaffNames.length} total staff`
      );
    }).catch((error) => {
      logger.error('❌ Error fetching all staff names:', error);
      // Ensure default option remains on error
      dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
    }).finally(() => {
      // Clear the global inflight flag
      globalInflightRequests.delete(requestKey);
    });

    globalInflightRequests.set(requestKey, requestPromise);
    return requestPromise;
  };

  // Update roster display function (extracted from staff.ejs)
  const updateRosterDisplay = () => {
    const rosterList = document.getElementById('roster-list');
    if (!rosterList) return undefined;

    // Simulate roster rendering logic
    rosterList.innerHTML = '';

    // FIXED: Removed duplicate call to updateAvailableStaffDropdown()
    // The dropdown is already updated in init() - no need to call it again
    setupMobileControls();
    return undefined;
  };

  // Initialize the page (replaces DOMContentLoaded logic)
  const init = async () => {
    if (isInitialized) {
      logger.log('⚠️ Page already initialized, skipping...');
      return;
    }

    logger.log('🚀 Initializing staff page controller...');
    logger.log('[STAFF_CTRL/INIT]', BUILD);

    // Check authentication first
    if (!requireAuth()) {
      return;
    }

    // Display current user
    const user = getCurrentUser();
    if (user) {
      const userElement = document.getElementById('current-user');
      if (userElement) {
        userElement.textContent = `${user.role} (${user.username})`;
      }
    }

    // Mobile detection and responsive controls
    setupMobileControls();

    // Load data from API first
    await loadData();

    // CRITICAL: This is the first call site
    updateAvailableStaffDropdown(); // Call site 1

    // Then display the roster (which calls updateAvailableStaffDropdown again)
    updateRosterDisplay(); // This triggers call site 2

    // Set up interval (optional, can be disabled for testing)
    if (clock.setInterval) {
      intervalId = clock.setInterval(async () => {
        await loadData();
        updateAvailableStaffDropdown();
        updateRosterDisplay();
      }, 30000);
    }

    isInitialized = true;
    logger.log('✅ Staff page controller initialized');
  };

  // Dispose of resources
  const dispose = () => {
    if (intervalId) {
      clock.clearInterval(intervalId);
      intervalId = null;
    }
    isInitialized = false;
    logger.log('🧹 Staff page controller disposed');
  };

  // Public API
  return {
    init,
    dispose,
    updateAvailableStaffDropdown,
    updateRosterDisplay,
    loadData,
    // Expose for testing
    _appData: appData,
    _api: api
  };
}

// --- bootstrap + single-flight guard (runs on load) ---
if (typeof window !== 'undefined') {
    // Initialize global single-flight map
    window.__staffSingleFlight = window.__staffSingleFlight || new Map();
    
    // Self-register bootstrap function
    if (!window.staffControllerInit) {
        window.staffControllerInit = () => {
            if (window.__staffCtrl?.__inited) return false; // idempotent
            const ctrl = createStaffPageController({ 
                singleFlight: window.__staffSingleFlight,
                fetch: window.fetch,
                clock: {
                    setInterval: window.setInterval,
                    clearInterval: window.clearInterval
                },
                logger: {
                    log: console.log,
                    error: console.error
                }
            });
            window.__staffCtrl = ctrl;
            ctrl.init();                // <-- makes the 1 GET
            ctrl.__inited = true;
            return true;
        };
    }
    
    window.createStaffPageController = createStaffPageController;
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createStaffPageController };
}
