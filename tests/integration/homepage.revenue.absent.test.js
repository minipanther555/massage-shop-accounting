const fs = require('fs');
const path = require('path');

describe('Homepage Revenue Card Removal', () => {
  const homepagePath = path.join(__dirname, '../../web-app/index.html');
  
  test('homepage has no All-Time Revenue card (target state)', () => {
    const html = fs.readFileSync(homepagePath, 'utf8');
    
    // These assertions will FAIL until we remove the revenue card
    expect(html).not.toMatch(/All[-\s]?Time\s*Revenue/i);
    expect(html).not.toMatch(/id=["']total-revenue["']/i);
    expect(html).not.toMatch(/Historical total/i);
  });
  
  test('homepage dashboard grid has no revenue-related content', () => {
    const html = fs.readFileSync(homepagePath, 'utf8');
    
    // Check that no dashboard card contains revenue text
    const dashboardCards = html.match(/<div class="dashboard-card">[\s\S]*?<\/div>/g) || [];
    
    dashboardCards.forEach(card => {
      expect(card).not.toMatch(/All[-\s]?Time\s*Revenue/i);
      expect(card).not.toMatch(/total-revenue/i);
    });
  });
  
  test('homepage JavaScript has no references to total-revenue element', () => {
    const html = fs.readFileSync(homepagePath, 'utf8');
    
    // Check that no JavaScript code references the removed element
    expect(html).not.toMatch(/getElementById\(['"]total-revenue['"]\)/i);
    expect(html).not.toMatch(/total-revenue/i);
  });
});
