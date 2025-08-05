import './styles.css';

document.addEventListener('DOMContentLoaded', () => {
  const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
  const resetColorButton = document.getElementById('resetColor') as HTMLButtonElement;
  const toggleExtension = document.getElementById('toggleExtension') as HTMLInputElement;

  const excludedSites = document.getElementById('excludedSites') as HTMLTextAreaElement;
  const saveSitesButton = document.getElementById('saveSites') as HTMLButtonElement;
  const addCurrentSiteButton = document.getElementById('addCurrentSite') as HTMLButtonElement;

  const aggressiveModeSites = document.getElementById('aggressiveModeSites') as HTMLTextAreaElement;
  const saveSitesAggressiveModeButton = document.getElementById('saveSitesAggressiveMode') as HTMLButtonElement;
  const addCurrentSiteAggressiveModeButton = document.getElementById('addCurrentSiteAggressiveMode') as HTMLButtonElement;

  const aggressiveModeToggle = document.getElementById('alwaysOnAggressiveMode') as HTMLInputElement;

  // New elements
  const colorPresets = document.querySelectorAll('.color-preset') as NodeListOf<HTMLButtonElement>;
  const sensitivitySlider = document.getElementById('sensitivitySlider') as HTMLInputElement;
  const sensitivityValue = document.getElementById('sensitivityValue') as HTMLSpanElement;
  const suggestedSitesEnabled = document.getElementById('suggestedSitesEnabled') as HTMLInputElement;
  const autoAggressiveSites = document.getElementById('autoAggressiveSites') as HTMLInputElement;
  const suggestedSiteNotification = document.getElementById('suggestedSiteNotification') as HTMLDivElement;
  const addToAggressiveFromSuggestion = document.getElementById('addToAggressiveFromSuggestion') as HTMLButtonElement;

  const status = document.getElementById('status') as HTMLParagraphElement;

  const darkModeToggle = document.getElementById('darkModeToggle');
  const darkModeIcon = document.getElementById('darkModeIcon');

  const statusTimeout = 2000;

  // Load dark mode setting
  chrome.storage.sync.get(['darkMode'], (data) => {
    const isDarkMode = data.darkMode ?? false;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      setDarkModeIcon(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkModeIcon(false);
    }
  });

  // Toggle dark mode
  darkModeToggle.addEventListener('click', () => {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    chrome.storage.sync.set({ darkMode: isDarkMode }, () => {
      setDarkModeIcon(isDarkMode);
    });
  });

  // Update the icon based on dark mode
  function setDarkModeIcon(isDarkMode) {
    darkModeIcon.innerHTML = isDarkMode
      ? '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />' // Moon Icon
      : `<circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />`; // Sun Icon
  }

  const DEFAULT_COLOR = '#cce8cf'; // Default seafoam green color

  chrome.storage.sync.get([
    'color', 'enabled', 'excludedSites', 'aggressiveModeSites', 'alwaysOnAggressiveMode',
    'sensitivity', 'suggestedSitesEnabled', 'autoAggressiveSites'
  ], (data) => {
    colorPicker.value = data.color || DEFAULT_COLOR;
    toggleExtension.checked = data.enabled ?? true;
    excludedSites.value = (data.excludedSites || []).join('\n');
    aggressiveModeSites.value = (data.aggressiveModeSites || []).join('\n');
    aggressiveModeToggle.checked = data.alwaysOnAggressiveMode ?? false;
    
    // New settings
    const sensitivity = data.sensitivity ?? 240;
    sensitivitySlider.value = sensitivity.toString();
    sensitivityValue.textContent = sensitivity.toString();
    suggestedSitesEnabled.checked = data.suggestedSitesEnabled ?? true;
    autoAggressiveSites.checked = data.autoAggressiveSites ?? false;
  });

  // Update the color
  colorPicker.addEventListener('input', () => {
    chrome.storage.sync.set({ color: colorPicker.value }, () => {
      status.textContent = 'Color updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  // Reset to default color
  resetColorButton.addEventListener('click', () => {
    chrome.storage.sync.set({ color: DEFAULT_COLOR }, () => {
      colorPicker.value = DEFAULT_COLOR;
      status.textContent = 'Color reset to default!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  toggleExtension.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggleExtension.checked }, () => {
      status.textContent = 'Extension enabled status updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  aggressiveModeToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ alwaysOnAggressiveMode: aggressiveModeToggle.checked }, () => {
      status.textContent = 'Aggressive mode updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  saveSitesButton.addEventListener('click', () => {
    const sites = excludedSites.value.split('\n').map((site) => site.trim()).filter(Boolean);
    chrome.storage.sync.set({ excludedSites: sites }, () => {
      status.textContent = 'Excluded sites updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  addCurrentSiteButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length || !tabs[0].url) return;

      const baseUrl = new URL(tabs[0].url).origin;
      chrome.storage.sync.get(['excludedSites'], (data) => {
        const sites = new Set(data.excludedSites || []);
        sites.add(baseUrl);
        chrome.storage.sync.set({ excludedSites: Array.from(sites) }, () => {
          excludedSites.value = Array.from(sites).join('\n');
          status.textContent = 'Current site added to ignore list!';
          setTimeout(() => (status.textContent = ''), statusTimeout);
        });
      });
    });
  });

  saveSitesAggressiveModeButton.addEventListener('click', () => {
    const sites = aggressiveModeSites.value.split('\n').map((site) => site.trim()).filter(Boolean);
    chrome.storage.sync.set({ aggressiveModeSites: sites }, () => {
      status.textContent = 'Aggressive mode sites updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  addCurrentSiteAggressiveModeButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length || !tabs[0].url) return;

      const baseUrl = new URL(tabs[0].url).origin;
      chrome.storage.sync.get(['aggressiveModeSites'], (data) => {
        const sites = new Set(data.aggressiveModeSites || []);
        sites.add(baseUrl);
        chrome.storage.sync.set({ aggressiveModeSites: Array.from(sites) }, () => {
          aggressiveModeSites.value = Array.from(sites).join('\n');
          status.textContent = 'Current site added to aggressive mode!';
          setTimeout(() => (status.textContent = ''), statusTimeout);
        });
      });
    });
  });

  // Color presets event listeners
  colorPresets.forEach((preset) => {
    preset.addEventListener('click', () => {
      const color = preset.getAttribute('data-color');
      if (color) {
        colorPicker.value = color;
        chrome.storage.sync.set({ color }, () => {
          status.textContent = `Color set to ${preset.getAttribute('data-name')}!`;
          setTimeout(() => (status.textContent = ''), statusTimeout);
        });
      }
    });
  });

  // Sensitivity slider event listener
  sensitivitySlider.addEventListener('input', () => {
    const sensitivity = parseInt(sensitivitySlider.value);
    sensitivityValue.textContent = sensitivity.toString();
    chrome.storage.sync.set({ sensitivity }, () => {
      status.textContent = 'Sensitivity updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  // Suggested sites toggles
  suggestedSitesEnabled.addEventListener('change', () => {
    chrome.storage.sync.set({ suggestedSitesEnabled: suggestedSitesEnabled.checked }, () => {
      status.textContent = 'Suggested sites setting updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  autoAggressiveSites.addEventListener('change', () => {
    chrome.storage.sync.set({ autoAggressiveSites: autoAggressiveSites.checked }, () => {
      status.textContent = 'Auto-aggressive mode setting updated!';
      setTimeout(() => (status.textContent = ''), statusTimeout);
    });
  });

  // Add to aggressive from suggestion
  addToAggressiveFromSuggestion.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'addCurrentToAggressive' }, (response) => {
      if (response.status === 'success') {
        aggressiveModeSites.value += (aggressiveModeSites.value ? '\n' : '') + response.site;
        suggestedSiteNotification.classList.add('hidden');
        status.textContent = 'Site added to aggressive mode!';
        setTimeout(() => (status.textContent = ''), statusTimeout);
      }
    });
  });

  // Check if current site is suggested and show notification
  function checkSuggestedSiteNotification() {
    chrome.runtime.sendMessage({ type: 'getSuggestedSiteStatus' }, (response) => {
      if (response.isSuggested) {
        chrome.storage.sync.get(['suggestedSitesEnabled', 'aggressiveModeSites'], (data) => {
          if (data.suggestedSitesEnabled) {
            const hostname = new URL(response.url).hostname;
            const aggressiveModeSites = data.aggressiveModeSites || [];
            const isAlreadyInAggressive = aggressiveModeSites.some((site: string) => 
              hostname.includes(site) || site.includes(hostname)
            );
            
            if (!isAlreadyInAggressive) {
              suggestedSiteNotification.classList.remove('hidden');
            }
          }
        });
      }
    });
  }

  // Check for suggested site notification on popup open
  checkSuggestedSiteNotification();
});
