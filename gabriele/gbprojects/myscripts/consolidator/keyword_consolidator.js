// Keyword Consolidator Script for Google Sheets
// Reads a sheet with Campaign, Ad Group, Keyword, Search Term columns
// Outputs a new sheet with 'Before' (original) and 'After' (consolidated) structure
// Focus: Minimum set of keywords to cover all search terms/keywords, best ad group structure, no metrics

function main() {
  const INPUT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Y4WF4-oTd2hasF5ozMiShm3Ae0GJXTTC_A4HFbWsty8/edit?gid=1234375081#gid=1234375081'; // If not provided, prompt user to set
  const BEFORE_TAB = 'Before';
  const AFTER_TAB = 'After';

  // 1. Open the input sheet (prompt if not set)
  let ss;
  if (!INPUT_SHEET_URL) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('No INPUT_SHEET_URL provided, using active spreadsheet.');
  } else {
    ss = SpreadsheetApp.openByUrl(INPUT_SHEET_URL);
  }

  // 2. Read all data from the first sheet
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const rows = data.slice(1);

  // 3. Parse campaigns, ad groups, keywords, search terms
  const levelIdx = headers.findIndex(h => h.toLowerCase() === 'level');
  const campaignIdx = headers.findIndex(h => h.toLowerCase().includes('campaign'));
  const adGroupIdx = headers.findIndex(h => h.toLowerCase().includes('ad group'));
  const keywordIdx = headers.findIndex(h => h.toLowerCase() === 'keyword');
  const searchTermIdx = headers.findIndex(h => h.toLowerCase() === 'search term');

  if (levelIdx === -1 || campaignIdx === -1 || adGroupIdx === -1 || keywordIdx === -1 || searchTermIdx === -1) {
    throw new Error('Missing required columns: Level, Campaign, Ad Group, Keyword, Search Term');
  }

  // Helper: Normalize for Google Ads matching (case, accents, punctuation)
  function normalize(str) {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s\[\]"]/g, '') // Remove punctuation except brackets/quotes
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  // Helper: Extract match type and base keyword
  function parseKeyword(raw) {
    if (!raw) return {base: '', match: 'BROAD'};
    let str = raw.trim();
    if (str.startsWith('[') && str.endsWith(']')) {
      return {base: normalize(str.slice(1, -1)), match: 'EXACT'};
    } else if (str.startsWith('"') && str.endsWith('"')) {
      return {base: normalize(str.slice(1, -1)), match: 'PHRASE'};
    } else {
      return {base: normalize(str), match: 'BROAD'};
    }
  }

  // 4. Build lists of all keywords and search terms (using Level column)
  let allKeywords = [];
  let allSearchTerms = [];
  rows.forEach(row => {
    const level = row[levelIdx] ? row[levelIdx].toString().trim().toLowerCase() : '';
    const campaign = row[campaignIdx];
    const adGroup = row[adGroupIdx];
    if (level === 'keyword') {
      const keywordRaw = row[keywordIdx];
      if (keywordRaw) {
        const {base, match} = parseKeyword(keywordRaw);
        allKeywords.push({
          campaign,
          adGroup,
          raw: keywordRaw,
          base,
          match,
          normalized: base,
        });
      }
    } else if (level === 'search term') {
      const searchTermRaw = row[searchTermIdx];
      if (searchTermRaw) {
        allSearchTerms.push(normalize(searchTermRaw));
      }
    }
  });
  allSearchTerms = Array.from(new Set(allSearchTerms)); // Unique

  // 5. For each keyword, determine which search terms/keywords it covers
  function keywordCoversTerm(keyword, term) {
    // Google Ads logic: Exact covers only itself, Phrase covers phrase-included, Broad covers all containing words
    if (!term) return false;
    if (keyword.match === 'EXACT') {
      return keyword.base === term;
    } else if (keyword.match === 'PHRASE') {
      // Term must contain the phrase as a substring (word boundaries)
      return term.includes(keyword.base);
    } else {
      // BROAD: All words in base must be present in term (any order)
      const kwWords = keyword.base.split(' ');
      return kwWords.every(w => term.includes(w));
    }
  }

  // 6. Build coverage map: for each search term, which keywords cover it
  let termCoverage = {};
  allSearchTerms.forEach(term => {
    termCoverage[term] = allKeywords.filter(kw => keywordCoversTerm(kw, term));
  });

  // 7. Find minimum set of keywords to cover all search terms (prefer tightest match)
  let neededKeywords = [];
  let coveredTerms = new Set();
  // Try to cover with exacts first, then phrases, then broads
  ['EXACT', 'PHRASE', 'BROAD'].forEach(matchType => {
    allKeywords.filter(kw => kw.match === matchType).forEach(kw => {
      // Does this keyword cover any uncovered term?
      let coversNew = false;
      allSearchTerms.forEach(term => {
        if (!coveredTerms.has(term) && keywordCoversTerm(kw, term)) {
          coversNew = true;
        }
      });
      if (coversNew) {
        neededKeywords.push(kw);
        allSearchTerms.forEach(term => {
          if (keywordCoversTerm(kw, term)) coveredTerms.add(term);
        });
      }
    });
  });

  // 8. If any search term is not covered, suggest a new exact keyword for it
  allSearchTerms.forEach(term => {
    if (!coveredTerms.has(term)) {
      neededKeywords.push({
        campaign: '',
        adGroup: '',
        raw: `[${term}]`,
        base: term,
        match: 'EXACT',
        normalized: term,
        suggested: true
      });
    }
  });

  // 9. Group needed keywords by campaign/ad group intent (simple: all in one ad group per campaign)
  // For demo: put all in one ad group per campaign, named 'Consolidated'
  let consolidated = {};
  neededKeywords.forEach(kw => {
    let campaign = kw.campaign ? kw.campaign + ' Consolidated' : 'Consolidated';
    let adGroup = 'Consolidated';
    if (!consolidated[campaign]) consolidated[campaign] = {};
    if (!consolidated[campaign][adGroup]) consolidated[campaign][adGroup] = [];
    consolidated[campaign][adGroup].push(kw.raw);
  });

  // 10. Write output: Before (original), After (consolidated)
  // Remove old tabs if exist
  [BEFORE_TAB, AFTER_TAB].forEach(tab => {
    let s = ss.getSheetByName(tab);
    if (s) ss.deleteSheet(s);
  });
  // Before tab
  let beforeSheet = ss.insertSheet(BEFORE_TAB, 0);
  beforeSheet.appendRow(['Campaign', 'Ad Group', 'Keyword', 'Search Term']);
  rows.forEach(row => {
    beforeSheet.appendRow([
      row[campaignIdx],
      row[adGroupIdx],
      row[keywordIdx],
      row[searchTermIdx]
    ]);
  });
  // After tab
  let afterSheet = ss.insertSheet(AFTER_TAB, 1);
  afterSheet.appendRow(['Campaign', 'Ad Group', 'Keyword']);
  Object.entries(consolidated).forEach(([campaign, adGroups]) => {
    Object.entries(adGroups).forEach(([adGroup, keywords]) => {
      keywords.forEach(kw => {
        afterSheet.appendRow([campaign, adGroup, kw]);
      });
    });
  });
  Logger.log('Consolidation complete. See Before/After tabs.');
} 