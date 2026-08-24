## What works now

- Enable/disable filtering and choose a CS or IT study context.
- Hide known YouTube recommendation and advertising UI, including all detected Shorts links/shelves, while leaving the player intact.
- Remove common advertising/promotional interface elements and promotional modal pop-ups.
- Apply conservative English/Tagalog promotional-paragraph filtering using two signals: promotional wording and low academic relevance.
- Observe dynamically loaded content and report session counts in the popup.
- Use the popup's per-page Hide/Show toggle if a rule is too aggressive.

## Install for testing

1. Open `chrome://extensions` (or the equivalent Extensions page in Edge/Brave).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `semanthinks-extension` folder.
4. Open a YouTube video or an online article, then click the Semanthinks toolbar icon to adjust settings.

## Note

This is a **rule-based prototype**: it deliberately uses local rules as a placeholder. This project runs without external AI model files so that it is immediately testable. `content.js` currently uses `semanticRelevance()` as a transparent bilingual heuristic in place of EmbeddingGemma.
