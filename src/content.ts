chrome.storage.sync.get(['color', 'enabled', 'excludedSites', 'aggressiveModeSites', 'alwaysOnAggressiveMode'], (data) => {
  const userColor = data.color || '#cce8cf';
  const isEnabled = data.enabled ?? true;
  const excludedSites = data.excludedSites || [];
  const aggressiveModeSites = data.aggressiveModeSites || [];
  const alwaysOnAggressiveMode = data.alwaysOnAggressiveMode ?? false;

  if (!isEnabled || excludedSites.some((site) => window.location.href.includes(site))) {
    console.log('Eye Guard is disabled or this site is excluded.');
    return;
  }

  const processedElements = new WeakSet<HTMLElement>();

  function getRGBValues(str: string): number[] {
    return str.substring(str.indexOf('(') + 1, str.length - 1).split(', ').map(Number);
  }

  function checkRGB(first: number[], second: number[]): boolean {
    return first.every((val, i) => val >= second[i]);
  }

  function setElementStyle(elem: HTMLElement): void {
    elem.style.backgroundColor = userColor;
    processedElements.add(elem);
  }

  function changeBackgroundColor(elem: HTMLElement): void {
    if (processedElements.has(elem)) return;
    const bg = window.getComputedStyle(elem).getPropertyValue('background-color');
    if (bg === 'transparent') return;

    const currentRGB = getRGBValues(bg);
    if (checkRGB(currentRGB, [240, 240, 240])) {
      setElementStyle(elem);
    }
  }

  function processElements(): void {
    const selector = ['html', 'body', 'div', 'main', 'article'].join(',');
    const elements = document.querySelectorAll(selector);
    elements.forEach((elem) => changeBackgroundColor(elem as HTMLElement));
  }

  function observeMutations(): void {
    const observer = new MutationObserver(() => {
      processElements();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function simulateOnUrlChange(callback: () => void): void {
    let lastUrl = location.href;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      callbackIfUrlChanged();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      callbackIfUrlChanged();
    };

    window.addEventListener('popstate', callbackIfUrlChanged);

    setInterval(() => {
      callbackIfUrlChanged();
    }, 500);

    function callbackIfUrlChanged() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        callback();
      }
    }
  }

  if (alwaysOnAggressiveMode || aggressiveModeSites.some((site) => window.location.href.includes(site))) {
    console.log('Aggressive mode enabled.');
    processElements();
    observeMutations();
    simulateOnUrlChange(() => {
      processElements();
    });
  } else {
    console.log('Regular mode enabled.');
    processElements();
  }
});