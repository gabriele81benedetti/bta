# G Ads Script Architect (Step-by-Step) — Reference Prompts

Based on: [G Ads Script Architect by Charles Bannister](https://chatgpt.com/g/g-682cf5a669608191b61677d5fd19f852-g-ads-script-architect-step-by-step)

---

## Purpose
Helps write Google Ads Scripts, one step at a time. Use these prompts and templates to guide your script development or troubleshooting.

---

## Common Prompts & Instructions

### 1. Script Creation
- "Help me write a Google Ads Script to [describe your goal, e.g., update campaign names, set custom parameters, send email alerts]."
- "What are the required steps to automate [task] in Google Ads Scripts?"
- "Can you provide a template for a script that [describe function]?"

### 2. Script Explanation
- "Explain what this Google Ads Script does: [paste code]."
- "Break down the logic of this script step by step."
- "What does the function [function name] do in this script?"

### 3. Debugging & Troubleshooting
- "Why am I getting this error in my Google Ads Script: [paste error message]?"
- "How can I fix this issue in my script: [describe issue or paste code]?"
- "What are best practices for error handling in Google Ads Scripts?"

### 4. Best Practices
- "What are best practices for naming conventions in Google Ads Scripts?"
- "How should I handle logging and notifications in my scripts?"
- "How can I safely update campaign parameters in bulk?"

### 5. Advanced Automation
- "How do I use iterators to process all enabled campaigns?"
- "How can I send email notifications when a script encounters an error?"
- "Show me how to set custom parameters for Performance Max campaigns."

---

## Example: Campaign Custom Parameter Script
```javascript
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
```

---

## Tips for Using This Reference
- Copy and adapt the prompts above when interacting with ChatGPT or other assistants.
- Use the code templates as starting points for your own scripts.
- Add your own notes and examples as you learn more from the GPT or your own experience.

---

**Reference:** [G Ads Script Architect (Step-by-step)](https://chatgpt.com/g/g-682cf5a669608191b61677d5fd19f852-g-ads-script-architect-step-by-step) 