const YOUR_EMAIL = 'gabriele.benedetti@searchon.it'; // enter your email address here between the single quotes

function main() {
  const campaigns = AdsApp.campaigns()
    .withCondition('Status = ENABLED')
    .withCondition('Impressions = 0')
    .forDateRange('YESTERDAY')
    .get();
    
  if (campaigns.totalNumEntities() === 0) {
    Logger.log('All campaigns received impressions yesterday - no email sent');
    return;
  }
  
  const problemCampaigns = [];
  while (campaigns.hasNext()) {
    const campaign = campaigns.next();
    problemCampaigns.push(campaign.getName());
  }
  
  const subject = '8020agent Alert: Campaigns With Zero Impressions';
  const htmlBody = '<p>The following campaigns had zero impressions yesterday:</p>' +
                  '<ul><li>' + problemCampaigns.join('</li><li>') + '</li></ul>' +
                  '<p>Please check for issues with:</p>' +
                  '<ul>' +
                  '<li>Ad approval status</li>' +
                  '<li>Budget restrictions</li>' +
                  '<li>Targeting settings</li>' +
                  '<li>Billing issues</li>' +
                  '</ul>';
               
  MailApp.sendEmail({
    to: YOUR_EMAIL,
    subject: subject,
    htmlBody: htmlBody,
    body: 'The following campaigns had zero impressions yesterday: ' +
          problemCampaigns.join(' ') +
          ' Please check for issues with: ' +
          '- Ad approval status ' +
          '- Budget restrictions ' +
          '- Targeting settings ' +
          '- Billing issues'
  });
  
  Logger.log('Alert email sent to ' + YOUR_EMAIL);
}