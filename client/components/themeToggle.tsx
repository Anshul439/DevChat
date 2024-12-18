// components/ThemeToggle.js
'use client';

import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <button onClick={toggleTheme} aria-label="Toggle theme">
      <Sun className={`h-5 w-5 ${theme === 'dark' ? 'block' : 'hidden'}`} />
      <Moon className={`h-5 w-5 ${theme === 'dark' ? 'hidden' : 'block'}`} />
    </button>
  );
};

export default ThemeToggle;
