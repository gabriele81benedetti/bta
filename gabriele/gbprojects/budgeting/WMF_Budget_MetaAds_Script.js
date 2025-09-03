/**
 * WMF Budget Tracker - Meta Ads Script
 * 
 * Questo script estrae i dati di costo giornaliero da Meta Ads (Facebook)
 * tramite l'API Graph di Facebook e li scrive automaticamente nei tab 
 * appropriati di Google Sheets per i progetti WMF (Sponsor e Ticket)
 */

// ===== ISTRUZIONI D'USO =====
/*
📖 COME UTILIZZARE QUESTO SCRIPT:

1. CONFIGURAZIONE INIZIALE:
   - Modifica SHEET_URL con l'URL del tuo Google Sheet
   - Inserisci il tuo ACCESS_TOKEN di Meta Ads
   - Configura META_AD_ACCOUNT_ID con il tuo account ID
   - Configura SPONSOR_FILTERS e TICKET_FILTERS per le tue campagne

2. SETUP ACCESS TOKEN:
   - Vai su Meta for Developers (developers.facebook.com)
   - Crea un'app o usa una esistente
   - Genera un Access Token con permesso 'ads_management'
   - Copia il token nella variabile ACCESS_TOKEN

3. TEST:
   - Esegui testFilters() per verificare che i filtri funzionino
   - Esegui showAllCampaigns() per vedere tutte le campagne attive

4. ESECUZIONE:
   - Esegui main() per importare i dati nel tuo Google Sheet

5. AUTOMAZIONE:
   - Configura un trigger automatico per eseguire main() ogni giorno

⚠️  IMPORTANTE: Assicurati che i tab 'sponsor_meta' e 'ticket_meta' esistano nel tuo Google Sheet!
*/

// ===== CONFIGURAZIONE PRINCIPALE =====
// NOTA: SHEET_URL è definito nel file principale del dashboard

// Meta Ads Configuration
const META_AD_ACCOUNT_ID = '36453680'; // Il tuo account ID Meta
const ACCESS_TOKEN = 'EAAQqZCTHU5iEBPY1dMW9LZANgrE5wpE7UUOjPGEvObg5HXQGHUDTxgI0OPIRZBgbwUIZAgTGnJXxukpoxHQTFJLY6zuP1ZBySyUtg0FvG2uxgnZCnO4du7LeTf3USGKTDNOTTjyDZAZCvCVM45QYKnJjR1AGT0ZB6LQTOKRpm1teZAZAcRx5kUZAUY9PLypynO3XZCwRb82kj'; // Sostituisci con il token completo da Facebook

// Nome dei tab dove scrivere i dati
const TAB_SPONSOR = 'sponsor_meta';
const TAB_TICKET = 'ticket_meta';

// ===== CONFIGURAZIONE PERIODO ANALISI =====
// Numero di giorni da recuperare (30 giorni = circa 1 mese)
const DAYS_TO_FETCH = 30;

// ===== CONFIGURAZIONE FILTRI CAMPAGNE =====
// Definisci qui come identificare le campagne per ogni progetto

// FILTRI SPONSOR - Campagne che contengono "wmf" E "commerciale" 
const SPONSOR_FILTERS = {
  contains_all: ['wmf', 'commerciale'], // Match solo se contiene TUTTE queste parole
};

// FILTRI TICKET - Campagne che contengono "ticket"
const TICKET_FILTERS = {
  contains_any: ['wmf', 'ticket'], // Match se contiene almeno una di queste parole
};

// ===== API CONFIGURATION =====
const FACEBOOK_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// ===== FUNZIONE PRINCIPALE CON DEBUG ESTESO =====
function main() {
  Logger.log('=== AVVIO WMF Budget Tracker - Meta Ads ===');
  
  try {
    // Controlli preliminari
    Logger.log('🔍 STEP 1: Controllo configurazione...');
    if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_META_ACCESS_TOKEN_HERE' || ACCESS_TOKEN === 'INSERISCI_QUI_IL_TUO_ACCESS_TOKEN_COMPLETO') {
      Logger.log('❌ ERRORE: ACCESS_TOKEN non configurato!');
      Logger.log('📝 Vai su developers.facebook.com e genera un access token con permesso ads_management');
      return;
    }
    Logger.log('✅ ACCESS_TOKEN configurato correttamente');
    Logger.log(`📋 Account ID: ${META_AD_ACCOUNT_ID}`);
    Logger.log(`📋 Tab Sponsor: ${TAB_SPONSOR}`);
    Logger.log(`📋 Tab Ticket: ${TAB_TICKET}`);
    
    // Apri il Google Sheet
    Logger.log('🔍 STEP 2: Apertura Google Sheet...');
    const ss = SpreadsheetApp.openByUrl(SHEET_URL);
    Logger.log('✅ Google Sheet aperto correttamente: ' + ss.getName());
    
    // Calcola il range di date
    Logger.log('🔍 STEP 3: Calcolo range date...');
    const dateRange = getDateRange(DAYS_TO_FETCH);
    Logger.log(`✅ Periodo analisi: ${dateRange.since} - ${dateRange.until} (${DAYS_TO_FETCH} giorni)`);
    
    // Ottieni i dati delle campagne da Meta
    Logger.log('🔍 STEP 4: Chiamata API Meta...');
    const campaignData = fetchCampaignData(dateRange);
    Logger.log(`✅ Dati ricevuti da Meta API: ${campaignData ? campaignData.length : 0} record`);
    
    if (!campaignData || campaignData.length === 0) {
      Logger.log('⚠️  NESSUN DATO ricevuto da Meta API');
      Logger.log('💡 Possibili cause:');
      Logger.log('   - Nessuna campagna attiva nel periodo');
      Logger.log('   - Nessuna spesa nelle campagne');
      Logger.log('   - Filtri troppo restrittivi');
      Logger.log('   - Problemi di permessi API');
      return;
    }
    
    // Processa i dati e dividili per progetto
    Logger.log('🔍 STEP 5: Elaborazione dati...');
    const processedData = processCampaignData(campaignData);
    Logger.log(`✅ Dati elaborati - Sponsor: ${processedData.sponsor.length-1} righe, Ticket: ${processedData.ticket.length-1} righe`);
    
    // Scrivi i dati nei rispettivi tab
    Logger.log('🔍 STEP 6: Scrittura dati su fogli...');
    writeDataToSheet(ss, TAB_SPONSOR, processedData.sponsor);
    writeDataToSheet(ss, TAB_TICKET, processedData.ticket);
    
    // Log finale
    Logger.log('✅ COMPLETATO CON SUCCESSO!');
    Logger.log(`📊 Risultato finale:`);
    Logger.log(`   - Sponsor: ${processedData.sponsor.length-1} righe di dati`);
    Logger.log(`   - Ticket: ${processedData.ticket.length-1} righe di dati`);
    Logger.log('📈 Controlla i tab: ' + ss.getUrl());
    
  } catch (error) {
    Logger.log('❌ ERRORE CRITICO:');
    Logger.log('📄 Messaggio: ' + error.toString());
    Logger.log('📍 Stack trace: ' + error.stack);
    Logger.log('🔧 Suggerimenti:');
    Logger.log('   1. Verifica che l\'access token sia valido');
    Logger.log('   2. Controlla i permessi dell\'app Meta');
    Logger.log('   3. Verifica che l\'account ID sia corretto');
  }
}

// ===== FUNZIONE CALCOLO DATE RANGE CON DEBUG =====
function getDateRange(days) {
  const until = new Date();
  const since = new Date();
  since.setDate(until.getDate() - days);
  
  Logger.log(`🗓️ DATERANGE: Data di fine (until): ${until.toString()}`);
  Logger.log(`🗓️ DATERANGE: Data di inizio (since): ${since.toString()}`);
  Logger.log(`🗓️ DATERANGE: Giorni richiesti: ${days}`);
  Logger.log(`🗓️ DATERANGE: Differenza effettiva: ${Math.ceil((until - since) / (1000 * 60 * 60 * 24))} giorni`);
  
  // Formato richiesto da Meta API: YYYY-MM-DD
  const formatDate = (date) => {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  };
  
  const result = {
    since: formatDate(since),
    until: formatDate(until)
  };
  
  Logger.log(`🗓️ DATERANGE: Range finale -> since: ${result.since}, until: ${result.until}`);
  
  return result;
}

// ===== FUNZIONE FETCH DATI DA META API CON DEBUG =====
// ===== FUNZIONE FETCH DATI DA META API (con encoding corretto) =====
function fetchCampaignData(dateRange) {
  Logger.log('🔄 FETCH: Recuperando dati da Meta Ads API...');

  const endpoint = `${BASE_URL}/act_${META_AD_ACCOUNT_ID}/insights`;

  // Costruisco i parametri come mappa e li encodo correttamente
  const params = {
    fields: 'campaign_name,spend,date_start',
    time_range: JSON.stringify({ since: dateRange.since, until: dateRange.until }), // -> {"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
    time_increment: '1',   // Dati giornalieri
    level: 'campaign',
    access_token: ACCESS_TOKEN
  };

  const query = Object.keys(params)
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join('&');

  const url = `${endpoint}?${query}`;

  Logger.log('🌐 FETCH: URL completo costruito (encodato)');
  Logger.log(`📋 FETCH: Account ID: act_${META_AD_ACCOUNT_ID}`);
  Logger.log(`📋 FETCH: Range: ${dateRange.since} → ${dateRange.until}`);
  Logger.log(`📋 FETCH: Campi: ${params.fields}`);

  try {
    Logger.log('📡 FETCH: Invio richiesta HTTP...');
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = response.getResponseCode();
    const text = response.getContentText();

    Logger.log(`📡 FETCH: Response code: ${code}`);
    Logger.log(`📄 FETCH: Response length: ${text ? text.length : 0} caratteri`);
    Logger.log(`📄 FETCH: Response preview: ${text.substring(0, 500)}...`);

    if (code < 200 || code >= 300) {
      throw new Error(`HTTP ${code}: ${text}`);
    }

    const data = JSON.parse(text);

    if (data.error) {
      Logger.log(`❌ FETCH: API Error: ${data.error.message} (Code: ${data.error.code})`);
      throw new Error(`API Error: ${data.error.message} (Code: ${data.error.code})`);
    }

    const recordCount = Array.isArray(data.data) ? data.data.length : 0;
    Logger.log(`✅ FETCH: Successo! Ricevuti ${recordCount} record da Meta API`);

    if (recordCount > 0) {
      const r0 = data.data[0];
      Logger.log(`📊 FETCH: Primo record -> Campaign: ${r0.campaign_name || 'N/A'} | Spend: ${r0.spend || 'N/A'} | Date: ${r0.date_start || 'N/A'}`);
    }

    return data.data || [];
  } catch (error) {
    Logger.log('❌ FETCH: Errore chiamata API Meta');
    Logger.log('❌ FETCH: ' + error.toString());
    throw error;
  }
}
// ===== FUNZIONE PROCESSAMENTO DATI CON DEBUG =====
function processCampaignData(rawData) {
  Logger.log('🔄 PROCESS: Inizio processamento dati Meta Ads...');
  Logger.log(`📊 PROCESS: Record da processare: ${rawData.length}`);
  
  const sponsorData = [];
  const ticketData = [];
  
  // Headers per i dati
  const headers = ['Date', 'Campaign Name', 'Cost per Day'];
  sponsorData.push(headers);
  ticketData.push(headers);
  
  let processedCount = 0;
  let sponsorCount = 0;
  let ticketCount = 0;
  let unclassifiedCount = 0;
  
  Logger.log('🔍 PROCESS: Analisi campagne...');
  
  rawData.forEach((row, index) => {
    try {
      const campaignName = row.campaign_name || 'N/A';
      const spend = parseFloat(row.spend) || 0;
      const date = row.date_start || 'N/A';
      
      // Converti la data nel formato dd/MM/yyyy (come per Google Ads)
      const formattedDate = formatDateForSheet(date);
      
      if (index < 5) { // Log dettagliato solo per i primi 5 record
        Logger.log(`📊 PROCESS [${index+1}]: "${campaignName}" - ${formattedDate} - €${spend.toFixed(2)}`);
      }
      
      // Determina il tipo di campagna e aggiungi direttamente (NO AGGREGAZIONE)
      if (matchesFilters(campaignName, SPONSOR_FILTERS)) {
        sponsorData.push([formattedDate, campaignName, spend]);
        sponsorCount++;
        if (index < 5) Logger.log(`   ✅ SPONSOR: ${campaignName}`);
      } else if (matchesFilters(campaignName, TICKET_FILTERS)) {
        ticketData.push([formattedDate, campaignName, spend]);
        ticketCount++;
        if (index < 5) Logger.log(`   ✅ TICKET: ${campaignName}`);
      } else {
        unclassifiedCount++;
        if (index < 5) Logger.log(`   ❓ NON CLASSIFICATA: "${campaignName}"`);
        return;
      }
      
      processedCount++;
      
    } catch (error) {
      Logger.log(`⚠️  PROCESS: Errore processando record ${index+1}: ${error.toString()}`);
    }
  });
  
  Logger.log('📈 PROCESS: Statistiche classificazione:');
  Logger.log(`   - Record processati: ${processedCount}`);
  Logger.log(`   - Campagne Sponsor: ${sponsorCount}`);
  Logger.log(`   - Campagne Ticket: ${ticketCount}`);
  Logger.log(`   - Campagne non classificate: ${unclassifiedCount}`);
  
  Logger.log(`✅ PROCESS: Completato!`);
  Logger.log(`   - Sponsor: ${sponsorData.length-1} righe finali`);
  Logger.log(`   - Ticket: ${ticketData.length-1} righe finali`);
  
  return { sponsor: sponsorData, ticket: ticketData };
}

// ===== FUNZIONE CONTROLLO FILTRI =====
function matchesFilters(campaignName, filters) {
  if (!campaignName || !filters) return false;
  
  const name = campaignName.toLowerCase();
  
  // Opzione 1: Contains all (deve contenere TUTTE le parole)
  if (filters.contains_all && Array.isArray(filters.contains_all)) {
    return filters.contains_all.every(keyword => 
      name.includes(keyword.toLowerCase())
    );
  }
  
  // Opzione 2: Contains any (contiene almeno una delle parole)
  if (filters.contains_any && Array.isArray(filters.contains_any)) {
    return filters.contains_any.some(keyword => 
      name.includes(keyword.toLowerCase())
    );
  }
  
  // Opzione 3: Contains (contiene una parola specifica)
  if (filters.contains) {
    return name.includes(filters.contains.toLowerCase());
  }
  
  return false;
}

// ===== FUNZIONE CONVERSIONE DATA =====
function formatDateForSheet(apiDate) {
  // Meta API restituisce date in formato YYYY-MM-DD
  // Dobbiamo convertire in dd/MM/yyyy per coerenza con Google Ads
  
  try {
    const parts = apiDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year}`;
    }
    return apiDate; // Fallback se formato diverso
  } catch (error) {
    Logger.log('⚠️  Errore conversione data: ' + apiDate);
    return apiDate;
  }
}

// ===== FUNZIONE SCRITTURA SU SHEET =====
// ===== FUNZIONE SCRITTURA SU SHEET (APPEND, NO CLEAR) =====
function writeDataToSheet(spreadsheet, tabName, data) {
  if (!data || data.length <= 1) { // Solo header o vuoto
    Logger.log(`📝 Nessun dato da scrivere per ${tabName}`);
    return;
  }

  try {
    // Ottieni o crea il tab
    let sheet = spreadsheet.getSheetByName(tabName);
    const headers = data[0];

    if (!sheet) {
      sheet = spreadsheet.insertSheet(tabName);
      Logger.log(`➕ Tab '${tabName}' creato`);
    }

    // Se il foglio è vuoto, scrivi l'header
    if (sheet.getLastRow() === 0) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('white');
      sheet.autoResizeColumns(1, headers.length);
      Logger.log(`🧱 Header creato per '${tabName}'`);
    } else {
      // Se il foglio non è vuoto ma l'header non coincide, non lo tocchiamo
      // (manteniamo la naming convention attuale).
    }

    // Costruisci set delle chiavi esistenti (Date|Campaign Name) per evitare duplicati
    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    let existingKeys = new Set();

    if (lastRow >= 2) {
      const existingRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (let i = 0; i < existingRange.length; i++) {
        const row = existingRange[i];
        const date = row[0];            // Colonna "Date"
        const campaignName = row[1];    // Colonna "Campaign Name"
        if (date && campaignName) {
          existingKeys.add(`${date}|${campaignName}`);
        }
      }
    }

    // Prepara le nuove righe da appendere (salta l'header in posizione 0)
    const rowsToAppend = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const key = `${row[0]}|${row[1]}`; // Date|Campaign Name
      if (!existingKeys.has(key)) {
        rowsToAppend.push(row);
      }
    }

    if (rowsToAppend.length === 0) {
      Logger.log(`ℹ️ Nessuna nuova riga da appendere per '${tabName}' (tutti i dati già presenti)`);
      return;
    }

    // Append batch (inserimento in coda)
    const startRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(startRow, 1, rowsToAppend.length, headers.length);
    range.setValues(rowsToAppend);

    // Auto-resize colonne solo se aumentano le larghezze (economico)
    sheet.autoResizeColumns(1, headers.length);

    Logger.log(`✅ APPEND '${tabName}': ${rowsToAppend.length} nuove righe aggiunte (totale righe ora: ${sheet.getLastRow() - 1})`);
  } catch (error) {
    Logger.log(`❌ Errore scrivendo in '${tabName}': ` + error);
  }
}
// ===== FUNZIONI DI TEST =====
/**
 * Funzione per testare i filtri senza eseguire tutto lo script
 */
function testFilters() {
  Logger.log('🧪 TEST FILTRI META:');
  
  const testCampaigns = [
    'WMF SUMMER NIGHTS_25_La Notte dei Bronzi_traffico', // Solo WMF
    'AIFestiva 26 - commerciale - expo', // Solo commerciale  
    'AST25-commerciale-sponsor', // Solo commerciale
    'WMF commerciale retargeting', // WMF + commerciale = SPONSOR
    'WMF ticket sales', // WMF + ticket = TICKET
    'Random campaign', // Niente
    'ticket_remarketing' // Solo ticket
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
  Logger.log('📋 TUTTE LE CAMPAGNE ATTIVE META:');
  
  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_META_ACCESS_TOKEN_HERE') {
    Logger.log('❌ ACCESS_TOKEN non configurato');
    return;
  }
  
  try {
    const url = `${BASE_URL}/act_${META_AD_ACCOUNT_ID}/campaigns` +
      `?fields=name,status` +
      `&access_token=${ACCESS_TOKEN}`;
    
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      Logger.log('❌ API Error: ' + data.error.message);
      return;
    }
    
    data.data.forEach(campaign => {
      if (campaign.status === 'ACTIVE') {
        Logger.log(`• ${campaign.name}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ Errore: ' + error.toString());
  }
}

/**
 * Funzione per testare la connessione API
 */
function testApiConnection() {
  Logger.log('🔌 TEST CONNESSIONE META API:');
  
  if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_META_ACCESS_TOKEN_HERE') {
    Logger.log('❌ ACCESS_TOKEN non configurato');
    return;
  }
  
  try {
    const url = `${BASE_URL}/act_${META_AD_ACCOUNT_ID}` +
      `?fields=name,account_id` +
      `&access_token=${ACCESS_TOKEN}`;
    
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      Logger.log('❌ API Error: ' + data.error.message);
      Logger.log('💡 Verifica che l\'access token abbia il permesso ads_management');
    } else {
      Logger.log(`✅ Connessione OK! Account: ${data.name} (ID: ${data.account_id})`);
    }
    
  } catch (error) {
    Logger.log('❌ Errore connessione: ' + error.toString());
  }
}