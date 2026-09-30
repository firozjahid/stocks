import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppTheme {
  id: string;
  name: string;
  category: 'Dark' | 'Light' | 'Vibrant';
  description: string;
  previewGradient: string;
  accentColor: string;
  bgClass: string;
  sidebarClass: string;
  headerClass: string;
  cardClass: string;
  textPrimary: string;
  textSecondary: string;
  borderClass: string;
}

export const PRESET_THEMES: AppTheme[] = [
  {
    id: 'walton-pro',
    name: 'Walton Corporate Slate',
    category: 'Dark',
    description: 'Original high-contrast Walton enterprise navy & slate finish',
    previewGradient: 'from-slate-900 via-slate-800 to-blue-950',
    accentColor: '#2563eb',
    bgClass: 'bg-slate-950 text-slate-100',
    sidebarClass: 'bg-slate-900/95 border-slate-800',
    headerClass: 'bg-slate-900/95 border-slate-800',
    cardClass: 'bg-slate-900/80 border-slate-800 text-slate-100 shadow-lg',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-400',
    borderClass: 'border-slate-800',
  },
  {
    id: 'emerald-matrix',
    name: 'Cyber Emerald Pro',
    category: 'Vibrant',
    description: 'High-tech matrix green & deep charcoal for precision engineering',
    previewGradient: 'from-zinc-950 via-emerald-950 to-zinc-900',
    accentColor: '#10b981',
    bgClass: 'bg-zinc-950 text-emerald-50',
    sidebarClass: 'bg-zinc-900/95 border-emerald-900/50',
    headerClass: 'bg-zinc-900/95 border-emerald-900/50',
    cardClass: 'bg-zinc-900/85 border-emerald-900/40 text-emerald-50 shadow-xl',
    textPrimary: 'text-emerald-300',
    textSecondary: 'text-emerald-600/80',
    borderClass: 'border-emerald-800/40',
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Glow',
    category: 'Vibrant',
    description: 'OLED obsidian black with electric cyan and neon violet luminescence',
    previewGradient: 'from-black via-purple-950 to-cyan-950',
    accentColor: '#06b6d4',
    bgClass: 'bg-black text-cyan-50',
    sidebarClass: 'bg-slate-950/95 border-cyan-800/40',
    headerClass: 'bg-slate-950/95 border-cyan-800/40',
    cardClass: 'bg-zinc-950/90 border-cyan-500/30 text-cyan-50 shadow-cyan-950/50 shadow-2xl',
    textPrimary: 'text-cyan-300',
    textSecondary: 'text-cyan-600/70',
    borderClass: 'border-cyan-800/50',
  },
  {
    id: 'royal-sapphire',
    name: 'Midnight Sapphire',
    category: 'Dark',
    description: 'Deep royal blue with crisp crystal highlights & platinum trims',
    previewGradient: 'from-blue-950 via-indigo-950 to-slate-950',
    accentColor: '#3b82f6',
    bgClass: 'bg-slate-950 text-blue-50',
    sidebarClass: 'bg-blue-950/90 border-blue-900/50',
    headerClass: 'bg-blue-950/90 border-blue-900/50',
    cardClass: 'bg-slate-900/85 border-blue-800/40 text-blue-50 shadow-xl',
    textPrimary: 'text-blue-200',
    textSecondary: 'text-blue-400/80',
    borderClass: 'border-blue-900/40',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber & Coral',
    category: 'Vibrant',
    description: 'Warm obsidian and amber glow for comfortable low-strain viewing',
    previewGradient: 'from-zinc-950 via-stone-900 to-amber-950',
    accentColor: '#f59e0b',
    bgClass: 'bg-stone-950 text-amber-50',
    sidebarClass: 'bg-stone-900/95 border-amber-900/40',
    headerClass: 'bg-stone-900/95 border-amber-900/40',
    cardClass: 'bg-stone-900/85 border-amber-900/40 text-amber-50 shadow-xl',
    textPrimary: 'text-amber-300',
    textSecondary: 'text-amber-500/70',
    borderClass: 'border-amber-800/40',
  },
  {
    id: 'carbon-stealth',
    name: 'Stealth Carbon Titanium',
    category: 'Dark',
    description: 'Pure matte black industrial carbon with brushed titanium and gold accents',
    previewGradient: 'from-neutral-950 via-neutral-900 to-black',
    accentColor: '#eab308',
    bgClass: 'bg-neutral-950 text-neutral-100',
    sidebarClass: 'bg-neutral-900/95 border-neutral-800',
    headerClass: 'bg-neutral-900/95 border-neutral-800',
    cardClass: 'bg-neutral-900/90 border-neutral-800 text-neutral-100 shadow-2xl',
    textPrimary: 'text-neutral-200',
    textSecondary: 'text-neutral-400',
    borderClass: 'border-neutral-800',
  },
  {
    id: 'amethyst-violet',
    name: 'Amethyst Velvet Dream',
    category: 'Vibrant',
    description: 'Deep royal violet with lavender borders and glowing purple badges',
    previewGradient: 'from-purple-950 via-fuchsia-950 to-neutral-950',
    accentColor: '#a855f7',
    bgClass: 'bg-neutral-950 text-purple-50',
    sidebarClass: 'bg-purple-950/90 border-purple-900/50',
    headerClass: 'bg-purple-950/90 border-purple-900/50',
    cardClass: 'bg-neutral-900/85 border-purple-800/40 text-purple-50 shadow-xl',
    textPrimary: 'text-purple-300',
    textSecondary: 'text-purple-400/80',
    borderClass: 'border-purple-900/40',
  },
  {
    id: 'crisp-light',
    name: 'Modern Ultra-Clean Light',
    category: 'Light',
    description: 'Crisp, high-clarity daylight theme with subtle frosted slate panels',
    previewGradient: 'from-slate-100 via-white to-slate-200',
    accentColor: '#2563eb',
    bgClass: 'bg-slate-100 text-slate-900',
    sidebarClass: 'bg-white border-slate-200 shadow-sm',
    headerClass: 'bg-white border-slate-200 shadow-sm',
    cardClass: 'bg-white border-slate-200 text-slate-900 shadow-sm',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-500',
    borderClass: 'border-slate-200',
  }
];

export interface ThemeConfig {
  currentThemeId: string;
  customWallpaper: string | null;
  wallpaperDim: number; // 0 to 90 (% overlay darkness)
  wallpaperBlur: number; // 0 to 20 (px)
  useWallpaper: boolean;
}

const DEFAULT_CONFIG: ThemeConfig = {
  currentThemeId: 'walton-pro',
  customWallpaper: null,
  wallpaperDim: 40,
  wallpaperBlur: 3,
  useWallpaper: false,
};

interface ThemeContextType {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (themeId: string) => void;
  setCustomWallpaper: (dataUrl: string | null) => void;
  setWallpaperDim: (dim: number) => void;
  setWallpaperBlur: (blur: number) => void;
  setUseWallpaper: (enabled: boolean) => void;
  resetTheme: () => void;
  isThemesModalOpen: boolean;
  openThemesModal: () => void;
  closeThemesModal: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('acri_theme_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_CONFIG;
  });

  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('acri_theme_config', JSON.stringify(themeConfig));
    } catch (e) {}
  }, [themeConfig]);

  const currentTheme = PRESET_THEMES.find(t => t.id === themeConfig.currentThemeId) || PRESET_THEMES[0];

  const setTheme = (themeId: string) => {
    setThemeConfig(prev => ({ ...prev, currentThemeId: themeId }));
  };

  const setCustomWallpaper = (dataUrl: string | null) => {
    setThemeConfig(prev => ({
      ...prev,
      customWallpaper: dataUrl,
      useWallpaper: !!dataUrl,
    }));
  };

  const setWallpaperDim = (dim: number) => {
    setThemeConfig(prev => ({ ...prev, wallpaperDim: dim }));
  };

  const setWallpaperBlur = (blur: number) => {
    setThemeConfig(prev => ({ ...prev, wallpaperBlur: blur }));
  };

  const setUseWallpaper = (enabled: boolean) => {
    setThemeConfig(prev => ({ ...prev, useWallpaper: enabled }));
  };

  const resetTheme = () => {
    setThemeConfig(DEFAULT_CONFIG);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeConfig,
        setTheme,
        setCustomWallpaper,
        setWallpaperDim,
        setWallpaperBlur,
        setUseWallpaper,
        resetTheme,
        isThemesModalOpen,
        openThemesModal: () => setIsThemesModalOpen(true),
        closeThemesModal: () => setIsThemesModalOpen(false),
      }}
    >
      {/* Background Wallpaper Container */}
      {themeConfig.useWallpaper && themeConfig.customWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-all duration-700 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${themeConfig.customWallpaper})`,
            filter: `blur(${themeConfig.wallpaperBlur}px)`,
            transform: 'scale(1.05)', // Prevent blur edge cutoff
          }}
        >
          {/* Dim Overlay */}
          <div
            className="absolute inset-0 bg-slate-950 transition-opacity duration-300"
            style={{ opacity: themeConfig.wallpaperDim / 100 }}
          />
        </div>
      )}
      <div className="relative z-10 flex flex-col h-full w-full">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
