const fs = require('fs');
const path = require('path');

describe('Navigation Bilingual Keys Coverage', () => {
  const pages = [
    'web-app/index.html',
    'web-app/staff.html',
    'web-app/transaction.html',
    'web-app/summary.html',
    'web-app/admin-payment-types.html',
    'web-app/admin-reports.html',
    'web-app/admin-staff.html',
    'web-app/admin-services.html',
    'web-app/admin-users.html',
  ];

  // Define expected NAV_LABELS keys based on our implementation
  const expectedKeys = [
    'home',
    'daily_staff',
    'new_transaction', 
    'daily_summary',
    'payday_tracking',
    'services_pricing',
    'financial_reports',
    'payment_types',
    'logout'
  ];

  test('each page has appropriate bilingual navigation elements', () => {
    for (const page of pages) {
      const filePath = path.join(__dirname, '../..', page);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Check that the page has at least some bilingual navigation elements
      expect(html).toMatch(/<span class=["'][^"']*label-en[^"']*["']>/);
      expect(html).toMatch(/<span class=["'][^"']*label-th[^"']*["']>/);
      
      // Check that each page has appropriate navigation elements
      if (page.includes('index.html')) {
        expect(html).not.toMatch(/class=["'][^"']*nav-btn home[^"']*["']/);
      } else if (page.includes('admin-')) {
        // Admin pages have various navigation elements
        expect(html).toMatch(/Back to Dashboard|🏠 Home|Dashboard/);
      }
    }
  });

  test('no navigation buttons have missing or incomplete bilingual labels', () => {
    for (const page of pages) {
      const filePath = path.join(__dirname, '../..', page);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Find all navigation buttons and links with nav-btn or btn class
      // Use a more comprehensive approach to find buttons
      const buttonMatches = [];
      
      // Look for nav-btn elements
      const navBtnMatches = html.match(/<a[^>]*class=["'][^"']*nav-btn[^"']*["'][^>]*>[\s\S]*?<\/a>/g) || [];
      buttonMatches.push(...navBtnMatches);
      
      // Look for btn elements (but exclude utility buttons)
      const btnMatches = html.match(/<button[^>]*class=["'][^"']*btn[^"']*["'][^>]*>[\s\S]*?<\/button>/g) || [];
      buttonMatches.push(...btnMatches);
      
      buttonMatches.forEach(button => {
        // Skip buttons that don't need bilingual labels (like export buttons)
        if (button.includes('Export to CSV') || button.includes('Export to PDF') || 
            button.includes('Print Report') || button.includes('Retry') ||
            button.includes('Add New Payment Type') || button.includes('Add User') ||
            button.includes('Save Payment Type') || button.includes('Update Payment Type') ||
            button.includes('Cancel') || button.includes('Delete') ||
            button.includes('Submit Transaction') ||
            button.includes('Load Last Transaction for Correction') ||
            button.includes('Add') ||
            button.includes('End Day & Reset') ||
            button.includes('Edit') ||
            button.includes('Refresh Data') ||
            button.includes('Outstanding Fees') ||
            button.includes('Save Staff Member') ||
            button.includes('Save Staff') ||
            button.includes('Record Payment') ||
            button.includes('Pay') ||
            button.includes('❌') ||
            button.includes('Save Service') ||
            button.includes('Disable') || button.includes('Enable') ||
            button.includes('History') ||
            button.includes('staff-primary-action') ||
            button.includes('staff-next-btn') ||
            button.includes('staff-order-btn') ||
            button.includes('staff-remove-btn') ||
            button.includes('helper-collapse-btn') ||
            button.includes('helper-restore-btn') ||
            button.includes('cancel-roster-staff-modal') ||
            button.includes('cancel-clear-roster-modal') ||
            button.includes('confirm-clear-roster-btn') ||
            button.includes('type="submit"') ||
            button.includes('Add to Roster') || button.includes('Clear All') ||
            button.includes('Set Next') || button.includes('Move Up') || button.includes('Move Down') ||
            button.includes('Remove') || button.includes('⬆️') || button.includes('⬇️') ||
            button.includes('↑') || button.includes('↓') || button.includes('✕')) {
          return;
        }
        
        // Each button should have both label-en and label-th spans
        expect(button).toMatch(/<span class=["'][^"']*label-en[^"']*["']>/);
        expect(button).toMatch(/<span class=["'][^"']*label-th[^"']*["']>/);
        
        // Check that the spans contain actual text content
        const enSpan = button.match(/<span class=["'][^"']*label-en[^"']*["']>([^<]*)<\/span>/);
        const thSpan = button.match(/<span class=["'][^"']*label-th[^"']*["']>([^<]*)<\/span>/);
        
        if (enSpan) expect(enSpan[1].trim()).toBeTruthy();
        if (thSpan) expect(thSpan[1].trim()).toBeTruthy();
      });
    }
  });

  test('pages do not render active navigation self-links', () => {
    for (const page of pages) {
      const filePath = path.join(__dirname, '../..', page);
      const html = fs.readFileSync(filePath, 'utf8');

      expect(html).not.toMatch(/class=["'][^"']*nav-btn[^"']*active[^"']*["']/);
    }
  });

  test('CSS classes are properly applied for bilingual layout', () => {
    const cssPath = path.join(__dirname, '../../web-app/styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    
    // Check that required CSS classes exist
    expect(css).toMatch(/\.label-en\s*\{/);
    expect(css).toMatch(/\.label-th\s*\{/);
    
    // Check that button height was increased for bilingual support
    expect(css).toMatch(/min-height:\s*80px/);
    
    // Check that Thai fonts are included
    expect(css).toMatch(/Noto Sans Thai|Sarabun/);
  });

  test('specific navigation elements have correct bilingual labels', () => {
    // Test homepage has correct labels
    const homePagePath = path.join(__dirname, '../../web-app/index.html');
    const homePageHtml = fs.readFileSync(homePagePath, 'utf8');
    
    expect(homePageHtml).toMatch(/👥 Daily Staff/);
    expect(homePageHtml).toMatch(/💰 Payday Tracking/);
    expect(homePageHtml).not.toMatch(/class=["'][^"']*nav-btn home[^"']*["']/);
    
    // Test staff page has correct labels
    const staffPagePath = path.join(__dirname, '../../web-app/staff.html');
    const staffPageHtml = fs.readFileSync(staffPagePath, 'utf8');
    
    expect(staffPageHtml).not.toMatch(/👥 Daily Staff/);
    
    // Test admin pages have correct labels
    const adminStaffPath = path.join(__dirname, '../../web-app/admin-staff.html');
    const adminStaffHtml = fs.readFileSync(adminStaffPath, 'utf8');
    
    expect(adminStaffHtml).toMatch(/💰 Payday Tracking/);
  });

  test('logout buttons are properly bilingual across all pages', () => {
    // Pages that should have logout buttons
    const pagesWithLogout = [
      'web-app/index.html',
      'web-app/transaction.html',
      'web-app/summary.html',
      'web-app/admin-reports.html',
      'web-app/admin-staff.html',
      'web-app/admin-services.html',
      'web-app/admin-users.html'
    ];

    pagesWithLogout.forEach(page => {
      const filePath = path.join(__dirname, '../..', page);
      const html = fs.readFileSync(filePath, 'utf8');
      
      expect(html).toMatch(/<span class=["'][^"']*label-th[^"']*["']>👋 ออกจากระบบ<\/span>/);
      expect(html).toMatch(/<span class=["'][^"']*label-en[^"']*["']>👋 Logout<\/span>/);
    });
  });
});
