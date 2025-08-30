const fs = require('fs');
const path = require('path');

describe('Revenue Card Regression Prevention', () => {
  const homepagePath = path.join(__dirname, '../../web-app/index.html');
  
  test('homepage permanently has no All-Time Revenue card', () => {
    const html = fs.readFileSync(homepagePath, 'utf8');
    
    // These assertions must NEVER fail - revenue card should be permanently gone
    expect(html).not.toMatch(/All[-\s]?Time\s*Revenue/i);
    expect(html).not.toMatch(/id=["']total-revenue["']/i);
    expect(html).not.toMatch(/Historical total/i);
    
    // Check that no dashboard card contains revenue-related content
    const dashboardCards = html.match(/<div class="dashboard-card">[\s\S]*?<\/div>/g) || [];
    dashboardCards.forEach(card => {
      expect(card).not.toMatch(/All[-\s]?Time\s*Revenue/i);
      expect(card).not.toMatch(/total-revenue/i);
      expect(card).not.toMatch(/Historical total/i);
    });
  });
  
  test('homepage JavaScript has no references to removed revenue element', () => {
    const html = fs.readFileSync(homepagePath, 'utf8');
    
    // Check that no JavaScript code references the removed element
    expect(html).not.toMatch(/getElementById\(['"]total-revenue['"]\)/i);
    expect(html).not.toMatch(/total-revenue/i);
    expect(html).not.toMatch(/allTimeRevenue/i);
    
    // Verify that updateDashboard function doesn't try to update non-existent element
    const updateDashboardFunction = html.match(/async function updateDashboard\(\)[\s\S]*?\}/);
    if (updateDashboardFunction) {
      expect(updateDashboardFunction[0]).not.toMatch(/total-revenue/i);
    }
  });
  
  test('dashboard grid maintains proper structure without revenue card', () => {
    const html = fs.readFileSync(homepagePath, 'utf8');
    
    // Should have exactly 3 dashboard cards (was 4, now 3)
    const dashboardCards = html.match(/<div class="dashboard-card">[\s\S]*?<\/div>/g) || [];
    expect(dashboardCards).toHaveLength(3);
    
    // Verify the remaining cards are the expected ones
    const cardTitles = dashboardCards.map(card => {
      const titleMatch = card.match(/<h3>([^<]+)<\/h3>/);
      return titleMatch ? titleMatch[1].trim() : '';
    });
    
    expect(cardTitles).toContain("Today's Revenue");
    expect(cardTitles).toContain("Active Staff");
    expect(cardTitles).toContain("Today's Expenses");
    expect(cardTitles).not.toContain("All-Time Revenue");
  });
  
  test('no other pages contain All-Time Revenue references', () => {
    const pages = [
      'web-app/staff.html',
      'web-app/transaction.html',
      'web-app/summary.html',
      'web-app/admin-staff.html',
      'web-app/admin-services.html',
      'web-app/admin-reports.html',
      'web-app/admin-payment-types.html',
    ];
    
    pages.forEach(page => {
      const filePath = path.join(__dirname, '../..', page);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // No page should contain the specific "All-Time Revenue" text we removed
      expect(html).not.toMatch(/All[-\s]?Time\s*Revenue/i);
      
      // No page should contain the specific total-revenue ID from the removed card
      // (but allow legitimate financial reporting elements with different IDs)
      expect(html).not.toMatch(/id=["']total-revenue["'][^>]*>.*?All[-\s]?Time\s*Revenue/i);
    });
  });
  
  test('CSS grid layout remains responsive after revenue card removal', () => {
    const cssPath = path.join(__dirname, '../../web-app/styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    
    // Verify that dashboard grid CSS is still responsive
    expect(css).toMatch(/\.dashboard-grid\s*\{/);
    expect(css).toMatch(/grid-template-columns/);
    expect(css).toMatch(/repeat\(auto-fit/);
    
    // Check that the grid can handle 3 columns properly
    const dashboardGridRule = css.match(/\.dashboard-grid\s*\{[\s\S]*?\}/);
    if (dashboardGridRule) {
      expect(dashboardGridRule[0]).toMatch(/grid-template-columns/);
    }
  });
});
