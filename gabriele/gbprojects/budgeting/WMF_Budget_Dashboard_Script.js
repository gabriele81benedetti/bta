/************************************
 * DASHBOARD BUDGET – WMF EVENTO
 * Versione full con budget sponsor/ticket definitivi
 * - no date fantasma
 * - no header duplicati
 * - budget giornalieri (non cumulativi)
 * - niente #VALUE!
 * - grafici su foglio nascosto
 ************************************/

// URL del foglio principale (dashboard)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1WnL58xSxNbc4h5wAMxT8dS9fjf3UJEK29Mwcc46cQg4/edit?gid=0#gid=0';

// DATE EVENTO
const EVENT_START_DATE = new Date(2025, 6, 1);  // 01/07/2025
const EVENT_END_DATE   = new Date(2026, 5, 30); // 30/06/2026

// === BUDGET MENSILI CORRETTI ===
const MONTHLY_BUDGETS = {
  'sponsor': {
    '07/2025': 13300, '08/2025': 13300, '09/2025': 39900,
    '10/2025': 39900, '11/2025': 39900, '12/2025': 39900,
    '01/2026': 13300, '02/2026': 13300, '03/2026': 13300,
    '04/2026': 13300, '05/2026': 13300, '06/2026': 13300,
  },
  'ticket': {
    '07/2025': 1140,  '08/2025': 3420,  '09/2025': 17100,
    '10/2025': 5700,  '11/2025': 17100, '12/2025': 9120,
    '01/2026': 5700,  '02/2026': 17100, '03/2026': 5700,
    '04/2026': 11400, '05/2026': 9120,  '06/2026': 11400,
  }
};

// Ripartizione piattaforme
const PLATFORM_ALLOCATION = {
  'sponsor': { 'Google':0.4, 'Meta':0.3, 'LinkedIn':0.3 },
  'ticket':  { 'Google':0.4, 'Meta':0.3, 'LinkedIn':0.3 }
};

/************************************
 * UTILS
 ************************************/

function generateEventDatesSafe() {
  const start = new Date(EVENT_START_DATE.getFullYear(), EVENT_START_DATE.getMonth(), EVENT_START_DATE.getDate(), 12, 0, 0, 0);
  const end   = new Date(EVENT_END_DATE.getFullYear(),   EVENT_END_DATE.getMonth(),   EVENT_END_DATE.getDate(),   12, 0, 0, 0);
  const out = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return out;
}

function getDailyBudgetForDate(projectType, date) {
  const key = Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/yyyy');
  const monthly = MONTHLY_BUDGETS[projectType][key] || 0;
  if (!monthly) return 0;
  const days = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
  return monthly / days;
}

function getRawSheetData(sheet) {
  const values = sheet.getDataRange().getValues();
  const map = new Map();
  values.slice(1).forEach(row => {
    if (!row[0]) return;
    const d = new Date(row[0]);
    const key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const val = Number(row[1]) || 0;
    map.set(key, (map.get(key) || 0) + val);
  });
  return map;
}

/************************************
 * SEZIONE MENSILE
 ************************************/

function createMonthlySection(sheet, projectType) {
  const months = Object.keys(MONTHLY_BUDGETS[projectType]);

  sheet.getRange('A1:Z17').clearContent().clearFormat();

  sheet.getRange(2,1).setValue('TRACKING MENSILE')
       .setBackground('#FBBC05').setFontColor('black').setFontWeight('bold');

  const header = ['Mese','Budget Google','Speso Google','Avanzo Google',
                          'Budget Meta','Speso Meta','Avanzo Meta',
                          'Budget LinkedIn','Speso LinkedIn','Avanzo LinkedIn',
                          'Budget Totale','Speso Totale','Avanzo Totale'];
  sheet.getRange(4,1,1,header.length).setValues([header])
       .setBackground('#4285F4').setFontColor('white').setFontWeight('bold');

  let row = 5;
  months.forEach(mKey=>{
    const monthlyTotal = MONTHLY_BUDGETS[projectType][mKey] || 0;
    const g  = +(monthlyTotal * (PLATFORM_ALLOCATION[projectType]['Google']   || 0)).toFixed(2);
    const me = +(monthlyTotal * (PLATFORM_ALLOCATION[projectType]['Meta']     || 0)).toFixed(2);
    const l  = +(monthlyTotal * (PLATFORM_ALLOCATION[projectType]['LinkedIn'] || 0)).toFixed(2);

    sheet.getRange(row,1).setValue(mKey);
    sheet.getRange(row,2).setValue(g);
    // Speso Google - verrà popolato con formula SUMIFS dal updateProjectSpentData
    sheet.getRange(row,3).setValue(0);
    sheet.getRange(row,4).setFormula(`=B${row}-C${row}`);

    sheet.getRange(row,5).setValue(me);
    sheet.getRange(row,6).setValue(0);
    sheet.getRange(row,7).setFormula(`=E${row}-F${row}`);

    sheet.getRange(row,8).setValue(l);
    sheet.getRange(row,9).setValue(0);
    sheet.getRange(row,10).setFormula(`=H${row}-I${row}`);

    sheet.getRange(row,11).setFormula(`=B${row}+E${row}+H${row}`);
    sheet.getRange(row,12).setFormula(`=C${row}+F${row}+I${row}`);
    sheet.getRange(row,13).setFormula(`=K${row}-L${row}`);

    row++;
  });

  sheet.getRange(5,2,months.length,12).setNumberFormat('€#,##0.00');
}

/************************************
 * SEZIONE GIORNALIERA
 ************************************/

function createDailySection(sheet, projectType) {
  sheet.getRange('A18:Z10000').clearContent().clearFormat();

  sheet.getRange(18,1).setValue('TRACKING GIORNALIERO')
       .setBackground('#34A853').setFontColor('white').setFontWeight('bold');

  const headers = ['Data','Budget Google','Speso Google','Avanzo Google',
                          'Budget Meta','Speso Meta','Avanzo Meta',
                          'Budget LinkedIn','Speso LinkedIn','Avanzo LinkedIn',
                          'Budget Totale','Speso Totale','Avanzo Totale'];
  sheet.getRange(20,1,1,headers.length).setValues([headers])
       .setBackground('#4285F4').setFontColor('white').setFontWeight('bold');

  const dates = generateEventDatesSafe();
  const values = [];
  const formats = [];
  let row = 22;

  dates.forEach(date=>{
    const dailyTotal = getDailyBudgetForDate(projectType, date);
    const g  = +(dailyTotal * (PLATFORM_ALLOCATION[projectType]['Google']   || 0)).toFixed(2);
    const me = +(dailyTotal * (PLATFORM_ALLOCATION[projectType]['Meta']     || 0)).toFixed(2);
    const l  = +(dailyTotal * (PLATFORM_ALLOCATION[projectType]['LinkedIn'] || 0)).toFixed(2);

    // Usa l'oggetto Date direttamente invece di convertirlo in stringa
    // Speso Google (colonna C) verrà popolato con formule VLOOKUP dal updateProjectSpentData
    values.push([date,g,0,null,me,0,null,l,0,null,null,null,null]);
    formats.push(['dd/MM/yyyy','€#,##0.00','€#,##0.00','€#,##0.00',
                     '€#,##0.00','€#,##0.00','€#,##0.00',
                     '€#,##0.00','€#,##0.00','€#,##0.00',
                     '€#,##0.00','€#,##0.00','€#,##0.00']);
  });

  sheet.getRange(row,1,values.length,values[0].length).setValues(values);
  sheet.getRange(row,1,formats.length,formats[0].length).setNumberFormats(formats);

  for (let r=row;r<row+values.length;r++){
    sheet.getRange(r,4).setFormula(`=B${r}-C${r}`);
    sheet.getRange(r,7).setFormula(`=E${r}-F${r}`);
    sheet.getRange(r,10).setFormula(`=H${r}-I${r}`);
    sheet.getRange(r,11).setFormula(`=B${r}+E${r}+H${r}`);
    sheet.getRange(r,12).setFormula(`=C${r}+F${r}+I${r}`);
    sheet.getRange(r,13).setFormula(`=K${r}-L${r}`);
  }

  sheet.setFrozenRows(20);
  sheet.setFrozenColumns(1);
}

/************************************
 * DASHBOARD COMPLETA
 ************************************/

function createProjectDashboard(spreadsheet, projectType, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  createMonthlySection(sheet, projectType);
  createDailySection(sheet, projectType);
  
  // Inserisci immediatamente le formule VLOOKUP dopo aver creato le sezioni
  insertVlookupFormulas(spreadsheet, projectType, sheetName);
}

/************************************
 * UPDATE SPESO GIORNALIERO DAL RAW
 ************************************/

function insertVlookupFormulas(spreadsheet, projectType, dashboardName) {
  const dashboard = spreadsheet.getSheetByName(dashboardName);
  if (!dashboard) return;

  console.log(`Inserendo formule VLOOKUP per ${projectType} (modalità batch)`);

  // Trova il range della sezione giornaliera
  const startRow = 22;
  let endRow = startRow;
  
  // Trova l'ultima riga con dati
  while (dashboard.getRange(endRow, 1).getValue()) {
    endRow++;
    if (endRow > 1000) break; // sicurezza
  }
  endRow--; // Torna all'ultima riga valida
  
  const totalRows = endRow - startRow + 1;
  if (totalRows <= 0) {
    console.log(`Nessuna riga da processare per ${projectType}`);
    return;
  }
  
  console.log(`Processando ${totalRows} righe dalla ${startRow} alla ${endRow}`);
  
  // Prepara le formule in batch
  const googleFormulas = [];
  const metaFormulas = [];
  const linkedinFormulas = [];
  
  const googleSheetName = projectType + '_goo';
  const metaSheetName = projectType + '_meta';
  const linkedinSheetName = projectType + '_ln';
  
  for (let r = startRow; r <= endRow; r++) {
    // Formula Google (colonna C) - SUMIF per aggregare tutte le campagne della stessa data
    googleFormulas.push([`=SUMIF(${googleSheetName}!$A:$A,A${r},${googleSheetName}!$C:$C)`]);
    
    // Formula Meta (colonna F) - SUMIF per aggregare tutte le campagne della stessa data
    metaFormulas.push([`=SUMIF(${metaSheetName}!$A:$A,A${r},${metaSheetName}!$C:$C)`]);
    
    // Formula LinkedIn (colonna I) - SUMIF per aggregare tutte le campagne della stessa data
    linkedinFormulas.push([`=SUMIF(${linkedinSheetName}!$A:$A,A${r},${linkedinSheetName}!$C:$C)`]);
  }
  
  // Scrivi tutte le formule Google in una volta (BATCH)
  console.log(`Scrivendo ${googleFormulas.length} formule Google...`);
  const googleRange = dashboard.getRange(startRow, 3, totalRows, 1); // Colonna C
  googleRange.setFormulas(googleFormulas);
  
  // Scrivi tutte le formule Meta in una volta (BATCH)  
  console.log(`Scrivendo ${metaFormulas.length} formule Meta...`);
  const metaRange = dashboard.getRange(startRow, 6, totalRows, 1); // Colonna F
  metaRange.setFormulas(metaFormulas);
  
  // Scrivi tutte le formule LinkedIn in una volta (BATCH)
  console.log(`Scrivendo ${linkedinFormulas.length} formule LinkedIn...`);
  const linkedinRange = dashboard.getRange(startRow, 9, totalRows, 1); // Colonna I
  linkedinRange.setFormulas(linkedinFormulas);
  
  console.log(`✅ Completate ${totalRows} formule VLOOKUP per ${projectType} in modalità batch`);

  // Inserisce formule SUMPRODUCT nella sezione mensile
  insertMonthlyFormulas(spreadsheet, projectType, dashboardName);
}

/************************************
 * AGGIORNA SPESA MENSILE
 ************************************/

function insertMonthlyFormulas(spreadsheet, projectType, dashboardName) {
  const dashboard = spreadsheet.getSheetByName(dashboardName);
  if (!dashboard) return;

  console.log(`Inserendo formule mensili per ${projectType}`);

  // Per ogni mese, crea una formula SUMIFS che somma tutti i giorni di quel mese dalla sezione giornaliera
  const months = Object.keys(MONTHLY_BUDGETS[projectType]);
  let row = 5;
  
  months.forEach(monthKey => {
    // Converte il formato del mese da "MM/yyyy" a criteri per SUMPRODUCT
    const [month, year] = monthKey.split('/');
    
    // Formula SUMPRODUCT per Google Ads (colonna C)
    const googleSumFormula = `=SUMPRODUCT((MONTH(A22:A1000)=${parseInt(month)})*(YEAR(A22:A1000)=${year})*C22:C1000)`;
    dashboard.getRange(row, 3).setFormula(googleSumFormula); // Colonna C = Speso Google
    
    // Formula SUMPRODUCT per Meta Ads (colonna F) - somma tutti i valori aggregati
    const metaSumFormula = `=SUMPRODUCT((MONTH(A22:A1000)=${parseInt(month)})*(YEAR(A22:A1000)=${year})*F22:F1000)`;
    dashboard.getRange(row, 6).setFormula(metaSumFormula); // Colonna F = Speso Meta
    
    console.log(`Inserite formule mensili per ${monthKey}: Google + Meta`);
    
    row++;
  });
}

/************************************
 * GRAFICO
 ************************************/

function createMonthlyTrendChart(sheet, projectType) {
  const dates = generateEventDatesSafe();
  const data = [['Data','Budget Totale','Speso Totale','Avanzo']];

  dates.slice(-14).forEach(date=>{
    const d = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM');
    let dayBudget=0, daySpent=0;
    ['Google','Meta','LinkedIn'].forEach(p=>{
      const dailyTotal=getDailyBudgetForDate(projectType,date);
      const pct=PLATFORM_ALLOCATION[projectType][p]||0;
      dayBudget+=dailyTotal*pct;
    });
    data.push([d,Math.round(dayBudget),Math.round(daySpent),Math.round(dayBudget-daySpent)]);
  });

  const ss=sheet.getParent();
  const dataName=`${sheet.getName()}__chartdata`;
  let dataSheet=ss.getSheetByName(dataName)||ss.insertSheet(dataName);
  dataSheet.clear();
  dataSheet.getRange(1,1,data.length,4).setValues(data);
  dataSheet.hideSheet();

  const range=dataSheet.getRange(1,1,data.length,4);
  const chart=sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(range)
    .setPosition(2,15,0,0)
    .setNumHeaders(1)
    .setOption('title',`Trend giornaliero (ultimi 14) – ${projectType}`)
    .setOption('legend.position','bottom')
    .build();

  sheet.getCharts().forEach(c=>sheet.removeChart(c));
  sheet.insertChart(chart);
}

/************************************
 * MASTER
 ************************************/

function createBudgetDashboards() {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  
  // Prima importa i dati Meta (se la funzione main esiste)
  console.log('🔄 Tentativo import dati Meta...');
  try {
    if (typeof main === 'function') {
      main(); // Esegue l'import Meta Ads
      console.log('✅ Dati Meta importati con successo');
    } else {
      console.log('⚠️  Funzione main() Meta non trovata - assicurati che il file MetaAds sia incluso');
    }
  } catch (error) {
    console.log('⚠️  Errore import Meta: ' + error.toString());
    console.log('📝 Procedo comunque con la creazione dashboard...');
  }
  
  // Poi crea i dashboard con le formule VLOOKUP
  createProjectDashboard(ss,'sponsor','budget_sponsor');
  createProjectDashboard(ss,'ticket','budget_ticket');
}

function updateSpentData() {
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  createMonthlyTrendChart(ss.getSheetByName('budget_sponsor'),'sponsor');
  createMonthlyTrendChart(ss.getSheetByName('budget_ticket'),'ticket');
}