function extractText() {
    const allText = document.body.innerText;
    return allText;
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractText") {
      const text = extractText();
      sendResponse({ text: text });
    }
  });