/**
 * TEST SCRIPT - WMF Budget Dashboard con Grafici
 * 
 * Questo script testa le funzionalità complete del dashboard
 * inclusi calcoli automatici e grafici
 */

// Usa la stessa configurazione del dashboard
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit';
const TEST_DASHBOARD = 'Test_Dashboard_Complete';

// ===== FUNZIONE DI TEST PRINCIPALE =====
function testCompleteDashboard() {
  Logger.log('🧪 === TEST DASHBOARD COMPLETO ===');
  
  if (!SHEET_URL || SHEET_URL.includes('YOUR_SHEET_ID')) {
    Logger.log('❌ CONFIGURAZIONE: Imposta SHEET_URL corretto');
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    
    // Test 1: Creazione dashboard con grafici
    testDashboardCreation(ss);
    
    // Test 2: Popolamento dati mock
    testMockDataPopulation(ss);
    
    // Test 3: Calcoli automatici
    testAutomaticCalculations(ss);
    
    // Test 4: Grafici
    testChartsCreation(ss);
    
    Logger.log('✅ TUTTI I TEST COMPLETATI!');
    Logger.log('🔗 URL: ' + ss.getUrl());
    
  } catch (error) {
    Logger.log('❌ ERRORE TEST: ' + error.toString());
  }
}

// ===== TEST CREAZIONE DASHBOARD =====
function testDashboardCreation(spreadsheet) {
  Logger.log('🔄 Test 1: Creazione dashboard...');
  
  // Rimuovi sheet esistente se presente
  const existingSheet = spreadsheet.getSheetByName(TEST_DASHBOARD);
  if (existingSheet) {
    spreadsheet.deleteSheet(existingSheet);
  }
  
  // Crea nuovo sheet
  const sheet = spreadsheet.insertSheet(TEST_DASHBOARD);
  
  // Crea struttura base (simile al dashboard sponsor)
  createTestDashboardStructure(sheet);
  
  Logger.log('✅ Test 1: Dashboard creato');
}

// ===== CREAZIONE STRUTTURA TEST =====
function createTestDashboardStructure(sheet) {
  const testBudgets = [5000, 7500, 10000]; // Budget per Google, Meta, LinkedIn
  const platforms = ['Google', 'Meta', 'LinkedIn'];
  const months = ['Luglio 2025', 'Agosto 2025', 'Settembre 2025'];
  
  // Header
  sheet.getRange(1, 1).setValue('TEST BUDGET DASHBOARD');
  sheet.getRange(1, 1, 1, 5).merge();
  
  // Headers colonne
  sheet.getRange(2, 1).setValue('Piattaforma');
  sheet.getRange(2, 2).setValue('Tipo');
  months.forEach((month, index) => {
    sheet.getRange(2, index + 3).setValue(month);
  });
  
  // Budget allocato
  platforms.forEach((platform, index) => {
    const row = 3 + index;
    sheet.getRange(row, 1).setValue(platform);
    sheet.getRange(row, 2).setValue('Budget');
    
    months.forEach((month, monthIndex) => {
      sheet.getRange(row, monthIndex + 3).setValue(testBudgets[index]);
    });
  });
  
  // Speso (inizialmente zero)
  platforms.forEach((platform, index) => {
    const row = 6 + index;
    sheet.getRange(row, 1).setValue(platform);
    sheet.getRange(row, 2).setValue('Speso');
    
    months.forEach((month, monthIndex) => {
      sheet.getRange(row, monthIndex + 3).setValue(0);
    });
  });
  
  // Avanzo (formule)
  platforms.forEach((platform, index) => {
    const row = 9 + index;
    sheet.getRange(row, 1).setValue(platform);
    sheet.getRange(row, 2).setValue('Avanzo');
    
    months.forEach((month, monthIndex) => {
      const col = monthIndex + 3;
      const budgetCell = sheet.getRange(3 + index, col).getA1Notation();
      const spentCell = sheet.getRange(6 + index, col).getA1Notation();
      sheet.getRange(row, col).setFormula(`=${budgetCell}-${spentCell}`);
    });
  });
  
  // Formattazione base
  sheet.getRange(1, 1, 1, 5).setBackground('#1f4e79').setFontColor('white').setFontWeight('bold');
  sheet.getRange(2, 1, 1, 5).setBackground('#4285F4').setFontColor('white').setFontWeight('bold');
}

// ===== TEST POPOLAZIONE DATI MOCK =====
function testMockDataPopulation(spreadsheet) {
  Logger.log('🔄 Test 2: Popolazione dati mock...');
  
  const sheet = spreadsheet.getSheetByName(TEST_DASHBOARD);
  const mockSpentData = [
    [2000, 3500, 4500], // Google per 3 mesi
    [1500, 2800, 3200], // Meta per 3 mesi  
    [800, 1200, 1800]   // LinkedIn per 3 mesi
  ];
  
  // Popola dati speso mock
  mockSpentData.forEach((platformData, platformIndex) => {
    const row = 6 + platformIndex;
    platformData.forEach((spent, monthIndex) => {
      sheet.getRange(row, monthIndex + 3).setValue(spent);
    });
  });
  
  Logger.log('✅ Test 2: Dati mock popolati');
}

// ===== TEST CALCOLI AUTOMATICI =====
function testAutomaticCalculations(spreadsheet) {
  Logger.log('🔄 Test 3: Verifica calcoli automatici...');
  
  const sheet = spreadsheet.getSheetByName(TEST_DASHBOARD);
  
  // Forza ricalcolo
  SpreadsheetApp.flush();
  
  // Verifica alcuni calcoli
  const platforms = ['Google', 'Meta', 'LinkedIn'];
  
  platforms.forEach((platform, index) => {
    const budgetValue = sheet.getRange(3 + index, 3).getValue(); // Luglio
    const spentValue = sheet.getRange(6 + index, 3).getValue();
    const surplusValue = sheet.getRange(9 + index, 3).getValue();
    
    const expectedSurplus = budgetValue - spentValue;
    
    Logger.log(`${platform}: Budget=${budgetValue}, Speso=${spentValue}, Avanzo=${surplusValue}, Atteso=${expectedSurplus}`);
    
    if (Math.abs(surplusValue - expectedSurplus) < 0.01) {
      Logger.log(`✅ ${platform}: Calcolo corretto`);
    } else {
      Logger.log(`❌ ${platform}: Calcolo errato!`);
    }
  });
  
  Logger.log('✅ Test 3: Calcoli verificati');
}

// ===== TEST CREAZIONE GRAFICI =====
function testChartsCreation(spreadsheet) {
  Logger.log('🔄 Test 4: Creazione grafici...');
  
  const sheet = spreadsheet.getSheetByName(TEST_DASHBOARD);
  
  // Rimuovi grafici esistenti
  const existingCharts = sheet.getCharts();
  existingCharts.forEach(chart => sheet.removeChart(chart));
  
  // Test Grafico 1: Budget vs Speso per piattaforma
  createTestBudgetChart(sheet);
  
  // Test Grafico 2: Trend mensile
  createTestTrendChart(sheet);
  
  Logger.log('✅ Test 4: Grafici creati');
}

function createTestBudgetChart(sheet) {
  // Prepara dati per grafico Budget vs Speso
  const chartData = [
    ['Piattaforma', 'Budget Totale', 'Speso Totale'],
    ['Google', 15000, 10000],
    ['Meta', 22500, 7500], 
    ['LinkedIn', 30000, 3800]
  ];
  
  const startRow = 15;
  chartData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      sheet.getRange(startRow + rowIndex, 1 + colIndex).setValue(cell);
    });
  });
  
  const dataRange = sheet.getRange(startRow, 1, chartData.length, 3);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(dataRange)
    .setPosition(2, 6, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'TEST: Budget vs Speso per Piattaforma')
    .setOption('width', 400)
    .setOption('height', 250)
    .build();
  
  sheet.insertChart(chart);
  sheet.hideRows(startRow, chartData.length);
}

function createTestTrendChart(sheet) {
  const trendData = [
    ['Mese', 'Budget', 'Speso'],
    ['Lug 25', 22500, 4300],
    ['Ago 25', 22500, 7500],
    ['Set 25', 22500, 9500]
  ];
  
  const startRow = 20;
  trendData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      sheet.getRange(startRow + rowIndex, 1 + colIndex).setValue(cell);
    });
  });
  
  const dataRange = sheet.getRange(startRow, 1, trendData.length, 3);
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(dataRange)
    .setPosition(2, 11, 0, 0)
    .setNumHeaders(1)
    .setOption('title', 'TEST: Trend Mensile')
    .setOption('width', 400)
    .setOption('height', 250)
    .setOption('curveType', 'function')
    .build();
  
  sheet.insertChart(chart);
  sheet.hideRows(startRow, trendData.length);
}

// ===== FUNZIONI HELPER =====
function cleanupTestSheet() {
  Logger.log('🧹 Pulizia sheet di test...');
  
  try {
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    const testSheet = ss.getSheetByName(TEST_DASHBOARD);
    
    if (testSheet) {
      ss.deleteSheet(testSheet);
      Logger.log('✅ Sheet di test rimosso');
    } else {
      Logger.log('ℹ️ Nessun sheet di test da rimuovere');
    }
    
  } catch (error) {
    Logger.log('❌ Errore pulizia: ' + error.toString());
  }
}

// ===== ISTRUZIONI TEST =====
/*
📋 COME ESEGUIRE I TEST:

1. CONFIGURAZIONE:
   - Imposta SHEET_URL con il tuo Google Sheet
   
2. ESECUZIONE:
   - Esegui testCompleteDashboard() per test completo
   - Controlla i log per risultati

3. PULIZIA:
   - Esegui cleanupTestSheet() per rimuovere dati di test

⚡ COSA VIENE TESTATO:
✅ Creazione struttura dashboard
✅ Popolazione dati mock
✅ Calcoli automatici (formule)
✅ Creazione grafici (colonne + linee)

🎯 OUTPUT ATTESO:
- Dashboard di test creato
- Calcoli corretti verificati
- 2 grafici inseriti nel sheet
- Log dettagliati di tutti i test
*/