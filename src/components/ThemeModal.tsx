import React, { useState, useRef } from 'react';
import { useTheme, PRESET_THEMES } from '../context/ThemeContext';
import { 
  Palette, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Sun, 
  Moon, 
  Sliders,
  Trash2
} from 'lucide-react';

const SAMPLE_WALLPAPERS = [
  {
    name: 'Modern Tech Lab',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Cyber Circuit Glow',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Dark Geometric Slate',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Deep Blue Waves',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
  }
];

export const ThemeModal: React.FC = () => {
  const {
    theme,
    themeConfig,
    setTheme,
    setCustomWallpaper,
    setWallpaperDim,
    setWallpaperBlur,
    setUseWallpaper,
    resetTheme,
    isThemesModalOpen,
    closeThemesModal,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'themes' | 'wallpaper'>('themes');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Dark' | 'Vibrant' | 'Light'>('All');
  const [customUrl, setCustomUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isThemesModalOpen) return null;

  const filteredThemes = filterCategory === 'All'
    ? PRESET_THEMES
    : PRESET_THEMES.filter(t => t.category === filterCategory);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size is too large (maximum 5MB recommended).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomWallpaper(result);
        setUseWallpaper(true);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!customUrl.trim()) return;
    setCustomWallpaper(customUrl.trim());
    setUseWallpaper(true);
    setCustomUrl('');
  };

  const handleRemoveWallpaper = () => {
    setCustomWallpaper(null);
    setUseWallpaper(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] text-slate-100 my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-xl shadow-lg">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Stylish Themes &amp; Wallpaper</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Custom UI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personalize your AC R&amp;I dashboard styling or upload a custom background picture
              </p>
            </div>
          </div>
          <button
            onClick={closeThemesModal}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'themes'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preset Themes ({PRESET_THEMES.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('wallpaper')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === 'wallpaper'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Manual Picture &amp; Wallpaper</span>
              {themeConfig.useWallpaper && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          <button
            onClick={resetTheme}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition px-2 py-1 rounded hover:bg-slate-800"
            title="Reset theme and wallpaper to default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Default</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'themes' ? (
            <div>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-slate-400 font-medium">Filter:</span>
                {(['All', 'Dark', 'Vibrant', 'Light'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                      filterCategory === cat
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid of Preset Themes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredThemes.map(t => {
                  const isSelected = theme.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-slate-800/90 ring-2 ring-blue-500/50 shadow-xl'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div>
                        {/* Theme Gradient Header Bar */}
                        <div className={`h-10 w-full rounded-lg bg-gradient-to-r ${t.previewGradient} border border-slate-700/50 mb-3 flex items-center justify-between px-3 shadow-inner`}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.accentColor }} />
                            <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">{t.category}</span>
                          </div>
                          {isSelected && (
                            <span className="bg-blue-500 text-white p-1 rounded-full shadow">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white">{t.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {t.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-mono">Accent: <strong style={{ color: t.accentColor }}>{t.accentColor}</strong></span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTheme(t.id);
                          }}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? 'Applied' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Wallpaper & Manual Picture Section */
            <div className="space-y-5">
              {/* Active Wallpaper Preview & Status */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-xl border border-slate-700 bg-cover bg-center shrink-0 shadow-md relative overflow-hidden flex items-center justify-center bg-slate-800"
                    style={{
                      backgroundImage: themeConfig.customWallpaper ? `url(${themeConfig.customWallpaper})` : undefined,
                    }}
                  >
                    {!themeConfig.customWallpaper && (
                      <ImageIcon className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Custom Picture Status</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        themeConfig.useWallpaper && themeConfig.customWallpaper
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {themeConfig.useWallpaper && themeConfig.customWallpaper ? 'Active Wallpaper' : 'Disabled'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {themeConfig.customWallpaper
                        ? 'Custom background image applied with readable dark overlay.'
                        : 'No custom picture set. Upload an image below to personalize your workspace.'}
                    </p>
                  </div>
                </div>

                {themeConfig.customWallpaper && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseWallpaper(!themeConfig.useWallpaper)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        themeConfig.useWallpaper
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {themeConfig.useWallpaper ? 'Hide Wallpaper' : 'Show Wallpaper'}
                    </button>
                    <button
                      onClick={handleRemoveWallpaper}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                      title="Remove custom wallpaper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Manual Image Box */}
              <div className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 rounded-xl p-5 text-center bg-slate-950/30 transition">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />
                <div className="mx-auto w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-white">Upload Your Picture / Wallpaper</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  Select a photo from your computer (JPG, PNG, WebP up to 5MB). Automatically saved to your workspace.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File</span>
                </button>
                {uploadError && (
                  <p className="text-xs text-rose-400 font-medium mt-2">{uploadError}</p>
                )}
              </div>

              {/* Or Paste Direct Image URL */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>Or Enter Image URL:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/wallpaper.jpg"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={handleApplyUrl}
                    disabled={!customUrl.trim()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Set URL
                  </button>
                </div>
              </div>

              {/* Sample Preset Wallpapers */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">Quick Select Wallpaper Presets:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SAMPLE_WALLPAPERS.map((sample, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCustomWallpaper(sample.url);
                        setUseWallpaper(true);
                      }}
                      className="group relative h-20 rounded-lg overflow-hidden border border-slate-800 hover:border-emerald-500 cursor-pointer transition shadow-md"
                    >
                      <img
                        src={sample.url}
                        alt={sample.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 group-hover:bg-slate-950/40 flex items-end p-2 transition">
                        <span className="text-[10px] font-bold text-white drop-shadow truncate">
                          {sample.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sliders: Overlay Dim & Blur Controls */}
              {themeConfig.customWallpaper && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>Legibility &amp; Contrast Adjustments</span>
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                        <span>Background Dimming (Dark Overlay):</span>
                        <span className="font-mono font-bold text-blue-400">{themeConfig.wallpaperDim}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="85"
                        value={themeConfig.wallpaperDim}
                        onChange={(e) => setWallpaperDim(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">Higher dimming keeps text tables and inventory crystal clear.</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                        <span>Background Blur:</span>
                        <span className="font-mono font-bold text-emerald-400">{themeConfig.wallpaperBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={themeConfig.wallpaperBlur}
                        onChange={(e) => setWallpaperBlur(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">Smooth frosted blur makes UI cards pop with modern depth.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Active: <strong>{theme.name}</strong> {themeConfig.useWallpaper ? '• Custom Wallpaper Active' : ''}
          </span>
          <button
            onClick={closeThemesModal}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
