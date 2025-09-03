/**
 * WMF Budget Tracker - Google Ads Script
 * 
 * Questo script estrae i dati di costo giornaliero da Google Ads
 * e li scrive automaticamente nei tab appropriati di Google Sheets
 * per i progetti WMF (Sponsor e Ticket)
 */

// ===== ISTRUZIONI D'USO =====
/*
📖 COME UTILIZZARE QUESTO SCRIPT:

1. CONFIGURAZIONE INIZIALE:
   - Modifica SHEET_URL con l'URL del tuo Google Sheet
   - Configura SPONSOR_FILTERS e TICKET_FILTERS per le tue campagne
   - Scegli il DATE_RANGE appropriato

2. TEST:
   - Esegui testFilters() per verificare che i filtri funzionino
   - Esegui showAllCampaigns() per vedere tutte le campagne attive

3. ESECUZIONE:
   - Esegui main() per importare i dati nel tuo Google Sheet

4. AUTOMAZIONE:
   - Configura un trigger automatico per eseguire main() ogni giorno

5. PERSONALIZZAZIONE:
   - Modifica i filtri negli oggetti SPONSOR_FILTERS e TICKET_FILTERS
   - Cambia DATE_RANGE per diversi periodi di analisi
   - Personalizza i nomi dei tab modificando TAB_SPONSOR e TAB_TICKET

⚠️  IMPORTANTE: Assicurati che i tab 'sponsor_goo' e 'ticket_goo' esistano nel tuo Google Sheet!
*/

// ===== CONFIGURAZIONE PRINCIPALE =====
// Inserisci qui l'URL del tuo Google Sheet "WMF Budget Tracker"
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit'; 

// Nome dei tab dove scrivere i dati
const TAB_SPONSOR = 'sponsor_goo';
const TAB_TICKET = 'ticket_goo';

// ===== CONFIGURAZIONE PERIODO ANALISI =====
// Opzioni disponibili:
// - 'LAST_7_DAYS'
// - 'LAST_30_DAYS' 
// - 'LAST_90_DAYS'
// - Per date custom, vedi la funzione getCustomDateRange() in fondo
const DATE_RANGE = 'LAST_30_DAYS';

// ===== CONFIGURAZIONE FILTRI CAMPAGNE =====
// Definisci qui come identificare le campagne per ogni progetto

// FILTRI SPONSOR - Esempi di utilizzo:
const SPONSOR_FILTERS = {
  // Opzione 1: Campagne che CONTENGONO una parola specifica nel nome
  contains: 'sponsor',
  
  // Opzione 2: Campagne che INIZIANO con una stringa specifica  
  // starts_with: 'WMF_Sponsor_',
  
  // Opzione 3: Campagne che FINISCONO con una stringa specifica
  // ends_with: '_SPONSOR',
  
  // Opzione 4: Lista specifica di nomi campagna (match esatto)
  // exact_names: ['WMF Sponsor 2024', 'Sponsor Campaign Main'],
  
  // Opzione 5: Filtro regex personalizzato (per utenti avanzati)
  // regex: '^WMF.*[Ss]ponsor.*$'
};

// FILTRI TICKET - Esempi di utilizzo:
const TICKET_FILTERS = {
  // Opzione 1: Campagne che CONTENGONO una parola specifica nel nome
  contains: 'ticket',
  
  // Altri esempi (decommentare quello che serve):
  // starts_with: 'WMF_Ticket_',
  // ends_with: '_TICKET', 
  // exact_names: ['WMF Ticket Sales 2024', 'Early Bird Tickets'],
  // regex: '^WMF.*[Tt]icket.*$'
};

// ===== QUERY GAQL PRINCIPALE =====
const QUERY = `
SELECT 
    segments.date,
    campaign.name,
    metrics.cost_micros
FROM campaign 
WHERE segments.date DURING ${DATE_RANGE}
    AND campaign.status = 'ENABLED'
    AND metrics.cost_micros > 0
ORDER BY segments.date DESC, campaign.name ASC
`;

// ===== FUNZIONE PRINCIPALE =====
function main() {
    Logger.log('=== AVVIO WMF Budget Tracker - Google Ads ===');
    
    try {
        // Apri o crea il Google Sheet
        let ss;
        if (!SHEET_URL || SHEET_URL.includes('YOUR_SHEET_ID')) {
            ss = SpreadsheetApp.create("WMF Budget Tracker");
            let url = ss.getUrl();
            Logger.log("⚠️  SHEET_URL non configurato. Nuovo sheet creato: " + url);
            Logger.log("⚠️  Copia questo URL nelle configurazioni e riesegui lo script!");
            return;
        } else {
            ss = SpreadsheetApp.openByUrl(SHEET_URL);
            Logger.log('📊 Google Sheet aperto correttamente');
        }
        
        // Esegui la query e processa i dati
        const rows = AdsApp.search(QUERY);
        
        // Debug: log della struttura del primo risultato
        logSampleRowStructure();
        
        // Processa i dati e dividili per progetto
        const processedData = processAdData(rows);
        
        // Scrivi i dati nei rispettivi tab
        writeDataToSheet(ss, TAB_SPONSOR, processedData.sponsor);
        writeDataToSheet(ss, TAB_TICKET, processedData.ticket);
        
        // Log finale
        Logger.log(`✅ COMPLETATO! Sponsor: ${processedData.sponsor.length} righe, Ticket: ${processedData.ticket.length} righe`);
        Logger.log('📈 Dati scritti in: ' + ss.getUrl());
        
    } catch (error) {
        Logger.log('❌ ERRORE: ' + error.toString());
        Logger.log('📍 Stack trace: ' + error.stack);
    }
}

// ===== FUNZIONE DEBUG STRUTTURA DATI =====
function logSampleRowStructure() {
    const sampleQuery = QUERY + ' LIMIT 1';
    const sampleRows = AdsApp.search(sampleQuery);
    
    if (sampleRows.hasNext()) {
        const sampleRow = sampleRows.next();
        Logger.log("🔍 SAMPLE ROW STRUCTURE:");
        Logger.log(JSON.stringify(sampleRow));
        
        if (sampleRow.metrics) {
            Logger.log("💰 METRICS OBJECT: " + JSON.stringify(sampleRow.metrics));
        }
        if (sampleRow.campaign) {
            Logger.log("📢 CAMPAIGN OBJECT: " + JSON.stringify(sampleRow.campaign));
        }
    } else {
        Logger.log("⚠️  Nessun dato trovato per il sample check");
    }
}

// ===== FUNZIONE PROCESSAMENTO DATI =====
function processAdData(rows) {
    const sponsorData = [];
    const ticketData = [];
    
    // Headers per i dati
    const headers = ['Date', 'Campaign Name', 'Cost per Day'];
    sponsorData.push(headers);
    ticketData.push(headers);
    
    Logger.log('🔄 Processando i dati delle campagne...');
    
    while (rows.hasNext()) {
        try {
            const row = rows.next();
            
            // Estrai i dati (seguendo la struttura GAQL)
            const date = row.segments ? row.segments.date : 'N/A';
            const campaignName = row.campaign ? row.campaign.name : 'N/A';
            const costMicros = Number(row.metrics ? row.metrics.costMicros : 0) || 0;
            
            // Converti costo da micros a euro/dollari
            const costPerDay = costMicros / 1000000;
            
            // Crea la riga dati
            const dataRow = [date, campaignName, costPerDay];
            
            // Applica i filtri per determinare il progetto
            if (matchesFilters(campaignName, SPONSOR_FILTERS)) {
                sponsorData.push(dataRow);
                Logger.log(`📌 SPONSOR: ${campaignName} - ${date} - €${costPerDay.toFixed(2)}`);
            } else if (matchesFilters(campaignName, TICKET_FILTERS)) {
                ticketData.push(dataRow);
                Logger.log(`🎫 TICKET: ${campaignName} - ${date} - €${costPerDay.toFixed(2)}`);
            } else {
                Logger.log(`❓ CAMPAGNA NON CLASSIFICATA: ${campaignName}`);
            }
            
        } catch (error) {
            Logger.log('⚠️  Errore processando riga: ' + error);
            continue;
        }
    }
    
    return { sponsor: sponsorData, ticket: ticketData };
}

// ===== FUNZIONE CONTROLLO FILTRI =====
function matchesFilters(campaignName, filters) {
    if (!campaignName || !filters) return false;
    
    // Opzione 1: Contains (contiene)
    if (filters.contains) {
        return campaignName.toLowerCase().includes(filters.contains.toLowerCase());
    }
    
    // Opzione 2: Starts with (inizia con)
    if (filters.starts_with) {
        return campaignName.toLowerCase().startsWith(filters.starts_with.toLowerCase());
    }
    
    // Opzione 3: Ends with (finisce con)
    if (filters.ends_with) {
        return campaignName.toLowerCase().endsWith(filters.ends_with.toLowerCase());
    }
    
    // Opzione 4: Exact names (nomi esatti)
    if (filters.exact_names && Array.isArray(filters.exact_names)) {
        return filters.exact_names.some(name => 
            name.toLowerCase() === campaignName.toLowerCase()
        );
    }
    
    // Opzione 5: Regex (per utenti avanzati)
    if (filters.regex) {
        const regex = new RegExp(filters.regex, 'i'); // 'i' = case insensitive
        return regex.test(campaignName);
    }
    
    return false;
}

// ===== FUNZIONE SCRITTURA SU SHEET CON LOGICA INTELLIGENTE =====
function writeDataToSheet(spreadsheet, tabName, data) {
    if (!data || data.length <= 1) { // Solo header o vuoto
        Logger.log(`📝 Nessun dato da scrivere per ${tabName}`);
        return;
    }
    
    try {
        // Ottieni o crea il tab
        let sheet = spreadsheet.getSheetByName(tabName);
        if (!sheet) {
            sheet = spreadsheet.insertSheet(tabName);
            Logger.log(`➕ Tab '${tabName}' creato`);
        }
        
        const headers = data[0]; // Prima riga = headers
        const newDataRows = data.slice(1); // Tutte le altre righe = dati
        
        // Leggi dati esistenti (se presenti)
        const existingData = getExistingData(sheet);
        const existingDataMap = createDataMap(existingData);
        
        Logger.log(`📊 ${tabName}: ${Object.keys(existingDataMap).length} righe esistenti, ${newDataRows.length} nuove da processare`);
        
        // Processa i nuovi dati
        const { updatedRows, newRows } = processDataRows(newDataRows, existingDataMap);
        
        // Ricostruisci il dataset finale
        const finalData = buildFinalDataset(headers, existingDataMap, updatedRows, newRows);
        
        // Scrivi tutto sul sheet
        writeCompleteDataset(sheet, finalData, updatedRows.length, newRows.length);
        
    } catch (error) {
        Logger.log(`❌ Errore scrivendo in '${tabName}': ` + error);
    }
}

// ===== FUNZIONI DI SUPPORTO PER GESTIONE DATI =====
function getExistingData(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return []; // Nessun dato esistente (solo header o vuoto)
    
    const existingRange = sheet.getRange(2, 1, lastRow - 1, 3); // Dalla riga 2 in poi
    return existingRange.getValues();
}

function createDataMap(existingData) {
    const dataMap = {};
    existingData.forEach(row => {
        const [date, campaignName, cost] = row;
        const key = `${date}_${campaignName}`;
        dataMap[key] = { date, campaignName, cost, isExisting: true };
    });
    return dataMap;
}

function processDataRows(newDataRows, existingDataMap) {
    const updatedRows = [];
    const newRows = [];
    
    newDataRows.forEach(row => {
        const [date, campaignName, cost] = row;
        const key = `${date}_${campaignName}`;
        
        if (existingDataMap[key]) {
            // Dato esistente - controlla se è diverso
            const existingCost = Number(existingDataMap[key].cost);
            const newCost = Number(cost);
            
            if (Math.abs(existingCost - newCost) > 0.01) { // Tolleranza di 1 centesimo
                Logger.log(`🔄 AGGIORNATO: ${campaignName} ${date} - €${existingCost.toFixed(2)} → €${newCost.toFixed(2)}`);
                existingDataMap[key] = { date, campaignName, cost, isExisting: true };
                updatedRows.push({ date, campaignName, cost });
            }
        } else {
            // Nuovo dato
            Logger.log(`➕ NUOVO: ${campaignName} ${date} - €${Number(cost).toFixed(2)}`);
            newRows.push({ date, campaignName, cost });
            existingDataMap[key] = { date, campaignName, cost, isExisting: false };
        }
    });
    
    return { updatedRows, newRows };
}

function buildFinalDataset(headers, dataMap, updatedRows, newRows) {
    // Converti la mappa in array e ordina per data (più recente per primo)
    const allRows = Object.values(dataMap);
    allRows.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Ordine decrescente (più recente prima)
    });
    
    // Costruisci il dataset finale
    const finalData = [headers]; // Inizia con gli headers
    allRows.forEach(row => {
        finalData.push([row.date, row.campaignName, row.cost]);
    });
    
    return finalData;
}

function writeCompleteDataset(sheet, finalData, updatedCount, newCount) {
    // Pulisci e scrivi tutto
    sheet.clear();
    
    if (finalData.length > 0) {
        const range = sheet.getRange(1, 1, finalData.length, finalData[0].length);
        range.setValues(finalData);
        
        // Formatta gli headers
        const headerRange = sheet.getRange(1, 1, 1, finalData[0].length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4285F4');
        headerRange.setFontColor('white');
        
        // Auto-resize colonne
        sheet.autoResizeColumns(1, finalData[0].length);
    }
    
    const totalRows = finalData.length - 1; // Escludi header
    Logger.log(`✅ COMPLETATO: ${totalRows} righe totali (${updatedCount} aggiornate, ${newCount} nuove)`);
}

// ===== FUNZIONI UTILITÀ PER DATE PERSONALIZZATE =====
/**
 * Funzione per creare un range di date personalizzato
 * Decommentare e modificare DATE_RANGE se serve un periodo specifico
 */
/*
function getCustomDateRange(startDate, endDate) {
    // Esempio: getCustomDateRange('2024-01-01', '2024-01-31')
    return `WHERE segments.date BETWEEN "${startDate}" AND "${endDate}"`;
}

// Oppure per X giorni fa fino ad oggi:
function getLastNDaysRange(numDays) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - numDays);
    
    const formatDate = date => Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd');
    return `WHERE segments.date BETWEEN "${formatDate(startDate)}" AND "${formatDate(endDate)}"`;
}
*/

// ===== FUNZIONI DI TEST =====
/**
 * Funzione per testare i filtri senza eseguire tutto lo script
 */
function testFilters() {
    Logger.log('🧪 TEST FILTRI:');
    
    const testCampaigns = [
        'WMF Sponsor Campaign 2024',
        'WMF Ticket Sales Early Bird', 
        'Brand Awareness General',
        'sponsor_remarketing',
        'TICKET_last_chance',
        'Other Campaign'
    ];
    
    testCampaigns.forEach(campaign => {
        const isSponsor = matchesFilters(campaign, SPONSOR_FILTERS);
        const isTicket = matchesFilters(campaign, TICKET_FILTERS);
        
        let result = '❓ NON CLASSIFICATA';
        if (isSponsor) result = '📌 SPONSOR';
        if (isTicket) result = '🎫 TICKET';
        
        Logger.log(`"${campaign}" -> ${result}`);
    });
}

/**
 * Funzione per vedere tutte le campagne attive senza filtri
 */
function showAllCampaigns() {
    const simpleQuery = `
    SELECT campaign.name, campaign.status
    FROM campaign 
    WHERE campaign.status = 'ENABLED'
    ORDER BY campaign.name ASC
    `;
    
    Logger.log('📋 TUTTE LE CAMPAGNE ATTIVE:');
    const rows = AdsApp.search(simpleQuery);
    
    while (rows.hasNext()) {
        const row = rows.next();
        const name = row.campaign ? row.campaign.name : 'N/A';
        Logger.log(`• ${name}`);
    }
}