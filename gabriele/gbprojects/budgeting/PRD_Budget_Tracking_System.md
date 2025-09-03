# PRD - Sistema di Tracciamento Budget WMF

## 1. PANORAMICA DEL PROGETTO

**Nome Progetto:** WMF Budget Tracker  
**Obiettivo:** Sistema automatizzato per il monitoraggio dei budget pubblicitari dei progetti WMF (Sponsor e Ticket) su Google Ads, Meta Ads e LinkedIn Ads  
**Utente Target:** Digital Marketing Manager WMF  
**Piattaforma:** Google APP Script su Google Sheets con integrazioni API automatizzate  

## 2. CONTESTO E PROBLEMA

### Situazione Attuale
- Gestione manuale dei budget per 2 progetti principali: Acquisizione Sponsor e Vendita Biglietti
- Tracciamento su 3 piattaforme: Google Ads, Meta Ads, LinkedIn Ads  
- Importazione manuale dei dati di costo giornalieri
- Calcoli manuali per budget disponibile, speso e avanzi e visualizzazione con grafico

### Problemi da Risolvere
- **Time-consuming:** Processo manuale di raccolta dati dalle 3 piattaforme
- **Errori umani:** Rischio di errori nei calcoli e nell'importazione dati
- **Visibilità limitata:** Mancanza di dashboard consolidato per monitoraggio real-time
- **Scalabilità:** Difficoltà nel gestire crescita del volume di campagne

## 3. OBIETTIVI DEL PROGETTO

### Obiettivi Primari
1. **Automatizzare l'importazione** dei dati di costo dalle 3 piattaforme pubblicitarie
2. **Centralizzare il monitoraggio** di tutti i budget in un unico sistema
3. **Calcolare automaticamente** budget giornaliero, speso, avanzi per ogni progetto/piattaforma
4. **Generare visualizzazioni** grafiche per monitoraggio performance vs budget

### Obiettivi Secondari
- Ridurre il tempo dedicato al monitoraggio budget da ore a minuti
- Migliorare l'accuratezza dei dati e calcoli
- Fornire visibilità real-time sullo stato dei budget

## 4. REQUISITI FUNZIONALI

### 4.1 Gestione Progetti e Budget

**RF001 - Configurazione Progetti**
- Il sistema deve supportare 2 progetti: "Sponsor" e "Ticket"
- Ogni progetto ha budget mensili indipendenti
- Budget giornaliero = Budget mensile / giorni del mese

**RF002 - Configurazione Piattaforme**
- Supporto per 3 piattaforme: Google Ads, Meta Ads, LinkedIn Ads
- 1 account per piattaforma
- Suddivisione budget per piattaforma configurabile per progetto

### 4.2 Importazione Dati

**RF003 - Connessione API**
- **Google Ads:** Integrazione via Google Ads API nativa
- **Meta Ads:** Integrazione via Mixed Analytics + API Connector
- **LinkedIn Ads:** Integrazione via Mixed Analytics + API Connector

**RF004 - Scaricamento Automatico**
- Aggiornamento automatico giornaliero dei dati di costo
- Importazione solo della metrica "Cost per Day"
- Filtraggio campagne per nome per associare ai progetti corretti

### 4.3 Struttura Dati e Calcoli

**RF005 - Organizzazione Fogli**
- Foglio unico con naming convention: `centrocosti_piattaforma`
- tab: tab di raccolta dati "raw" sponsor_goo, sponsor_meta, sponsor_ln, ticket_goo, ticket_meta, ticket_ln, tab totali (dove mostrare il budget giornaliero, gli aggregati e i grafici in alto)
- Struttura dati identica al sistema attuale (Date, Cost per Day)

**RF006 - Calcoli Automatici**
- Budget giornaliero disponibile
- Speso giornaliero effettivo  
- Avanzo giornaliero (budget - speso)
- Speso totale progressivo
- Avanzo totale rimanente

### 4.4 Visualizzazione e Grafici

**RF007 - Dashboard Consolidato**
- Vista aggregata per progetto (Sponsor/Ticket)
- Somma automatica di tutte e 3 le piattaforme per progetto

**RF008 - Grafici Automatici**
- **Grafico 1:** Totale Budget Disponibile vs Totale Speso (per progetto)
- **Grafico 2:** Speso Giornaliero vs Budget Giornaliero (trend temporale)
- Aggiornamento automatico grafici quando si importano nuovi dati

## 5. REQUISITI NON FUNZIONALI

### 5.1 Prestazioni
- Importazione dati completata entro 5 minuti per tutte le piattaforme
- Aggiornamento grafici real-time

### 5.2 Usabilità  
- Interfaccia identica al sistema manuale attuale
- Un click per attivare aggiornamento dati
- Nessuna formazione aggiuntiva richiesta

### 5.3 Sicurezza
- Accesso limitato al solo Digital Marketing Manager
- Credenziali API sicure e criptate
- Nessuna esposizione dati sensibili

### 5.4 Affidabilità
- Sistema operativo 24/7
- Backup automatico dati
- Log errori per troubleshooting

## 6. ARCHITETTURA TECNICA

### 6.1 Stack Tecnologico
- **Frontend:** Google Sheets
- **Backend:** Google Apps Script
- **Integrazioni:** 
  - Google Ads API (nativa)
  - Mixed Analytics API Connector (Meta + LinkedIn)
- **Storage:** Google Drive

### 6.2 Flusso Dati
```
[Google Ads API] ──┐
[Meta via Mixed]  ──┼── [Apps Script] ── [Google Sheets] ── [Grafici]
[LinkedIn Mixed] ──┘
```

### 6.3 Struttura File
```
WMF_Budget_Tracker.xlsx
├── sponsor_goo (Google Ads - Sponsor)
├── sponsor_meta (Meta - Sponsor)  
├── sponsor_ln (LinkedIn - Sponsor)
├── ticket_goo (Google Ads - Ticket)
├── ticket_meta (Meta - Ticket)
├── ticket_ln (LinkedIn - Ticket)
├── Dashboard_Sponsor (Aggregato + Grafici)
└── Dashboard_Ticket (Aggregato + Grafici)
```

## 7. SPECIFICHE DI IMPLEMENTAZIONE

### 7.1 Formato Dati
**Colonne per ogni foglio piattaforma:**
```
| Date | Cost per Day | Budget Daily | Daily Surplus | Total Spent | Total Remaining |
```

### 7.2 Logica Calcoli
- `Budget Daily = Monthly Budget / Days in Month`
- `Daily Surplus = Budget Daily - Cost per Day`  
- `Total Spent = SUM(Cost per Day)`
- `Total Remaining = Monthly Budget - Total Spent`

### 7.3 Filtri Campagne
- **Sponsor:** Campagne contenenti keyword "sponsor" nel nome
- **Ticket:** Campagne contenenti keyword "ticket" nel nome

## 8. PIANO DI SVILUPPO

### Fase 1: Setup Base (Settimana 1)
- Configurazione Google Apps Script
- Setup connessioni API (Google Ads, Mixed Analytics)
- Creazione struttura fogli base

### Fase 2: Importazione Dati (Settimana 2)  
- Implementazione script importazione Google Ads
- Implementazione script importazione Meta (Mixed Analytics)
- Implementazione script importazione LinkedIn (Mixed Analytics)
- Test filtraggi campagne per progetto

### Fase 3: Calcoli e Dashboard (Settimana 3)
- Implementazione formule calcolo automatico
- Creazione dashboard aggregati Sponsor/Ticket
- Sviluppo grafici automatici

### Fase 4: Automazione e Test (Settimana 4)
- Setup trigger automatici giornalieri
- Test completo end-to-end
- Debugging e ottimizzazioni

## 9. ACCETTAZIONE E SUCCESS CRITERIA

### Criteri di Successo
- ✅ Importazione automatica dati da tutte e 3 le piattaforme
- ✅ Calcoli automatici accurati (budget vs speso)  
- ✅ Grafici aggiornati automaticamente
- ✅ Tempo setup giornaliero < 5 minuti (vs ore attuali)
- ✅ Zero errori di calcolo
- ✅ Sistema operativo per almeno 30 giorni senza interventi

### Test di Accettazione
1. **Test Importazione:** Dati importati correttamente da Google/Meta/LinkedIn
2. **Test Calcoli:** Formule producono risultati identici al metodo manuale  
3. **Test Grafici:** Visualizzazioni si aggiornano automaticamente
4. **Test Automazione:** Sistema funziona senza interventi per 1 settimana
5. **Test Usabilità:** Utente riesce a usare sistema senza formazione

## 10. RISCHI E MITIGAZIONI

### Rischi Tecnici
- **API Limits:** Superamento rate limits delle API
  - *Mitigazione:* Implementare retry logic e spacing delle chiamate
- **Autenticazione:** Scadenza token/credenziali  
  - *Mitigazione:* Refresh automatico token + alert scadenze

### Rischi Business
- **Cambio struttura campagne:** Modifica naming convention campagne
  - *Mitigazione:* Filtri configurabili, non hard-coded
- **Crescita volume:** Aumento numero campagne/account
  - *Mitigazione:* Architettura scalabile fin dall'inizio

## 11. POST-IMPLEMENTAZIONE

### Manutenzione
- Review mensile performance sistema
- Aggiornamento credenziali API quando necessario
- Backup settimanale configurazioni

### Evoluzione Futura
- Possibile estensione ad altri progetti WMF
- Integrazione sistema alerting automatico  
- Dashboard management per direzione
- Possibile migrazione a piattaforma più avanzata (Tableau, Power BI)

---

**Documento preparato da:** Claude AI  
**Data:** 27 Gennaio 2025  
**Versione:** 1.0  
**Status:** Draft per Review