function main() {
    const newSheet = SpreadsheetApp.create("Google Ads Data " + new Date().toLocaleDateString());
    const sheets = {
      'Campaigns': { headers: ['Campaign', 'Impressions', 'Clicks', 'CTR', 'Cost', 'Conversions', 'Cost/Conv'] },
      'Ad Groups': { headers: ['Campaign', 'Ad Group', 'Impressions', 'Clicks', 'CTR', 'Cost', 'Conversions', 'Cost/Conv'] },
      'Keywords': { headers: ['Campaign', 'Ad Group', 'Keyword', 'Match Type', 'Impressions', 'Clicks', 'CTR', 'Cost', 'Conversions', 'Cost/Conv'] }
    };
  
    Object.entries(sheets).forEach(([name, config]) => {
      const sheet = newSheet.insertSheet(name);
      sheet.clear();
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      config.sheet = sheet;
    });
  
    const queries = {
      'Campaigns': "SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS AND metrics.cost_micros > 0 AND metrics.impressions >= 100 AND metrics.cost_micros > 100000000 ORDER BY metrics.cost_micros DESC",
      'Ad Groups': "SELECT campaign.name, ad_group.name, metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros, metrics.conversions FROM ad_group WHERE segments.date DURING LAST_30_DAYS AND metrics.cost_micros > 0 AND metrics.impressions >= 100 AND metrics.cost_micros > 100000000 ORDER BY metrics.cost_micros DESC",
      'Keywords': "SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros, metrics.conversions FROM keyword_view WHERE segments.date DURING LAST_30_DAYS AND metrics.cost_micros > 0 AND metrics.impressions >= 100 AND metrics.cost_micros > 100000000 ORDER BY metrics.cost_micros DESC"
    };
  
    Object.entries(queries).forEach(([type, query]) => {
      const rows = [];
      const result = AdsApp.search(query);
      
      while (result.hasNext()) {
        const row = result.next();
        const metrics = row.metrics;
        const imp = Number(metrics.impressions);
        const clicks = Number(metrics.clicks);
        const cost = Number(metrics.costMicros) / 1000000;
        const conv = Number(metrics.conversions);
        
        const baseMetrics = [
          imp,
          clicks,
          clicks / imp * 100 || 0,
          cost,
          conv,
          cost / (conv || 1)
        ];
  
        rows.push(type === 'Campaigns' ? 
          [row.campaign.name, ...baseMetrics] :
          type === 'Ad Groups' ?
          [row.campaign.name, row.adGroup.name, ...baseMetrics] :
          [row.campaign.name, row.adGroup.name, row.adGroupCriterion.keyword.text, row.adGroupCriterion.keyword.matchType, ...baseMetrics]
        );
      }
  
      if (rows.length) {
        const sheet = sheets[type].sheet;
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
        sheet.autoResizeColumns(1, sheets[type].headers.length);
      }
    });
  
    Logger.log("Filtered report created! URL: " + newSheet.getUrl());
  }