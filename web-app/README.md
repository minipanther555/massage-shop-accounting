# Massage Shop POS Web App

A multi-page web application that replicates all the functionality of the Google Sheets massage shop POS system with better tablet-friendly navigation.

## Features

- **Staff Roster Management**: Track up to 20 masseuses with status updates
- **Transaction Processing**: Record massage services, payments, and customer details
- **Error Correction**: Load and correct the most recent transaction
- **Daily Expense Tracking**: Record and manage daily expenses
- **Real-time Summaries**: Today's revenue, transaction counts, payment breakdowns
- **Data Export**: Export daily data to CSV format
- **End Day Operations**: Reset system for next day
- **Mobile-Optimized**: Touch-friendly interface for tablet use

## Quick Start

### Option 1: Local Testing (Fastest)
1. Open `index.html` in any modern web browser
2. Navigate between pages using the top navigation buttons
3. Start using immediately - no setup required
4. Data is saved locally in your browser

### Option 2: Online Hosting (Recommended for Production)

#### Using Netlify (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the entire `web-app` folder onto their deploy area
3. Get instant URL like `https://amazing-name-123.netlify.app`
4. Share URL with tablet users

#### Using GitHub Pages
1. Create GitHub repository
2. Upload all files from `web-app` folder to the repository
3. Enable GitHub Pages in repository settings
4. Access via `https://yourusername.github.io/repository-name`

## Page Structure

The app is split into 4 main pages optimized for tablet use:

### 🏠 Home Page (`index.html`)
- **Dashboard Overview**: Today's revenue, active staff, expenses, all-time totals
- **Quick Actions**: Large buttons for common tasks
- **Recent Activity**: Combined transactions and expenses
- **Payment Breakdown**: Today's payment method summary

### 👥 Staff Roster Page (`staff.html`)
- **Staff Management**: Edit names and status for up to 20 masseuses
- **Real-time Counts**: Today's massage count per masseuse
- **Serve Next Customer**: Automatic assignment to next available staff
- **Status Tracking**: Available, Busy, Break, Off, Next

### 💳 New Transaction Page (`transaction.html`)
- **Transaction Form**: All service details with auto-calculations
- **Correction System**: Load and edit previous transactions
- **Mini Summary**: Quick today's totals on the right
- **Recent Transactions**: Last 5 transactions displayed
- **Expense Tracking**: Add and manage daily expenses

### 📊 Daily Summary Page (`summary.html`)
- **Complete Overview**: Revenue, fees, expenses, net profit
- **Payment Analysis**: Breakdown by payment method with percentages
- **Masseuse Performance**: Individual stats and earnings
- **All Transactions**: Complete list of today's activity
- **End Day Operations**: Export data and reset system

## Usage

### Daily Workflow
1. **Setup**: Names are auto-populated, adjust status as needed
2. **Serve Customers**: Click "Serve Next Customer" → Fill form → Submit
3. **Track Expenses**: Add expenses throughout the day
4. **End Day**: Export data and reset for tomorrow

### Key Functions

#### Staff Management
- **Serve Next Customer**: Automatically assigns next available masseuse
- **Status Updates**: Available, Busy, Break, Off, Next
- **Today's Count**: Automatically tracks massages per masseuse

#### Transaction Processing
- **Auto-calculations**: Service price and masseuse fees calculated automatically
- **Time Management**: Start time auto-filled, end time options generated
- **Validation**: Required fields enforced, invalid data prevented

#### Error Correction
- **Load Last Transaction**: Loads most recent transaction for correction
- **VOID System**: Marks original as VOID, creates corrected entry
- **Visual Feedback**: Form highlighted during correction mode

#### Data Management
- **Local Storage**: All data saved automatically in browser
- **CSV Export**: Export daily data for external use
- **Auto-save**: Data saved every 30 seconds

## Data Storage

### Local Storage
- Data is stored in browser's localStorage
- Persists between sessions on same device
- No internet required after initial load

### Data Export
- **CSV Format**: Compatible with Excel, Google Sheets
- **Daily Export**: Includes transactions and expenses
- **Backup Strategy**: Regular exports recommended

## Configuration

### Settings (in JavaScript)
```javascript
const CONFIG = {
    rosterSize: 20,  // Number of roster positions
    settings: {
        masseuses: ["Anna", "Betty", "Carla", "Diana"],
        services: [
            {name: "Thai 60", price: 250, fee: 100},
            {name: "Neck and Shoulder", price: 150, fee: 60},
            {name: "Foot", price: 200, fee: 80},
            {name: "Oil", price: 400, fee: 150}
        ],
        paymentMethods: ["Cash", "Credit Card", "Voucher"]
    }
};
```

### Customization
- Edit the CONFIG object in the HTML file
- Modify services, prices, and payment methods
- Adjust roster size as needed

## Browser Compatibility

- **Recommended**: Chrome, Safari, Firefox (latest versions)
- **Mobile**: iOS Safari, Chrome Mobile
- **Features Used**: localStorage, ES6 JavaScript, CSS Grid

## Troubleshooting

### Data Loss Prevention
- Export data regularly to CSV
- Data is tied to specific browser/device
- Clear browser data will reset application

### Common Issues
- **Slow Performance**: Try exporting old data and clearing storage
- **Missing Data**: Check if browser storage is enabled
- **Layout Issues**: Ensure browser zoom is at 100%

## Differences from Google Sheets Version

### Advantages
- **Faster Performance**: No network delays
- **Better UX**: Touch-optimized interface
- **Instant Testing**: No deployment delays
- **Offline Capable**: Works without internet

### Limitations
- **Single Device**: Data not shared between devices (unless exported/imported)
- **No Real-time Sync**: Multiple users need coordination
- **Browser Dependent**: Data tied to specific browser

## Migration from Google Sheets

### Data Import
Currently manual - copy transaction data from Google Sheets if needed.

### Data Export to Google Sheets
1. Use "Export Today's Data (CSV)" button
2. Import CSV into Google Sheets
3. Format as needed for reporting

## Development Notes

- **Single File**: Everything contained in index.html for easy deployment
- **No Dependencies**: Pure HTML/CSS/JavaScript
- **Mobile-First**: Responsive design optimized for tablets
- **Touch-Friendly**: Large buttons, proper touch targets

## Support

This is a direct port of the Google Sheets functionality with improved user experience and performance.
