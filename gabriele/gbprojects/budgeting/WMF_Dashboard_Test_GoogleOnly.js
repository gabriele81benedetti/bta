/**
 * WMF Budget Dashboard - TEST SOLO GOOGLE ADS
 * 
 * Questo script simula il dashboard con solo Google Ads funzionante
 * per vedere come appaiono i dati per Sponsor e Ticket
 */

// ===== CONFIGURAZIONE TEST =====
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit';

// Nome dei tab dashboard
const DASHBOARD_SPONSOR = 'Dashboard_Sponsor';
const DASHBOARD_TICKET = 'Dashboard_Ticket';

// ===== BUDGET REALI WMF =====
const MONTHLY_BUDGETS = {
  sponsor: {
    'Luglio 2025': 13300, 'Agosto 2025': 13300, 'Settembre 2025': 39900,
    'Ottobre 2025': 39900, 'Novembre 2025': 39900, 'Dicembre 2025': 39900,
    'Gennaio 2026': 13300, 'Febbraio 2026': 13300, 'Marzo 2026': 13300,
    'Aprile 2026': 13300, 'Maggio 2026': 13300, 'Giugno 2026': 13300
  },
  ticket: {
    'Luglio 2025': 1140, 'Agosto 2025': 3420, 'Settembre 2025': 17100,
    'Ottobre 2025': 5700, 'Novembre 2025': 17100, 'Dicembre 2025': 9120,
    'Gennaio 2026': 5700, 'Febbraio 2026': 17100, 'Marzo 2026': 5700,
    'Aprile 2026': 11400, 'Maggio 2026': 9120, 'Giugno 2026': 11400
  }
};

// Allocazione solo Google Ads (100% per ora)
const PLATFORM_ALLOCATION = {
  sponsor: { 'Google': 1.0, 'Meta': 0.0, 'LinkedIn': 0.0 },
  ticket: { 'Google': 1.0, 'Meta': 0.0, 'LinkedIn': 0.0 }
};

const MONTHS_ORDER = [
  'Luglio 2025', 'Agosto 2025', 'Settembre 2025', 'Ottobre 2025',
  'Novembre 2025', 'Dicembre 2025', 'Gennaio 2026', 'Febbraio 2026',
  'Marzo 2026', 'Aprile 2026', 'Maggio 2026', 'Giugno 2026'
];

const PLATFORMS = ['Google', 'Meta', 'LinkedIn'];

// ===== DATI SIMULATI GOOGLE ADS (per test) =====
const SIMULATED_GOOGLE_SPENT = {
  sponsor: {
    'Luglio 2025': 2500,   'Agosto 2025': 3200,   'Settembre 2025': 15800,
    'Ottobre 2025': 18500, 'Novembre 2025': 22100, 'Dicembre 2025': 8900,
    'Gennaio 2026': 4200,  'Febbraio 2026': 5100,  'Marzo 2026': 6800,
    'Aprile 2026': 7200,   'Maggio 2026': 8500,    'Giugno 2026': 3100
  },
  ticket: {
    'Luglio 2025': 850,    'Agosto 2025': 2100,   'Settembre 2025': 12200,
    'Ottobre 2025': 3800,  'Novembre 2025': 14500, 'Dicembre 2025': 6100,
    'Gennaio 2026': 3200,  'Febbraio 2026': 11800, 'Marzo 2026': 2900,
    'Aprile 2026': 7200,   'Maggio 2026': 5800,   'Giugno 2026': 4200
  }
};

// ===== FUNZIONE TEST PRINCIPALE =====
function createTestDashboards() {
  Logger.log('=== TEST DASHBOARD SOLO GOOGLE ADS ===');
  
  try {
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    
    // Crea dashboard test
    createTestProjectDashboard(ss, 'sponsor', DASHBOARD_SPONSOR);
    createTestProjectDashboard(ss, 'ticket', DASHBOARD_TICKET);
    
    Logger.log('✅ Test dashboard creati!');
    
    // Mostra summary nei log
    showBudgetSummary();
    
  } catch (error) {
    Logger.log('❌ ERRORE: ' + error.toString());
  }
}

function createTestProjectDashboard(spreadsheet, projectType, sheetName) {
  Logger.log(`🔄 Creando dashboard TEST: ${projectType.toUpperCase()}`);
  
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  
  sheet.clear();
  
  // === STRUTTURA DASHBOARD TEST ===
  
  // Titolo
  sheet.getRange(1, 1).setValue(`BUDGET DASHBOARD - ${projectType.toUpperCase()} (SOLO GOOGLE ADS)`);
  sheet.getRange(1, 1, 1, MONTHS_ORDER.length + 2).merge();
  
  // Headers mesi (riga 3)
  sheet.getRange(3, 2).setValue('TOTALE');
  MONTHS_ORDER.forEach((month, index) => {
    sheet.getRange(3, index + 3).setValue(month.replace(' 2025', '').replace(' 2026', ''));
  });
  
  // RIGA 5: BUDGET TOTALE MENSILE
  sheet.getRange(5, 1).setValue('BUDGET TOTALE');
  sheet.getRange(5, 2).setValue('Budget');
  let totalBudget = 0;
  MONTHS_ORDER.forEach((month, index) => {
    const budget = MONTHLY_BUDGETS[projectType][month] || 0;
    totalBudget += budget;
    sheet.getRange(5, index + 3).setValue(budget);
  });
  
  // RIGA 7-9: ALLOCAZIONE PER PIATTAFORMA
  PLATFORMS.forEach((platform, pIndex) => {
    const row = 7 + pIndex;
    sheet.getRange(row, 1).setValue(platform);
    sheet.getRange(row, 2).setValue('Budget');
    
    let platformTotal = 0;
    MONTHS_ORDER.forEach((month, mIndex) => {
      const totalMonthlyBudget = MONTHLY_BUDGETS[projectType][month] || 0;
      const allocation = PLATFORM_ALLOCATION[projectType][platform] || 0;
      const platformBudget = Math.round(totalMonthlyBudget * allocation);
      platformTotal += platformBudget;
      sheet.getRange(row, mIndex + 3).setValue(platformBudget);
    });
  });
  
  // RIGA 11-13: SPESO EFFETTIVO
  PLATFORMS.forEach((platform, pIndex) => {
    const row = 11 + pIndex;
    sheet.getRange(row, 1).setValue(platform);
    sheet.getRange(row, 2).setValue('Speso');
    
    MONTHS_ORDER.forEach((month, mIndex) => {
      let spent = 0;
      
      // Solo Google ha dati reali (simulati)
      if (platform === 'Google') {
        spent = SIMULATED_GOOGLE_SPENT[projectType][month] || 0;
      }
      // Meta e LinkedIn = 0 per ora
      
      sheet.getRange(row, mIndex + 3).setValue(spent);
    });
  });
  
  // RIGA 15-17: AVANZO/DEFICIT
  PLATFORMS.forEach((platform, pIndex) => {
    const row = 15 + pIndex;
    sheet.getRange(row, 1).setValue(platform);
    sheet.getRange(row, 2).setValue('Avanzo');
    
    MONTHS_ORDER.forEach((month, mIndex) => {
      const col = mIndex + 3;
      const budgetCell = sheet.getRange(7 + pIndex, col).getA1Notation();
      const spentCell = sheet.getRange(11 + pIndex, col).getA1Notation();
      sheet.getRange(row, col).setFormula(`=${budgetCell}-${spentCell}`);
    });
  });
  
  // RIGA 19: TOTALI
  sheet.getRange(19, 1).setValue('TOTALI MESE');
  sheet.getRange(19, 2).setValue('Speso Tot');
  MONTHS_ORDER.forEach((month, mIndex) => {
    const col = mIndex + 3;
    const googleSpent = sheet.getRange(11, col).getA1Notation();
    const metaSpent = sheet.getRange(12, col).getA1Notation();
    const linkedinSpent = sheet.getRange(13, col).getA1Notation();
    sheet.getRange(19, col).setFormula(`=${googleSpent}+${metaSpent}+${linkedinSpent}`);
  });
  
  // FORMATTAZIONE
  formatTestDashboard(sheet);
  
  Logger.log(`✅ Dashboard '${sheetName}' completato`);
}

function formatTestDashboard(sheet) {
  // Titolo
  const titleRange = sheet.getRange(1, 1, 1, MONTHS_ORDER.length + 2);
  titleRange.setFontSize(14);
  titleRange.setFontWeight('bold');
  titleRange.setBackground('#1f4e79');
  titleRange.setFontColor('white');
  titleRange.setHorizontalAlignment('center');
  
  // Headers
  const headersRange = sheet.getRange(3, 2, 1, MONTHS_ORDER.length + 1);
  headersRange.setFontWeight('bold');
  headersRange.setBackground('#4285F4');
  headersRange.setFontColor('white');
  headersRange.setHorizontalAlignment('center');
  
  // Budget totale
  const budgetRange = sheet.getRange(5, 3, 1, MONTHS_ORDER.length);
  budgetRange.setBackground('#e3f2fd');
  budgetRange.setNumberFormat('€#,##0');
  budgetRange.setFontWeight('bold');
  
  // Budget allocato
  const allocatedRange = sheet.getRange(7, 3, 3, MONTHS_ORDER.length);
  allocatedRange.setBackground('#f3e5f5');
  allocatedRange.setNumberFormat('€#,##0');
  
  // Speso
  const spentRange = sheet.getRange(11, 3, 3, MONTHS_ORDER.length);
  spentRange.setBackground('#fff3e0');
  spentRange.setNumberFormat('€#,##0');
  
  // Avanzi - con colorazione condizionale
  const remainingRange = sheet.getRange(15, 3, 3, MONTHS_ORDER.length);
  remainingRange.setNumberFormat('€#,##0');
  
  // Verde per avanzi positivi
  const greenRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground('#d4edda')
    .setRanges([remainingRange])
    .build();
    
  // Rosso per deficit
  const redRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground('#f8d7da')
    .setRanges([remainingRange])
    .build();
  
  sheet.setConditionalFormatRules([greenRule, redRule]);
  
  // Labels
  const labelsRange = sheet.getRange(5, 1, 15, 2);
  labelsRange.setFontWeight('bold');
  
  // Totali
  const totalsRange = sheet.getRange(19, 3, 1, MONTHS_ORDER.length);
  totalsRange.setBackground('#ffecb3');
  totalsRange.setFontWeight('bold');
  totalsRange.setNumberFormat('€#,##0');
  
  sheet.autoResizeColumns(1, MONTHS_ORDER.length + 2);
}

// ===== ANALISI E SUMMARY =====
function showBudgetSummary() {
  Logger.log('\n📊 SUMMARY BUDGET WMF (SOLO GOOGLE ADS)');
  Logger.log('==========================================');
  
  let sponsorTotal = 0;
  let ticketTotal = 0;
  let sponsorSpent = 0;
  let ticketSpent = 0;
  
  MONTHS_ORDER.forEach(month => {
    const sBudget = MONTHLY_BUDGETS.sponsor[month];
    const tBudget = MONTHLY_BUDGETS.ticket[month];
    const sSpent = SIMULATED_GOOGLE_SPENT.sponsor[month];
    const tSpent = SIMULATED_GOOGLE_SPENT.ticket[month];
    
    sponsorTotal += sBudget;
    ticketTotal += tBudget;
    sponsorSpent += sSpent;
    ticketSpent += tSpent;
    
    Logger.log(`${month}: Sponsor €${sBudget.toLocaleString()} (speso €${sSpent.toLocaleString()}) | Ticket €${tBudget.toLocaleString()} (speso €${tSpent.toLocaleString()})`);
  });
  
  Logger.log('\n💰 TOTALI ANNUALI:');
  Logger.log(`Sponsor Budget: €${sponsorTotal.toLocaleString()} | Speso Google: €${sponsorSpent.toLocaleString()} | Avanzo: €${(sponsorTotal - sponsorSpent).toLocaleString()}`);
  Logger.log(`Ticket Budget: €${ticketTotal.toLocaleString()} | Speso Google: €${ticketSpent.toLocaleString()} | Avanzo: €${(ticketTotal - ticketSpent).toLocaleString()}`);
  Logger.log(`TOTALE WMF: €${(sponsorTotal + ticketTotal).toLocaleString()} | Speso: €${(sponsorSpent + ticketSpent).toLocaleString()}`);
  
  Logger.log('\n🎯 PERFORMANCE GOOGLE ADS:');
  Logger.log(`Sponsor: ${((sponsorSpent / sponsorTotal) * 100).toFixed(1)}% del budget utilizzato`);
  Logger.log(`Ticket: ${((ticketSpent / ticketTotal) * 100).toFixed(1)}% del budget utilizzato`);
}

function analyzeBudgetTrends() {
  Logger.log('\n📈 ANALISI TREND MENSILI:');
  
  MONTHS_ORDER.forEach(month => {
    const sponsorBudget = MONTHLY_BUDGETS.sponsor[month];
    const ticketBudget = MONTHLY_BUDGETS.ticket[month];
    const sponsorSpent = SIMULATED_GOOGLE_SPENT.sponsor[month];
    const ticketSpent = SIMULATED_GOOGLE_SPENT.ticket[month];
    
    const totalBudget = sponsorBudget + ticketBudget;
    const totalSpent = sponsorSpent + ticketSpent;
    const utilization = ((totalSpent / totalBudget) * 100).toFixed(1);
    
    const monthShort = month.replace(' 2025', '').replace(' 2026', '');
    Logger.log(`${monthShort}: Budget €${totalBudget.toLocaleString()} → Speso €${totalSpent.toLocaleString()} (${utilization}%)`);
  });
}

// ===== ISTRUZIONI TEST =====
/*
🧪 COME ESEGUIRE IL TEST:

1. Configura SHEET_URL con il tuo Google Sheet
2. Esegui createTestDashboards() per creare i dashboard
3. Esegui showBudgetSummary() per vedere l'analisi
4. Esegui analyzeBudgetTrends() per i trend mensili

Il test simula:
- Budget reali WMF per Sponsor e Ticket
- Spesa solo su Google Ads (con dati simulati realistici)
- Meta e LinkedIn con spesa = 0
- Calcoli automatici di avanzi/deficit
- Visualizzazione completa dashboard

Questo ti permette di vedere esattamente come appariranno
i dashboard quando sarà funzionante solo Google Ads!
*/