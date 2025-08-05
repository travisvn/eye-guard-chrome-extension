chrome.storage.sync.get([
  'color', 'enabled', 'excludedSites', 'aggressiveModeSites', 'alwaysOnAggressiveMode', 
  'sensitivity', 'autoAggressiveSites'
], (data) => {
  const userColor = data.color || '#cce8cf';
  const isEnabled = data.enabled ?? true;
  const excludedSites = data.excludedSites || [];
  const aggressiveModeSites = data.aggressiveModeSites || [];
  const alwaysOnAggressiveMode = data.alwaysOnAggressiveMode ?? false;
  const sensitivity = data.sensitivity ?? 240;
  const autoAggressiveSites = data.autoAggressiveSites ?? false;

  if (!isEnabled || excludedSites.some((site) => window.location.href.includes(site))) {
    console.log('Eye Guard is disabled or this site is excluded.');
    return;
  }

  // Enhanced configuration
  const CONFIG = {
    targetColor: userColor,
    lightThreshold: [sensitivity, sensitivity, sensitivity],
    
    primaryElements: [
      'html', 'body', 'main', 'article', 'section', 'aside', 'header', 'footer', 'nav'
    ],
    
    containerElements: [
      'button', 'a', 'input', 'textarea', 'select', 'form', 'fieldset', 'label'
    ],
    
    secondaryElements: [
      'div', 'span', 'p', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th'
    ],
    
    minDimensions: { width: 100, height: 50 },
    observerThrottle: 200,
    maxProcessingTime: 50,
    debugMode: false
  };

  let processedElements = new WeakSet<HTMLElement>();
  let processedContainers = new WeakSet<HTMLElement>();
  let observerTimeout: ReturnType<typeof setTimeout> | null = null;
  let processingStartTime = 0;

  function log(...args: any[]): void {
    if (CONFIG.debugMode) {
      console.log('[Eye Guard Enhanced]', ...args);
    }
  }

  function parseRGBColor(colorString: string): number[] | null {
    if (!colorString || colorString === 'transparent' || colorString === 'inherit' || colorString === 'initial') {
      return null;
    }

    // Handle rgb() and rgba() formats
    const rgbMatch = colorString.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(',').map((v) => parseInt(v.trim()));
      // If alpha is 0 or very low, treat as transparent
      if (values.length === 4 && values[3] < 0.1) {
        return null;
      }
      return values.slice(0, 3); // Return only RGB, ignore alpha
    }

    // Handle hex colors
    const hexMatch = colorString.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      return [
        parseInt(hex.substr(0, 2), 16),
        parseInt(hex.substr(2, 2), 16),
        parseInt(hex.substr(4, 2), 16),
      ];
    }

    // Handle named colors (basic support)
    const namedColors: Record<string, number[]> = {
      white: [255, 255, 255],
      black: [0, 0, 0],
      red: [255, 0, 0],
      green: [0, 255, 0],
      blue: [0, 0, 255],
    };

    if (namedColors[colorString.toLowerCase()]) {
      return namedColors[colorString.toLowerCase()];
    }

    return null;
  }

  function isLightColor(rgb: number[]): boolean {
    if (!rgb || rgb.length < 3) return false;
    return rgb.every((value, index) => value >= CONFIG.lightThreshold[index]);
  }

  function getEffectiveBackgroundColor(element: HTMLElement): number[] | null {
    let currentElement: HTMLElement | null = element;

    while (currentElement && currentElement !== document.documentElement) {
      const computedStyle = window.getComputedStyle(currentElement);
      const bgColor = computedStyle.backgroundColor;

      if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
        return parseRGBColor(bgColor);
      }

      currentElement = currentElement.parentElement;
    }

    return [255, 255, 255]; // Default to white if no background found
  }

  function isLargeEnough(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.width >= CONFIG.minDimensions.width &&
      rect.height >= CONFIG.minDimensions.height
    );
  }

  function isInsideProcessedContainer(element: HTMLElement): boolean {
    let parent = element.parentElement;
    while (parent && parent !== document.documentElement) {
      if (processedContainers.has(parent)) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  function hasBackgroundImage(element: HTMLElement): boolean {
    const computedStyle = window.getComputedStyle(element);
    const backgroundImage = computedStyle.backgroundImage;
    
    // Check if element has any background image (including gradients)
    return backgroundImage && backgroundImage !== 'none';
  }

  function shouldChangeElement(element: HTMLElement, isAggressiveMode: boolean): boolean {
    if (processedElements.has(element)) {
      return false;
    }

    if (isInsideProcessedContainer(element)) {
      return false;
    }

    if (element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return false;
    }

    // Never replace elements with background images (themes, wallpapers, etc.)
    if (hasBackgroundImage(element)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();

    // Primary elements - always process in both modes
    if (CONFIG.primaryElements.includes(tagName)) {
      return true;
    }

    // Container elements - only in aggressive mode
    if (CONFIG.containerElements.includes(tagName)) {
      return isAggressiveMode;
    }

    // Secondary elements - only large ones in aggressive mode
    if (CONFIG.secondaryElements.includes(tagName)) {
      return isAggressiveMode && isLargeEnough(element);
    }

    return false;
  }

  function changeElementBackground(element: HTMLElement, isAggressiveMode: boolean): boolean {
    if (!shouldChangeElement(element, isAggressiveMode)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    const computedStyle = window.getComputedStyle(element);
    const directBgColor = parseRGBColor(computedStyle.backgroundColor);

    // Check direct background color
    if (directBgColor && isLightColor(directBgColor)) {
      log(`[${isAggressiveMode ? 'AGGRESSIVE' : 'REGULAR'}] Changing direct background of ${element.tagName}`, directBgColor);
      element.style.setProperty('background-color', CONFIG.targetColor, 'important');
      processedElements.add(element);

      if (CONFIG.containerElements.includes(tagName)) {
        processedContainers.add(element);
        log(`Marked ${tagName} as processed container - will skip children`);
      }

      return true;
    }

    // Check effective background color (inherited from parents) - only for primary/secondary elements in aggressive mode
    if (!CONFIG.containerElements.includes(tagName) && isAggressiveMode) {
      const effectiveBgColor = getEffectiveBackgroundColor(element);
      if (effectiveBgColor && isLightColor(effectiveBgColor)) {
        if (!directBgColor || computedStyle.backgroundColor === 'transparent') {
          log(`[AGGRESSIVE] Changing inherited background of ${element.tagName}`, effectiveBgColor);
          element.style.setProperty('background-color', CONFIG.targetColor, 'important');
          processedElements.add(element);
          return true;
        }
      }
    }

    processedElements.add(element);
    return false;
  }

  function processElementsRegularMode(): number {
    log('Processing elements in REGULAR mode (conservative)...');
    processingStartTime = Date.now();
    let changedCount = 0;

    // In regular mode, only target primary elements and be very conservative
    const primarySelector = CONFIG.primaryElements.join(',');
    const elements = document.querySelectorAll(primarySelector);

    elements.forEach((element) => {
      if (changeElementBackground(element as HTMLElement, false)) {
        changedCount++;
      }
    });

    log(`[REGULAR] Changed ${changedCount} elements in ${Date.now() - processingStartTime}ms`);
    return changedCount;
  }

  function processElementsAggressiveMode(): number {
    log('Processing elements in AGGRESSIVE mode (comprehensive)...');
    processingStartTime = Date.now();
    let changedCount = 0;
    let processedCount = 0;

    const allElements = document.querySelectorAll('*');

    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i] as HTMLElement;

      // Check if we've been processing too long
      if (Date.now() - processingStartTime > CONFIG.maxProcessingTime) {
        log(`Processing timeout reached after ${processedCount} elements, scheduling continuation...`);
        setTimeout(() => {
          const remainingElements = Array.from(allElements).slice(i);
          remainingElements.forEach((el) => {
            if (changeElementBackground(el as HTMLElement, true)) {
              changedCount++;
            }
          });
          log(`[AGGRESSIVE] Completed processing remaining ${remainingElements.length} elements, total changed: ${changedCount}`);
        }, 0);
        break;
      }

      if (changeElementBackground(element, true)) {
        changedCount++;
      }
      processedCount++;
    }

    // Also process document elements specifically
    [document.documentElement, document.body].forEach((element) => {
      if (element && changeElementBackground(element as HTMLElement, true)) {
        changedCount++;
      }
    });

    log(`[AGGRESSIVE] Changed ${changedCount} elements in ${Date.now() - processingStartTime}ms`);
    return changedCount;
  }

  // Wrapper function that chooses the appropriate processing mode
  function processAllElements(isAggressiveMode: boolean = false): number {
    return isAggressiveMode ? processElementsAggressiveMode() : processElementsRegularMode();
  }

  function throttledObserverCallback(isAggressiveMode: boolean): void {
    if (observerTimeout) {
      clearTimeout(observerTimeout);
    }

    observerTimeout = setTimeout(() => {
      processAllElements(isAggressiveMode);
    }, CONFIG.observerThrottle);
  }

  function setupMutationObserver(isAggressiveMode: boolean): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldProcess = true;
        }

        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          shouldProcess = true;
        }
      });

      if (shouldProcess) {
        log('DOM mutation detected, reprocessing...');
        throttledObserverCallback(isAggressiveMode);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    log('Mutation observer set up for aggressive mode');
    return observer;
  }

  function setupIntersectionObserver(isAggressiveMode: boolean): IntersectionObserver | null {
    if (!window.IntersectionObserver) {
      log('Intersection Observer not supported');
      return null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            changeElementBackground(entry.target as HTMLElement, isAggressiveMode);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('div, section, article, main').forEach((element) => {
      observer.observe(element);
    });

    log('Intersection observer set up for aggressive mode');
    return observer;
  }

  function setupURLChangeDetection(isAggressiveMode: boolean): void {
    let currentURL = window.location.href;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args: any[]) {
      originalPushState.apply(this, args);
      setTimeout(() => {
        if (window.location.href !== currentURL) {
          currentURL = window.location.href;
          log('URL changed via pushState, reprocessing...');
          processedElements = new WeakSet<HTMLElement>();
          processedContainers = new WeakSet<HTMLElement>();
          setTimeout(() => processAllElements(isAggressiveMode), 500);
        }
      }, 100);
    };

    history.replaceState = function (...args: any[]) {
      originalReplaceState.apply(this, args);
      setTimeout(() => {
        if (window.location.href !== currentURL) {
          currentURL = window.location.href;
          log('URL changed via replaceState, reprocessing...');
          processedElements = new WeakSet<HTMLElement>();
          processedContainers = new WeakSet<HTMLElement>();
          setTimeout(() => processAllElements(isAggressiveMode), 500);
        }
      }, 100);
    };

    window.addEventListener('popstate', () => {
      log('Popstate event, reprocessing...');
      processedElements = new WeakSet<HTMLElement>();
      processedContainers = new WeakSet<HTMLElement>();
      setTimeout(() => processAllElements(isAggressiveMode), 500);
    });

    log('URL change detection set up for aggressive mode');
  }

  function injectGlobalCSS(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Force override for common light background patterns */
      html[style*="background-color: rgb(255, 255, 255)"],
      body[style*="background-color: rgb(255, 255, 255)"],
      div[style*="background-color: rgb(255, 255, 255)"] {
          background-color: ${CONFIG.targetColor} !important;
      }
      
      /* Handle CSS custom properties that might define white backgrounds */
      :root {
          --bg-white: ${CONFIG.targetColor} !important;
          --background-white: ${CONFIG.targetColor} !important;
          --color-bg-primary: ${CONFIG.targetColor} !important;
          --color-canvas-default: ${CONFIG.targetColor} !important;
      }
    `;

    document.head.appendChild(style);
    log('Global CSS injected');
  }

  function initialize(): void {
    log('Eye Guard Enhanced initializing...');

    // Inject global CSS first
    injectGlobalCSS();

    // Check if current site is in suggested aggressive sites
    const suggestedSites = [
      'dash.cloudflare.com', 'developers.cloudflare.com', 'docs.deno.com',
      'docs.sillytavern.app', 'sillytavern.app', 'uploadthing.com', 'gradio.app',
      'openwebui.com', 'reddit.com', 'langchain.com', 'hoppscotch.io',
      'reflex.dev', 'drizzle.team', 'chatgpt.com', 'docs.github.com',
      'gemini.google.com', 'aistudio.google.com', 'notion.so', 'linear.app',
      'vercel.com', 'supabase.com'
    ];
    
    const currentHostname = window.location.hostname;
    const isSuggestedSite = suggestedSites.some(site => 
      currentHostname === site || currentHostname.endsWith('.' + site)
    );
    
    const shouldUseAggressive = alwaysOnAggressiveMode || 
      aggressiveModeSites.some((site) => window.location.href.includes(site)) ||
      (autoAggressiveSites && isSuggestedSite);

    // Initial processing with appropriate mode
    setTimeout(() => processAllElements(shouldUseAggressive), 100);

    if (shouldUseAggressive) {
      console.log('AGGRESSIVE mode enabled - comprehensive processing with observers');
      setupMutationObserver(true);
      setupIntersectionObserver(true);
      setupURLChangeDetection(true);

      // Periodic reprocessing for stubborn elements
      setInterval(() => {
        log('Periodic aggressive reprocessing...');
        processAllElements(true);
      }, 10000);

      // Additional processing on various events
      ['load', 'DOMContentLoaded', 'resize', 'scroll'].forEach((eventType) => {
        window.addEventListener(eventType, () => {
          log(`${eventType} event triggered, aggressive reprocessing...`);
          setTimeout(() => processAllElements(true), 200);
        });
      });
    } else {
      console.log('REGULAR mode enabled - conservative processing, no observers');
      
      // Light event handling for regular mode
      ['load', 'DOMContentLoaded'].forEach((eventType) => {
        window.addEventListener(eventType, () => {
          log(`${eventType} event triggered, regular reprocessing...`);
          setTimeout(() => processAllElements(false), 200);
        });
      });
    }

    log('Eye Guard Enhanced initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
});