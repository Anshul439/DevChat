export const themeScript = `
  (function () {
    // Retrieve the stored theme from localStorage
    let preferredTheme;
    try {
      const stored = localStorage.getItem('theme-storage');
      if (stored) {
        preferredTheme = JSON.parse(stored)?.state?.theme;
      }
    } catch (e) {
      console.warn('Failed to access localStorage:', e);
    }

    // Fallback to system preference if no stored theme is found
    function getTheme() {
      return preferredTheme || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    // Apply the theme
    const theme = getTheme();
    document.documentElement.classList.add(theme);
    document.documentElement.style.setProperty('color-scheme', theme);

    // Store the applied theme in localStorage if not already stored
    if (!preferredTheme) {
      try {
        localStorage.setItem('theme-storage', JSON.stringify({ state: { theme } }));
      } catch (e) {
        console.warn('Failed to store theme in localStorage:', e);
      }
    }
  })();
`;
