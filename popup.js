const STORAGE_KEY = "antiig_enabled";
const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

// Load current state
chrome.storage.local.get(STORAGE_KEY, (result) => {
  const isEnabled = result[STORAGE_KEY] !== false;
  toggle.checked = isEnabled;
  updateStatus(isEnabled);
});

toggle.addEventListener("change", () => {
  const isEnabled = toggle.checked;
  chrome.storage.local.set({ [STORAGE_KEY]: isEnabled });
  updateStatus(isEnabled);

  // Notify content script on the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "toggle",
        enabled: isEnabled,
      });
    }
  });
});

function updateStatus(isEnabled) {
  status.textContent = isEnabled ? "Filtering active" : "Filtering paused";
  status.style.color = isEnabled ? "#0095f6" : "#666";
}
