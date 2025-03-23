document.addEventListener("DOMContentLoaded", () => {
  const summaryDiv = document.getElementById("summary");
  const chatDiv = document.getElementById("chat");
  const input = document.getElementById("input");
  const sendButton = document.getElementById("send");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyButton = document.getElementById("saveApiKey");

  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      tabContents.forEach(content => {
        content.style.display = content.id === tab ? 'block' : 'none';
      });
    });
  });

  // Load API key from storage
  chrome.storage.local.get("geminiApiKey", (data) => {
    if (data.geminiApiKey) {
      apiKeySection.style.display = "none";
      //apiKeyInput.value = data.geminiApiKey;
    }
  });

  // Save API key to storage
  saveApiKeyButton.addEventListener("click", () => {
    const apiKey = apiKeyInput.value;
    alert('API key saved');
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      console.log("API key saved.");
    });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "extractText" }, (response) => {
      if (response && response.text) {
        const pageText = response.text;
        getSummary(pageText)
          .then((summary) => {
            summaryDiv.textContent = summary;
          })
          .catch((error) => {
            summaryDiv.textContent = "Failed to get summary.";
            console.error("Summary error:", error);
          });
      } else {
        summaryDiv.textContent = "Failed to extract text.";
      }
    });
  });

  async function getSummary(text) {
    console.log('text is', text);
    const apiKey = await getApiKey();

    if (!apiKey) return "API key not set.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const data = {
      contents: [{ parts: [{ text: `Summarize the following text: ${text}` }] }],
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await response.json();
      if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0].text) {
        return json.candidates[0].content.parts[0].text;
      } else {
        return "Gemini API returned an unexpected response.";
      }

    } catch (error) {
      console.error("Summary error:", error);
      return "Failed to get summary.";
    }
  }

  async function getChatResponse(question, context) {
    const apiKey = await getApiKey();
    if (!apiKey) return "API key not set.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const data = {
      contents: [
        { parts: [{ text: `Context: ${context}\nQuestion: ${question}` }] },
      ],
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await response.json();
      if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0].text) {
        return json.candidates[0].content.parts[0].text;
      } else {
        return "Gemini API returned an unexpected response.";
      }

    } catch (error) {
      console.error("Chat error:", error);
      return "Failed to get response.";
    }
  }

  async function getApiKey() {
      return new Promise((resolve) => {
        chrome.storage.local.get("geminiApiKey", (data) => {
          resolve(data.geminiApiKey);
        });
      });
  }


  sendButton.addEventListener("click", () => {
    const question = input.value;
    if (question) {
      const context = summaryDiv.textContent;
      getChatResponse(question, context)
        .then((response) => {
          var converter = new showdown.Converter();
          const formattedResponse = converter.makeHtml(response);
          // Create new elements for each message
          const userMessage = document.createElement("p");
          userMessage.innerHTML = `<strong>You:</strong> ${question}`;
          userMessage.classList.add("chat-message");

          const botMessage = document.createElement("p");
          botMessage.innerHTML = `<strong>Bot:</strong> ${formattedResponse}`;
          botMessage.classList.add("chat-message");

          // Append the messages to the chatDiv
          chatDiv.appendChild(userMessage);
          chatDiv.appendChild(botMessage);

          input.value = "";
          //scroll to bottom of chat.
          chatDiv.scrollTop = chatDiv.scrollHeight;
        })
        .catch((error) => {
          const errorMessage = document.createElement("p");
          errorMessage.innerHTML = "Error getting response.";
          chatDiv.appendChild(errorMessage);
          console.error("Chat error:", error);
        });
    }
  });

});