(function () {
  let requestSequence = 0;

  async function refreshFocus() {
    const sequence = ++requestSequence;
    try {
      const state = await chrome.runtime.sendMessage({ type: 'tm-focus-query' });
      if (sequence !== requestSequence || typeof state?.foreground !== 'boolean') return;
      const root = document.documentElement;
      if (!root) return;
      root.setAttribute('data-tm-chrome-foreground', String(state.foreground));
      root.setAttribute('data-tm-chrome-focus-at', String(Date.now()));
    } catch (_) {
      // O userscript usa o estado nativo do documento quando a extensão não responde.
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'tm-focus-changed') refreshFocus();
  });
  refreshFocus();
  setInterval(refreshFocus, 2000);
})();
