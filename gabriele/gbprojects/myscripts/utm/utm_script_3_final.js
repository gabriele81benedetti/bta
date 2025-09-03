
/**
 * Google Ads UTM Parameters Auto-Setter Script
/**
 * Google Ads UTM Script v1.9
 *
 * Obiettivo:
 *  - Impostare template di tracking uniforme su tutte le campagne attive
 *  - Impostare custom parameter {_cam} con nome campagna originale
 *
 * Differenze dalla v1.8:
 *  - Rimossa logica di sanitizzazione del nome campagna nei custom parameters
 *  - Rimossa logica di rimozione/pulizia dei parametri preesistenti
 *  - Parametro cam viene impostato sempre con il nome campagna originale
 *  - Semplificata gestione custom parameters per tutte le tipologie di campagne
 */


// ===========================
// CONFIGU RAZIONE
// ===========================

const CONFIG = {
  // Email per notifiche (inserisci le email dei destinatari)
  EMAILS: [
    "tua-email@esempio.com",
    // "altra-email@esempio.com"
  ],
  
  // Selezione campagne da processare
  // 1 = Solo campagne ATTIVE
  // 2 = Campagne ATTIVE e IN PAUSA
  CAMPAIGN_STATUS_FILTER: 1,
  
  // ID del Google Sheet per il logging (lascia vuoto per creazione automatica)
  SHEET_ID: "", // esempio: "1abc234def567ghi890jkl"
  
  // Parametri UTM fissi
  UTM_SOURCE: "google",
  UTM_MEDIUM: "cpc",
  
  // Opzioni di logging
  LOG_ONLY_CHANGES: true, // Se true, logga solo le modifiche effettive
  
  // Test mode (se true, non applica modifiche, solo simula)
  TEST_MODE: true
};

// ===========================
// FUNZIONI UTILITY
// ===========================

/**
 * Ottiene la condizione di filtro per lo status delle campagne
 */
function getCampaignStatusCondition() {
  switch (CONFIG.CAMPAIGN_STATUS_FILTER) {
    case 1:
      return "Status = ENABLED";
    case 2:
      return "Status IN [ENABLED, PAUSED]";
    default:
      Logger.log("⚠️ CAMPAIGN_STATUS_FILTER non valido, uso default (solo ATTIVE)");
      return "Status = ENABLED";
  }
}

/**
 * Ottiene la descrizione del filtro campagne per i log
 */
function getCampaignStatusDescription() {
  switch (CONFIG.CAMPAIGN_STATUS_FILTER) {
    case 1:
      return "Solo campagne ATTIVE";
    case 2:
      return "Campagne ATTIVE e IN PAUSA";
    default:
      return "Solo campagne ATTIVE (default)";
  }
}

// FUNZIONE RIMOSSA: formatCampaignName()
// I nomi delle campagne ora vengono mantenuti ORIGINALI per preservare 
// la correlazione tra Google Ads e Google Analytics

/**
 * Ottiene o crea il Google Sheet per il logging
 */
function getOrCreateSheet() {
  let sheet;
  
  if (CONFIG.SHEET_ID) {
    try {
      const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      sheet = spreadsheet.getActiveSheet();
    } catch (e) {
      Logger.log("Impossibile aprire lo sheet esistente, ne creo uno nuovo");
      sheet = createNewSheet();
    }
  } else {
    sheet = createNewSheet();
  }
  
  return sheet;
}

/**
 * Crea un nuovo Google Sheet per il logging
 */
function createNewSheet() {
  const spreadsheet = SpreadsheetApp.create("Google Ads UTM Logger - " + new Date().toLocaleDateString());
  const sheet = spreadsheet.getActiveSheet();
  
  // Imposta headers
  const headers = [
    "Timestamp",
    "Campaign Name",
    "Campaign Type",
    "Action",
    "Previous Tracking Template",
    "New Tracking Template",
    "Previous Custom Params",
    "New Custom Params",
    "Status",
    "Error Message"
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  
  // Log the sheet URL for future reference
  Logger.log("IMPORTANTE - Salva questo ID per usi futuri: " + spreadsheet.getId());
  Logger.log("URL Sheet: " + spreadsheet.getUrl());
  
  // Invia email con URL dello sheet
  sendEmail(
    "🆕 NUOVO GOOGLE SHEET UTM LOGGER CREATO",
    "📋 È stato creato un nuovo Google Sheet per il logging UTM.\n\n" +
    "🔗 URL COMPLETO:\n" + spreadsheet.getUrl() + "\n\n" +
    "📝 ID SPREADSHEET (IMPORTANTE - Salva per usi futuri):\n" + spreadsheet.getId() + "\n\n" +
    "⚙️ ISTRUZIONI:\n" +
    "1. Salva l'ID sopra riportato\n" +
    "2. Incolla l'ID nel parametro SHEET_ID del CONFIG dello script\n" +
    "3. Questo eviterà la creazione di nuovi sheet ad ogni esecuzione\n\n" +
    "📊 Il sheet contiene tutti i dettagli di ogni campagna processata,\n" +
    "inclusi i valori precedenti e nuovi dei tracking template\n" +
    "e parametri custom per ogni singola modifica effettuata."
  );
  
  return sheet;
}

/**
 * Costruisce il tracking template con i parametri UTM
 */
function buildTrackingTemplate(campaignType, campaignName) {
  // USA IL NOME ORIGINALE per mantenere correlazione Google Ads <-> Analytics
  let template = "{lpurl}?utm_source=" + CONFIG.UTM_SOURCE +
                 "&utm_medium=" + CONFIG.UTM_MEDIUM +
                 "&utm_campaign=" + encodeURIComponent(campaignName);
  
  // Aggiungi utm_term solo per campagne Search
  if (campaignType === "SEARCH") {
    template += "&utm_term={keyword}";
  }
  
  return template;
}

/**
 * Fornisce spiegazioni dettagliate per i tipi di errore più comuni
 */
function getErrorExplanation(errorMessage) {
  const error = errorMessage.toLowerCase();
  
  if (error.includes('urls is not a function')) {
    return "API non supportata per questo tipo di campagna - verifica il codice";
  }
  if (error.includes('permission') || error.includes('access')) {
    return "Permessi insufficienti per modificare questa campagna";
  }
  if (error.includes('invalid') && error.includes('template')) {
    return "Il formato del tracking template non è valido per questo tipo di campagna";
  }
  if (error.includes('quota') || error.includes('rate')) {
    return "Limite di API raggiunto - riprova più tardi";
  }
  if (error.includes('campaign') && error.includes('not found')) {
    return "La campagna potrebbe essere stata eliminata durante l'elaborazione";
  }
  if (error.includes('videoad') || error.includes('video ad')) {
    return "Errore specifico degli annunci video - potrebbe richiedere approccio diverso";
  }
  
  return "Errore generico - controlla i log dettagliati nel Google Sheet";
}

/**
 * Invia email di notifica
 */
function sendEmail(subject, body) {
  if (!CONFIG.EMAILS || CONFIG.EMAILS.length === 0) {
    Logger.log("Nessuna email configurata per le notifiche");
    return;
  }
  
  CONFIG.EMAILS.forEach(function(email) {
    if (email && email.includes("@")) {
      try {
        MailApp.sendEmail({
          to: email,
          subject: "Google Ads UTM Script: " + subject,
          body: body
        });
      } catch (e) {
        Logger.log("Errore invio email a " + email + ": " + e);
      }
    }
  });
}

/**
 * Logga i dati sul Google Sheet
 */
function logToSheet(sheet, data) {
  if (!sheet) return;
  
  // Usa il fuso orario italiano per il timestamp
  const timestamp = new Date().toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const row = [
    timestamp,
    data.campaignName || "",
    data.campaignType || "",
    data.action || "",
    data.previousTrackingTemplate || "",
    data.newTrackingTemplate || "",
    data.previousCustomParams || "",
    data.newCustomParams || "",
    data.status || "",
    data.errorMessage || ""
  ];
  
  sheet.appendRow(row);
}

// ===========================
// FUNZIONI PRINCIPALI
// ===========================

/**
 * Processa una singola campagna (NON Video)
 */
function processCampaign(campaign, campaignType, sheet, results) {
  const campaignName = campaign.getName();
  
  try {
    // Ottieni i parametri attuali
    const urls = campaign.urls();
    const currentTrackingTemplate = urls.getTrackingTemplate() || "";
    const currentCustomParams = urls.getCustomParameters() || {};
    
    // Costruisci nuovi valori
    const newTrackingTemplate = buildTrackingTemplate(campaignType, campaignName);
    
    // Gestisci parametri custom
    const newCustomParams = { ...currentCustomParams };
    
    // Imposta il parametro cam con nome campagna originale
    newCustomParams.cam = campaignName;
    
    // Verifica se ci sono modifiche da fare
    const trackingTemplateChanged = currentTrackingTemplate !== newTrackingTemplate;
    const customParamsChanged = JSON.stringify(currentCustomParams) !== JSON.stringify(newCustomParams);
    
    if (!trackingTemplateChanged && !customParamsChanged) {
      // Nessuna modifica necessaria
      if (!CONFIG.LOG_ONLY_CHANGES) {
        logToSheet(sheet, {
          campaignName: campaignName,
          campaignType: campaignType,
          action: "SKIPPED",
          previousTrackingTemplate: currentTrackingTemplate,
          newTrackingTemplate: newTrackingTemplate,
          previousCustomParams: JSON.stringify(currentCustomParams),
          newCustomParams: JSON.stringify(newCustomParams),
          status: "NO_CHANGES"
        });
      }
      results.skipped++;
      return;
    }
    
    // Applica modifiche (se non in test mode)
    if (!CONFIG.TEST_MODE) {
      if (trackingTemplateChanged) {
        urls.setTrackingTemplate(newTrackingTemplate);
      }
      if (customParamsChanged) {
        urls.setCustomParameters(newCustomParams);
      }
    }
    
    // Log delle modifiche
    const action = CONFIG.TEST_MODE ? "TEST_UPDATE" : "UPDATED";
    logToSheet(sheet, {
      campaignName: campaignName,
      campaignType: campaignType,
      action: action,
      previousTrackingTemplate: currentTrackingTemplate,
      newTrackingTemplate: newTrackingTemplate,
      previousCustomParams: JSON.stringify(currentCustomParams),
      newCustomParams: JSON.stringify(newCustomParams),
      status: "SUCCESS"
    });
    
    // Gestione conflitti (se c'erano parametri preesistenti)
    if (currentTrackingTemplate && trackingTemplateChanged) {
      results.conflicts.push({
        campaign: campaignName,
        previous: currentTrackingTemplate,
        new: newTrackingTemplate
      });
    }
    
    results.updated++;
    Logger.log("✓ Campagna aggiornata: " + campaignName);
    
  } catch (e) {
    const errorMsg = "Errore processando campagna '" + campaignName + "': " + e;
    Logger.log(errorMsg);
    
    logToSheet(sheet, {
      campaignName: campaignName,
      campaignType: campaignType,
      action: "ERROR",
      status: "FAILED",
      errorMessage: e.toString()
    });
    
    results.errors.push({
      campaign: campaignName,
      error: e.toString()
    });
  }
}

/**
 * Processa una singola campagna VIDEO (gestione speciale)
 */
function processVideoCampaign(campaign, sheet, results) {
  const campaignName = campaign.getName();
  
  try {
    // Prima prova: impostare tracking template a livello di campagna
    try {
      const campaignUrls = campaign.urls();
      const currentTrackingTemplate = campaignUrls.getTrackingTemplate() || "";
      const currentCustomParams = campaignUrls.getCustomParameters() || {};
      
      // Costruisci nuovi valori
      const newTrackingTemplate = buildTrackingTemplate("VIDEO", campaignName);
      
      // Gestisci parametri custom
      const newCustomParams = { ...currentCustomParams };
      
      // Imposta il parametro cam con nome campagna originale
      newCustomParams.cam = campaignName;
      
      // Verifica modifiche
      const trackingTemplateChanged = currentTrackingTemplate !== newTrackingTemplate;
      const customParamsChanged = JSON.stringify(currentCustomParams) !== JSON.stringify(newCustomParams);
      
      if (!trackingTemplateChanged && !customParamsChanged) {
        results.skipped++;
        Logger.log("⏭️ Campagna Video già corretta: " + campaignName);
        return;
      }
      
      // Applica modifiche (se non in test mode)
      if (!CONFIG.TEST_MODE) {
        if (trackingTemplateChanged) {
          campaignUrls.setTrackingTemplate(newTrackingTemplate);
        }
        if (customParamsChanged) {
          campaignUrls.setCustomParameters(newCustomParams);
        }
      }
      
      // Log delle modifiche
      const action = CONFIG.TEST_MODE ? "TEST_VIDEO_UPDATE" : "VIDEO_UPDATED";
      logToSheet(sheet, {
        campaignName: campaignName + " (Video Campaign)",
        campaignType: "VIDEO",
        action: action,
        previousTrackingTemplate: currentTrackingTemplate,
        newTrackingTemplate: newTrackingTemplate,
        previousCustomParams: JSON.stringify(currentCustomParams),
        newCustomParams: JSON.stringify(newCustomParams),
        status: "SUCCESS"
      });
      
      // Gestione conflitti
      if (currentTrackingTemplate && trackingTemplateChanged) {
        results.conflicts.push({
          campaign: campaignName,
          previous: currentTrackingTemplate,
          new: newTrackingTemplate
        });
      }
      
      results.updated++;
      Logger.log("✓ Campagna Video aggiornata: " + campaignName + " (livello campagna)");
      
    } catch (campaignError) {
      // Fallback: se il livello campagna non funziona, prova con i singoli annunci
      Logger.log("⚠️ Livello campagna non supportato per " + campaignName + ", provo con annunci individuali");
      
      let adsProcessed = 0;
      let adsUpdated = 0;
      let adsErrors = 0;
      
      // Per gli annunci video, filtriamo solo quelli attivi
      // indipendentemente dallo stato della campagna
      const videoAdIterator = campaign.videoAds()
        .withCondition("Status = ENABLED")
        .get();
      
      while (videoAdIterator.hasNext()) {
        const videoAd = videoAdIterator.next();
        adsProcessed++;
        
        try {
          // Prova con annunci individuali
          const adUrls = videoAd.urls();
          const currentTrackingTemplate = adUrls.getTrackingTemplate() || "";
          const currentCustomParams = adUrls.getCustomParameters() || {};
          
          const newTrackingTemplate = buildTrackingTemplate("VIDEO", campaignName);
          
          const newCustomParams = { ...currentCustomParams };
          
          // Imposta il parametro cam con nome campagna originale
          newCustomParams.cam = campaignName;
          
          const trackingTemplateChanged = currentTrackingTemplate !== newTrackingTemplate;
          const customParamsChanged = JSON.stringify(currentCustomParams) !== JSON.stringify(newCustomParams);
          
          if (trackingTemplateChanged || customParamsChanged) {
            if (!CONFIG.TEST_MODE) {
              if (trackingTemplateChanged) {
                adUrls.setTrackingTemplate(newTrackingTemplate);
              }
              if (customParamsChanged) {
                adUrls.setCustomParameters(newCustomParams);
              }
            }
            adsUpdated++;
            
            if (currentTrackingTemplate && trackingTemplateChanged) {
              results.conflicts.push({
                campaign: campaignName + " (Video Ad #" + adsProcessed + ")",
                previous: currentTrackingTemplate,
                new: newTrackingTemplate
              });
            }
          }
          
        } catch (adError) {
          adsErrors++;
          Logger.log("Errore annuncio video #" + adsProcessed + " in " + campaignName + ": " + adError);
        }
      }
      
      // Se neanche gli annunci funzionano, registra come non supportato
      if (adsErrors === adsProcessed && adsProcessed > 0) {
        logToSheet(sheet, {
          campaignName: campaignName + " (Video Campaign)",
          campaignType: "VIDEO",
          action: "NOT_SUPPORTED",
          status: "API_LIMITATION",
          errorMessage: "Google Ads Scripts non supporta tracking template per campagne Video"
        });
        
        results.unsupported.push({
          campaign: campaignName,
          reason: "API Google Ads Scripts non supporta tracking template per campagne Video"
        });
        
        Logger.log("ℹ️ Campagna Video non supportata dall'API: " + campaignName);
      } else if (adsUpdated > 0) {
        results.updated++;
        Logger.log("✓ Campagna Video aggiornata: " + campaignName + " (" + adsUpdated + "/" + adsProcessed + " annunci)");
      } else {
        results.skipped++;
        Logger.log("⏭️ Campagna Video già corretta: " + campaignName);
      }
    }
    
  } catch (e) {
    // Se l'errore è urls not a function, è un'API limitation nota
    if (e.toString().includes("urls is not a function")) {
      logToSheet(sheet, {
        campaignName: campaignName + " (Video Campaign)",
        campaignType: "VIDEO", 
        action: "NOT_SUPPORTED",
        status: "API_LIMITATION",
        errorMessage: "Google Ads Scripts non supporta tracking template per campagne Video"
      });
      
      results.unsupported.push({
        campaign: campaignName,
        reason: "API Google Ads Scripts non supporta tracking template per campagne Video"
      });
      
      Logger.log("ℹ️ Campagna Video non supportata dall'API: " + campaignName);
    } else {
      // Altri errori critici
      const errorMsg = "Errore critico processando campagna video '" + campaignName + "': " + e;
      Logger.log(errorMsg);
      
      logToSheet(sheet, {
        campaignName: campaignName,
        campaignType: "VIDEO",
        action: "ERROR", 
        status: "FAILED",
        errorMessage: e.toString()
      });
      
      results.errors.push({
        campaign: campaignName,
        error: e.toString()
      });
    }
  }
}

/**
 * Processa tutte le campagne di un determinato tipo
 */
function processCampaignsByType(selector, campaignType, sheet, results) {
  const statusCondition = getCampaignStatusCondition();
  const iterator = selector
    .withCondition(statusCondition)
    .get();
  
  while (iterator.hasNext()) {
    const campaign = iterator.next();
    processCampaign(campaign, campaignType, sheet, results);
  }
}

// ===========================
// FUNZIONE PRINCIPALE
// ===========================

function main() {
  Logger.log("========================================");
  Logger.log("Inizio esecuzione UTM Auto-Setter Script");
  Logger.log("Timestamp: " + new Date().toLocaleString());
  Logger.log("Test Mode: " + (CONFIG.TEST_MODE ? "ON" : "OFF"));
  Logger.log("Filtro campagne: " + getCampaignStatusDescription());
  Logger.log("========================================");
  
  // Verifica configurazione email
  if (!CONFIG.EMAILS || CONFIG.EMAILS.length === 0 || CONFIG.EMAILS[0] === "tua-email@esempio.com") {
    Logger.log("⚠️ ATTENZIONE: Configura le email nel CONFIG prima di procedere!");
    return;
  }
  
  // Inizializza sheet per logging
  const sheet = getOrCreateSheet();
  const spreadsheetId = sheet ? sheet.getParent().getId() : CONFIG.SHEET_ID;
  
  // Inizializza contatori
  const results = {
    updated: 0,
    skipped: 0,
    errors: [],
    conflicts: [],
    unsupported: []  // Nuovo contatore per campagne non supportate
  };
  
  // Processa tutti i tipi di campagne
  try {
    // Search Campaigns
    Logger.log("\n--- Processando campagne Search ---");
    processCampaignsByType(AdsApp.campaigns(), "SEARCH", sheet, results);
    
    // Shopping Campaigns
    Logger.log("\n--- Processando campagne Shopping ---");
    processCampaignsByType(AdsApp.shoppingCampaigns(), "SHOPPING", sheet, results);
    
    // Display Campaigns
    Logger.log("\n--- Processando campagne Display ---");
    const statusCondition = getCampaignStatusCondition();
    const displayIterator = AdsApp.campaigns()
      .withCondition("AdvertisingChannelType = DISPLAY")
      .withCondition(statusCondition)
      .get();
    while (displayIterator.hasNext()) {
      processCampaign(displayIterator.next(), "DISPLAY", sheet, results);
    }
    
    // Video Campaigns (gestione speciale)
    Logger.log("\n--- Processando campagne Video ---");
    const videoIterator = AdsApp.videoCampaigns()
      .withCondition(statusCondition)
      .get();
    
    let videoCount = 0;
    while (videoIterator.hasNext()) {
      const videoCampaign = videoIterator.next();
      videoCount++;
      Logger.log("🎥 Trovata campagna Video #" + videoCount + ": " + videoCampaign.getName());
      processVideoCampaign(videoCampaign, sheet, results);
    }
    
    if (videoCount === 0) {
      Logger.log("⚠️ Nessuna campagna Video trovata con filtro: " + statusCondition);
    } else {
      Logger.log("📊 Totale campagne Video processate: " + videoCount);
    }
    
    // Performance Max Campaigns
    Logger.log("\n--- Processando campagne Performance Max ---");
    processCampaignsByType(AdsApp.performanceMaxCampaigns(), "PERFORMANCE_MAX", sheet, results);
    
    // Smart Campaigns (se disponibili)
    try {
      Logger.log("\n--- Processando campagne Smart ---");
      processCampaignsByType(AdsApp.smartCampaigns(), "SMART", sheet, results);
    } catch (e) {
      Logger.log("Smart campaigns non disponibili o non supportate");
    }
    
  } catch (e) {
    Logger.log("Errore critico durante l'elaborazione: " + e);
    sendEmail("ERRORE CRITICO", "Si è verificato un errore critico:\n\n" + e.toString());
  }
  
  // ===========================
  // REPORT FINALE
  // ===========================
  
  Logger.log("\n========================================");
  Logger.log("📊 REPORT FINALE DETTAGLIATO");
  Logger.log("========================================");
  Logger.log("⏰ Esecuzione completata: " + new Date().toLocaleString());
  Logger.log("🔧 Modalità: " + (CONFIG.TEST_MODE ? "TEST (nessuna modifica applicata)" : "PRODUZIONE (modifiche applicate)"));
  Logger.log("📋 Filtro campagne: " + getCampaignStatusDescription());
  Logger.log("");
  
  // Statistiche generali
  Logger.log("📈 STATISTICHE GENERALI:");
  Logger.log("  ✅ Campagne aggiornate: " + results.updated);
  Logger.log("  ⏭️  Campagne saltate (già corrette): " + results.skipped);
  Logger.log("  ❌ Errori riscontrati: " + results.errors.length);
  Logger.log("  ⚡ Conflitti risolti: " + results.conflicts.length);
  Logger.log("  ℹ️  Campagne non supportate: " + results.unsupported.length);
  Logger.log("");
  
  // Dettagli conflitti risolti
  if (results.conflicts.length > 0) {
    Logger.log("🔄 DETTAGLI CONFLITTI RISOLTI:");
    Logger.log("   I seguenti " + results.conflicts.length + " conflitti sono stati automaticamente risolti");
    Logger.log("   (tracking template preesistenti sono stati sovrascritti con i nuovi parametri UTM):");
    Logger.log("");
    results.conflicts.forEach(function(conflict, index) {
      Logger.log("   " + (index + 1) + ". 📢 CAMPAGNA: " + conflict.campaign);
      Logger.log("      🔴 PRECEDENTE: " + (conflict.previous || "(vuoto)"));
      Logger.log("      🟢 NUOVO:      " + conflict.new);
      Logger.log("");
    });
  } else {
    Logger.log("🔄 CONFLITTI: Nessun conflitto rilevato - tutte le campagne erano prive di tracking template o già configurate correttamente");
    Logger.log("");
  }
  
  // Dettagli errori
  if (results.errors.length > 0) {
    Logger.log("❌ DETTAGLI ERRORI:");
    Logger.log("   I seguenti " + results.errors.length + " errori richiedono attenzione:");
    Logger.log("");
    results.errors.forEach(function(error, index) {
      Logger.log("   " + (index + 1) + ". 📢 CAMPAGNA: " + error.campaign);
      Logger.log("      🔴 ERRORE: " + error.error);
      Logger.log("      💡 CAUSA PROBABILE: " + getErrorExplanation(error.error));
      Logger.log("");
    });
    Logger.log("   ⚠️  AZIONI RICHIESTE:");
    Logger.log("      - Verifica manualmente le campagne con errori");
    Logger.log("      - Controlla i permessi dell'account Google Ads");
    Logger.log("      - Verifica la compatibilità API per i tipi di campagna specifici");
    Logger.log("");
  } else {
    Logger.log("❌ ERRORI: Nessun errore riscontrato - tutte le campagne sono state elaborate con successo");
    Logger.log("");
  }
  
  // Dettagli campagne non supportate
  if (results.unsupported.length > 0) {
    Logger.log("ℹ️  CAMPAGNE NON SUPPORTATE:");
    Logger.log("   Le seguenti " + results.unsupported.length + " campagne non possono essere elaborate:");
    Logger.log("   (Limitazione API di Google Ads Scripts)");
    Logger.log("");
    results.unsupported.forEach(function(unsupported, index) {
      Logger.log("   " + (index + 1) + ". 📢 CAMPAGNA: " + unsupported.campaign);
      Logger.log("      ℹ️  MOTIVO: " + unsupported.reason);
      Logger.log("");
    });
    Logger.log("   💡 SOLUZIONE ALTERNATIVA:");
    Logger.log("      - Imposta manualmente i tracking template nelle campagne Video");
    Logger.log("      - Oppure usa l'interfaccia Google Ads per automazioni Video");
    Logger.log("");
  } else {
    Logger.log("ℹ️  CAMPAGNE NON SUPPORTATE: Nessuna campagna con limitazioni API");
    Logger.log("");
  }
  
  // Riepilogo finale
  const totalProcessed = results.updated + results.skipped + results.errors.length + results.unsupported.length;
  Logger.log("🎯 RIEPILOGO FINALE:");
  Logger.log("   📊 Totale campagne elaborate: " + totalProcessed);
  if (results.updated > 0) {
    Logger.log("   ✅ Successo: " + results.updated + " campagne hanno ricevuto i parametri UTM aggiornati");
  }
  if (results.skipped > 0) {
    Logger.log("   ⏭️  Saltate: " + results.skipped + " campagne erano già configurate correttamente");
  }
  if (results.errors.length > 0) {
    Logger.log("   ❌ Fallite: " + results.errors.length + " campagne non sono state elaborate a causa di errori");
  }
  if (results.unsupported.length > 0) {
    Logger.log("   ℹ️  Non supportate: " + results.unsupported.length + " campagne Video (limitazione API)");
  }
  
  const successRate = totalProcessed > 0 ? Math.round(((results.updated + results.skipped) / totalProcessed) * 100) : 0;
  Logger.log("   📈 Tasso di successo: " + successRate + "% (escludendo limitazioni API)");
  Logger.log("");
  
  // Invia email di riepilogo se ci sono stati aggiornamenti o errori
  if (results.updated > 0 || results.errors.length > 0 || results.conflicts.length > 0 || results.unsupported.length > 0) {
    const totalProcessedForEmail = results.updated + results.skipped + results.errors.length + results.unsupported.length;
    const successRate = totalProcessedForEmail > 0 ? Math.round(((results.updated + results.skipped) / totalProcessedForEmail) * 100) : 0;
    
    let emailBody = "📊 REPORT DETTAGLIATO - UTM Auto-Setter\n";
    emailBody += "=====================================\n\n";
    emailBody += "⏰ Esecuzione completata: " + new Date().toLocaleString() + "\n";
    emailBody += "🔧 Modalità: " + (CONFIG.TEST_MODE ? "TEST (simulazione)" : "PRODUZIONE") + "\n";
    emailBody += "📋 Filtro campagne: " + getCampaignStatusDescription() + "\n\n";
    
    emailBody += "📈 STATISTICHE GENERALI:\n";
    emailBody += "  ✅ Campagne aggiornate: " + results.updated + "\n";
    emailBody += "  ⏭️  Campagne già corrette: " + results.skipped + "\n";
    emailBody += "  ❌ Errori riscontrati: " + results.errors.length + "\n";
    emailBody += "  ⚡ Conflitti risolti: " + results.conflicts.length + "\n";
    emailBody += "  ℹ️  Campagne non supportate: " + results.unsupported.length + "\n";
    emailBody += "  📊 Totale elaborate: " + totalProcessedForEmail + "\n";
    emailBody += "  📈 Tasso di successo: " + successRate + "% (escludendo limitazioni API)\n\n";
    
    if (results.conflicts.length > 0) {
      emailBody += "🔄 CONFLITTI RISOLTI (" + results.conflicts.length + "):\n";
      emailBody += "   (Tracking template preesistenti sovrascritti)\n\n";
      results.conflicts.forEach(function(conflict, index) {
        emailBody += "   " + (index + 1) + ". 📢 " + conflict.campaign + "\n";
        emailBody += "      🔴 Precedente: " + (conflict.previous || "(vuoto)") + "\n";
        emailBody += "      🟢 Nuovo: " + conflict.new + "\n\n";
      });
    }
    
    if (results.errors.length > 0) {
      emailBody += "❌ ERRORI RISCONTRATI (" + results.errors.length + "):\n\n";
      results.errors.forEach(function(error, index) {
        emailBody += "   " + (index + 1) + ". 📢 " + error.campaign + "\n";
        emailBody += "      🔴 Errore: " + error.error + "\n";
        emailBody += "      💡 Causa probabile: " + getErrorExplanation(error.error) + "\n\n";
      });
      
      emailBody += "   ⚠️  AZIONI RICHIESTE:\n";
      emailBody += "      - Verifica manualmente le campagne con errori\n";
      emailBody += "      - Controlla i permessi dell'account Google Ads\n";
      emailBody += "      - Verifica la compatibilità API per i tipi di campagna specifici\n\n";
    }
    
    if (results.unsupported.length > 0) {
      emailBody += "ℹ️  CAMPAGNE NON SUPPORTATE (" + results.unsupported.length + "):\n\n";
      results.unsupported.forEach(function(unsupported, index) {
        emailBody += "   " + (index + 1) + ". 📢 " + unsupported.campaign + "\n";
        emailBody += "      ℹ️  Motivo: " + unsupported.reason + "\n\n";
      });
      
      emailBody += "   💡 SOLUZIONE ALTERNATIVA:\n";
      emailBody += "      - Imposta manualmente i tracking template nelle campagne Video\n";
      emailBody += "      - Oppure usa l'interfaccia Google Ads per automazioni Video\n\n";
    }
    
    if (CONFIG.SHEET_ID) {
      emailBody += "📋 LOG COMPLETO:\n";
      emailBody += "https://docs.google.com/spreadsheets/d/" + CONFIG.SHEET_ID + "\n\n";
    }
    
    emailBody += "🎯 RIEPILOGO: ";
    if (results.errors.length === 0 && results.unsupported.length === 0) {
      emailBody += "Esecuzione completata con successo!";
    } else if (results.errors.length > 0) {
      emailBody += "Esecuzione completata con " + results.errors.length + " errori da verificare.";
    } else if (results.unsupported.length > 0) {
      emailBody += "Esecuzione completata - " + results.unsupported.length + " campagne Video non supportate dall'API.";
    }
    
    const subject = results.errors.length > 0 ? 
      "⚠️ Report UTM (con errori)" : 
      (results.unsupported.length > 0 ? "ℹ️ Report UTM (con limitazioni API)" : "✅ Report UTM (successo)");
    
    sendEmail(subject, emailBody);
  }
  
  // Messaggio finale con link allo spreadsheet
  if (spreadsheetId) {
    const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/" + spreadsheetId;
    Logger.log("\n📋 ===================================================");
    Logger.log("📋 REPORT DETTAGLIATO DISPONIBILE SU GOOGLE SHEETS");
    Logger.log("📋 ===================================================");
    Logger.log("🔗 URL COMPLETO: " + spreadsheetUrl);
    Logger.log("📋 Nel foglio troverai tutti i dettagli di ogni campagna processata,");
    Logger.log("📋 inclusi i valori precedenti e nuovi dei tracking template");
    Logger.log("📋 e parametri custom per ogni singola modifica effettuata.");
    Logger.log("📋 ===================================================");
  }
  
  Logger.log("\n✅ Esecuzione completata!");
}