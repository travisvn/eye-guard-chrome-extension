chrome.storage.sync.get(['color', 'enabled', 'excludedSites'], (data) => {
  const userColor = data.color || '#cce8cf';
  const isEnabled = data.enabled ?? true;
  const excludedSites: string[] = data.excludedSites || [];

  if (!isEnabled || excludedSites.some((site) => window.location.href.includes(site))) {
    console.log('Eye Guard is disabled or this site is excluded.');
    return;
  }

  function getRGBValues(str: string): number[] {
    return str.substring(str.indexOf("(") + 1, str.length - 1).split(", ").map(Number);
  }

  function checkRGB(first: number[], second: number[]): boolean {
    return first.every((val, i) => val >= second[i]);
  }

  function setElementStyle(elem: HTMLElement): void {
    elem.style.backgroundColor = userColor;
  }

  function changeBackgroundColor(elem: HTMLElement): void {
    const backgroundColor = window.getComputedStyle(elem).getPropertyValue("background-color");
    if (backgroundColor !== "transparent") {
      const currentRGB = getRGBValues(backgroundColor);
      const maxWhiteRGB = [240, 240, 240];
      if (checkRGB(currentRGB, maxWhiteRGB)) {
        setElementStyle(elem);
      }
    }
  }

  function runner(): void {
    const elementsToModify = ["html", "body", "div", "main", "article"];
    const allElements = document.getElementsByTagName("*");
    [...allElements].forEach((elem) => {
      if (elementsToModify.includes(elem.localName)) {
        changeBackgroundColor(elem as HTMLElement);
      }
    });
  }

  runner();
});
