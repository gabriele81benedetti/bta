function processCampaignIterator(campaignIterator, updatedCampaigns, errors, EMAILS) {
  while (campaignIterator.hasNext()) {
    const campaign = campaignIterator.next();
    try {
      const customParams = campaign.urls().getCustomParameters();
      const correctCamValue = campaign.getName().replace(/ /g, "_");
      if (!customParams.hasOwnProperty('_cam') || customParams._cam !== correctCamValue) {
        campaign.urls().setCustomParameters({
          ...customParams,
          _cam: correctCamValue
        });
        Logger.log("Parametro '_cam' impostato/aggiornato per la campagna: " + campaign.getName());
        updatedCampaigns.push(campaign.getName());
      }
    } catch (e) {
      const errorMsg = `Errore nella campagna '${campaign.getName()}': ${e}`;
      Logger.log(errorMsg);
      errors.push(errorMsg);
      EMAILS.forEach(function(email) {
        try {
          MailApp.sendEmail({
            to: email,
            subject: "Errore script Google Ads: _cam parameter",
            body: errorMsg
          });
        } catch (mailErr) {
          Logger.log("Errore nell'invio dell'email a " + email + ": " + mailErr);
        }
      });
    }
  }
}

function main() {
  // List of email addresses for error notifications
  const EMAILS = [
    "gabriele.benedetti@searchon.it",
    // Add more emails as needed, e.g. "another@email.com"
  ];
  const updatedCampaigns = [];
  const errors = [];

  // Process standard campaigns
  const campaignIterator = AdsApp.campaigns()
    .withCondition("Status = ENABLED")
    .get();
  processCampaignIterator(campaignIterator, updatedCampaigns, errors, EMAILS);

  // Process Performance Max campaigns
  const pmaxIterator = AdsApp.performanceMaxCampaigns()
    .withCondition("Status = ENABLED")
    .get();
  processCampaignIterator(pmaxIterator, updatedCampaigns, errors, EMAILS);

  Logger.log(`Totale campagne aggiornate: ${updatedCampaigns.length}`);
  if (errors.length > 0) {
    Logger.log(`Totale errori: ${errors.length}`);
  }
}