import './styles.css';

document.addEventListener('DOMContentLoaded', () => {
  const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
  const resetColorButton = document.getElementById('resetColor') as HTMLButtonElement;
  const toggleExtension = document.getElementById('toggleExtension') as HTMLInputElement;
  const excludedSites = document.getElementById('excludedSites') as HTMLTextAreaElement;
  const saveSitesButton = document.getElementById('saveSites') as HTMLButtonElement;
  const addCurrentSiteButton = document.getElementById('addCurrentSite') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLParagraphElement;

  const darkModeToggle = document.getElementById('darkModeToggle');
  const darkModeIcon = document.getElementById('darkModeIcon');

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

  chrome.storage.sync.get(['color', 'enabled', 'excludedSites'], (data) => {
    colorPicker.value = data.color || DEFAULT_COLOR;
    toggleExtension.checked = data.enabled ?? true;
    excludedSites.value = (data.excludedSites || []).join('\n');
  });

  // Update the color
  colorPicker.addEventListener('input', () => {
    chrome.storage.sync.set({ color: colorPicker.value }, () => {
      status.textContent = 'Color updated!';
      setTimeout(() => (status.textContent = ''), 1000);
    });
  });

  // Reset to default color
  resetColorButton.addEventListener('click', () => {
    chrome.storage.sync.set({ color: DEFAULT_COLOR }, () => {
      colorPicker.value = DEFAULT_COLOR;
      status.textContent = 'Color reset to default!';
      setTimeout(() => (status.textContent = ''), 1000);
    });
  });

  toggleExtension.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggleExtension.checked }, () => {
      status.textContent = 'Extension enabled status updated!';
      setTimeout(() => (status.textContent = ''), 1000);
    });
  });

  saveSitesButton.addEventListener('click', () => {
    const sites = excludedSites.value.split('\n').map((site) => site.trim()).filter(Boolean);
    chrome.storage.sync.set({ excludedSites: sites }, () => {
      status.textContent = 'Excluded sites updated!';
      setTimeout(() => (status.textContent = ''), 1000);
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
          setTimeout(() => (status.textContent = ''), 1000);
        });
      });
    });
  });
});
