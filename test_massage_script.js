// Test version of massage shop script for local debugging
// This simulates the Google Apps Script environment

// Mock Google Apps Script objects
const SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: (name) => ({
      getName: () => name,
      getLastRow: () => 6,
      getRange: (row, col, numRows, numCols) => ({
        getValues: () => Array(numRows).fill(Array(numCols).fill("")),
        setValues: () => {},
        setValue: () => {},
        clearContent: () => {},
        setBackground: () => {},
        setFontWeight: () => {},
        setFontSize: () => {},
        setFontColor: () => {},
        setHorizontalAlignment: () => {},
        setVerticalAlignment: () => {},
        setNumberFormat: () => {},
        insertCheckboxes: () => {},
        setDataValidation: () => {},
        merge: () => ({ setValue: () => {} }),
        protect: () => ({ addEditor: () => {} }),
        hideSheet: () => {},
        setColumnWidths: () => {},
        setColumnWidth: () => {},
        setConditionalFormatRules: () => {},
        getProtections: () => [],
        getDataRange: () => ({
          getValues: () => [["Transaction ID", "Timestamp", "Date", "Masseuse Name", "Service Type", "Payment Amount", "Payment Method", "Masseuse Fee", "Start Time", "End Time", "Customer Contact (Optional)", "Status"], ["123", new Date(), new Date(), "Anna", "Thai 60", 250, "Cash", 100, "10:00", "11:00", "", "ACTIVE"]]
        }),
        appendRow: () => {},
        getSpreadsheetTimeZone: () => "UTC"
      }),
      insertSheet: (name) => ({
        getName: () => name,
        getLastRow: () => 6,
        getRange: (row, col, numRows, numCols) => ({
          getValues: () => Array(numRows).fill(Array(numCols).fill("")),
          setValues: () => {},
          setValue: () => {},
          clearContent: () => {},
          setBackground: () => {},
          setFontWeight: () => {},
          setFontSize: () => {},
          setFontColor: () => {},
          setHorizontalAlignment: () => {},
          setVerticalAlignment: () => {},
          setNumberFormat: () => {},
          insertCheckboxes: () => {},
          setDataValidation: () => {},
          merge: () => ({ setValue: () => {} }),
          protect: () => ({ addEditor: () => {} }),
          hideSheet: () => {},
          setColumnWidths: () => {},
          setColumnWidth: () => {},
          setConditionalFormatRules: () => {},
          getProtections: () => [],
          getDataRange: () => ({
            getValues: () => [["Transaction ID", "Timestamp", "Date", "Masseuse Name", "Service Type", "Payment Amount", "Payment Method", "Masseuse Fee", "Start Time", "End Time", "Customer Contact (Optional)", "Status"], ["123", new Date(), new Date(), "Anna", "Thai 60", 250, "Cash", 100, "10:00", "11:00", "", "ACTIVE"]]
          }),
          appendRow: () => {},
          getSpreadsheetTimeZone: () => "UTC"
        }),
        deleteSheet: () => {},
        setActiveSheet: () => {},
        moveActiveSheet: () => {}
      }),
      deleteSheet: () => {}
    }),
    getUi: () => ({
      alert: (message) => console.log("ALERT:", message),
      toast: (message) => console.log("TOAST:", message),
      createMenu: (name) => ({
        addItem: (label, functionName) => ({
          addToUi: () => {}
        })
      })
    }),
    flush: () => {}
  }),
  newConditionalFormatRule: () => ({
    whenTextEqualTo: (text) => ({
      setBackground: (color) => ({
        setRanges: (ranges) => ({
          build: () => {}
        })
      })
    })
  }),
  newDataValidation: () => ({
    requireValueInRange: (range) => ({
      setAllowInvalid: (allow) => ({
        build: () => {}
      })
    })
  }),
  ProtectionType: { SHEET: "SHEET" }
};

const Session = {
  getEffectiveUser: () => ({
    getEmail: () => "test@example.com"
  })
};

const ScriptApp = {
  AuthMode: { NONE: "NONE" }
};

const Utilities = {
  formatDate: (date, timezone, format) => "20250101000000000"
};

// Copy the main script logic here
const CONFIG = {
  sheets: { dailyEntry: "Daily Entry", masterLog: "Master Log", reports: "Reports", settings: "Settings" },
  managementEmail: Session.getEffectiveUser().getEmail(),
  rosterSize: 20,
  buttons: { 
    submit: 'G13',
    load: 'G20',
    next: 'E1'
  }
};

const THEME = {
  headerBackground: "#4a86e8", headerFontColor: "#ffffff", headerFontSize: 12, headerFontWeight: "bold",
  subHeaderBackground: "#f3f3f3", buttonBackground: "#34a853", correctionModeBackground: "#fff2cc",
  statusServing: "#6aa84f", statusWaiting: "#f1c232", statusFinished: "#999999", statusBreak: "#e06666", statusNext: "#7e62c2"
};

// Test the problematic function
function testSubmitTransaction() {
  console.log("Testing submitTransaction function...");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
  const logSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
  const settingsSheet = ss.getSheetByName(CONFIG.sheets.settings);
  const ui = ss.getUi();
  
  if (!entrySheet || !logSheet || !settingsSheet) {
    ui.alert("Required sheets not found. Please run template setup.");
    return;
  }
  
  // Test the problematic line
  const lastRow = Math.max(settingsSheet.getLastRow(), 6);
  console.log("Last row:", lastRow, "Type:", typeof lastRow);
  
  try {
    const settingsData = settingsSheet.getRange(2, 2, lastRow - 1, 3).getValues();
    console.log("Settings data retrieved successfully:", settingsData.length, "rows");
  } catch (error) {
    console.error("Error in getRange:", error);
  }
}

// Run the test
testSubmitTransaction(); 