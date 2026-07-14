const fs = require('fs');
const path = require('path');

describe('Navigation Bilingual Labels', () => {
  const files = [
    'web-app/index.html',
    'web-app/staff.html',
    'web-app/transaction.html',
    'web-app/summary.html',
    'web-app/admin-staff.html',
    'web-app/admin-services.html',
    'web-app/admin-reports.html',
    'web-app/admin-payment-types.html',
  ];
  
  test('all nav buttons have TH+EN stacked labels (target state)', () => {
    for (const file of files) {
      const filePath = path.join(__dirname, '../..', file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // These assertions will FAIL until we add bilingual labels
      expect(html).toMatch(/class=["'][^"']*label-en[^"']*["']/);
      expect(html).toMatch(/class=["'][^"']*label-th[^"']*["']/);
    }
  });
  
  test('each navigation file has proper bilingual button structure', () => {
    for (const file of files) {
      const filePath = path.join(__dirname, '../..', file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Check for stacked label structure
      const buttonMatches = html.match(/<a[^>]*class=["'][^"']*(?:nav-btn|btn)[^"']*["'][^>]*>[\s\S]*?<\/a>/g) || [];
      
      buttonMatches.forEach(button => {
        // Each button should have both label-en and label-th spans
        expect(button).toMatch(/<span class=["'][^"']*label-en[^"']*["']>/);
        expect(button).toMatch(/<span class=["'][^"']*label-th[^"']*["']>/);
      });
    }
  });

  test('bilingual navigation labels render Thai before English', () => {
    for (const file of files) {
      const filePath = path.join(__dirname, '../..', file);
      const html = fs.readFileSync(filePath, 'utf8');
      const buttonMatches = html.match(/<a[^>]*class=["'][^"']*(?:nav-btn|btn)[^"']*["'][^>]*>[\s\S]*?<\/a>/g) || [];

      buttonMatches.forEach(button => {
        if (button.includes('label-en') && button.includes('label-th')) {
          expect(button.indexOf('label-th')).toBeLessThan(button.indexOf('label-en'));
        }
      });
    }
  });

  test('homepage does not render a Home self-link', () => {
    const homePagePath = path.join(__dirname, '../..', 'web-app/index.html');
    const html = fs.readFileSync(homePagePath, 'utf8');

    expect(html).not.toMatch(/class=["'][^"']*nav-btn home[^"']*["']/);
  });

  test('navigation does not render active self-links', () => {
    for (const file of files) {
      const filePath = path.join(__dirname, '../..', file);
      const html = fs.readFileSync(filePath, 'utf8');

      expect(html).not.toMatch(/class=["'][^"']*nav-btn[^"']*active[^"']*["']/);
    }
  });
  
  test('no navigation buttons have inline text only', () => {
    for (const file of files) {
      const filePath = path.join(__dirname, '../..', file);
      const html = fs.readFileSync(filePath, 'utf8');
      
      // Check that no buttons have direct text content without spans
      const inlineTextButtons = html.match(/<a[^>]*class=["'][^"']*(?:nav-btn|btn)[^"']*["'][^>]*>([^<]*?)<\/a>/g) || [];
      
      inlineTextButtons.forEach(button => {
        // Button content should not be just text (should have spans)
        const content = button.match(/<a[^>]*>([^<]*?)<\/a>/)?.[1] || '';
        if (content.trim()) {
          // If there's content, it should be structured with spans
          expect(button).toMatch(/<span class=["'][^"']*label-en[^"']*["']>/);
          expect(button).toMatch(/<span class=["'][^"']*label-th[^"']*["']>/);
        }
      });
    }
  });
});
