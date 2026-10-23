const connectedTabs = new Set();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'tm-focus-query' || !Number.isInteger(sender.tab?.id)) return;
  const tabId = sender.tab.id;
  connectedTabs.add(tabId);
  (async () => {
    try {
      const tab = await chrome.tabs.get(tabId);
      const window = await chrome.windows.get(tab.windowId);
      sendResponse({ foreground: Boolean(tab.active && window.focused) });
    } catch (_) {
      sendResponse({ foreground: null });
    }
  })();
  return true;
});

function refreshConnectedTabs() {
  for (const tabId of connectedTabs) {
    chrome.tabs.sendMessage(tabId, { type: 'tm-focus-changed' }).catch(() => {
      connectedTabs.delete(tabId);
    });
  }
}

chrome.tabs.onActivated.addListener(refreshConnectedTabs);
chrome.tabs.onRemoved.addListener((tabId) => connectedTabs.delete(tabId));
chrome.windows.onFocusChanged.addListener(refreshConnectedTabs);
