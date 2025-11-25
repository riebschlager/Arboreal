import React, { useState, useEffect, useRef } from 'react';
import { TreeConfig, SavedConfig } from '../types';
import { 
  RefreshCcw, Settings2, Wind, Video, Square, Camera, 
  ChevronDown, ChevronRight, Palette, Ruler, Sprout, Sparkles, Loader2,
  Plus, Trash2, Save, Download, Upload, FileJson, Library, Shapes, Wand2
} from 'lucide-react';
import { getSavedConfigs, saveConfig, deleteConfig, importConfigs, exportConfigToFile } from '../services/storageService';

interface ControlPanelProps {
  config: TreeConfig;
  setConfig: React.Dispatch<React.SetStateAction<TreeConfig>>;
  onRegrow: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  isRecording: boolean;
  onToggleRecord: () => void;
  onSnapshot: () => void;
}

// --- Reusable Sub-Components ---

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (val: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, suffix = "", onChange }) => (
  <div className="mb-2">
    <div className="flex justify-between text-[10px] text-gray-400 mb-1 select-none uppercase tracking-wider">
      <span>{label}</span>
      <span>{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
    />
  </div>
);

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between mb-2 select-none">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="relative overflow-hidden w-6 h-6 rounded-full border border-gray-600 shadow-sm hover:border-gray-400 transition-colors">
          <input 
              type="color" 
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 cursor-pointer border-0"
          />
      </div>
  </div>
);

interface PaletteEditorProps {
    label: string;
    colors: string[];
    onColorsChange: (colors: string[]) => void;
    shiftSpeed: number;
    onShiftSpeedChange: (speed: number) => void;
}

const PaletteEditor: React.FC<PaletteEditorProps> = ({ label, colors, onColorsChange, shiftSpeed, onShiftSpeedChange }) => {
    const handleAddColor = () => {
        const lastColor = colors[colors.length - 1] || '#ffffff';
        onColorsChange([...colors, lastColor]);
    };

    const handleRemoveColor = (index: number) => {
        if (colors.length <= 1) return;
        onColorsChange(colors.filter((_, i) => i !== index));
    };

    const handleColorChange = (index: number, color: string) => {
        const newPalette = [...colors];
        newPalette[index] = color;
        onColorsChange(newPalette);
    };

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
                <button 
                  onClick={handleAddColor}
                  className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <Plus size={14} />
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
                {colors.map((color, idx) => (
                  <div key={idx} className="relative group/color">
                    <div className="relative overflow-hidden w-8 h-8 rounded-full border border-gray-600 shadow-sm hover:border-gray-400 transition-colors">
                      <input 
                          type="color" 
                          value={color}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 cursor-pointer border-0"
                      />
                    </div>
                    {colors.length > 1 && (
                      <button 
                        onClick={() => handleRemoveColor(idx)}
                        className="absolute -top-1 -right-1 bg-black text-red-400 rounded-full p-0.5 opacity-0 group-hover/color:opacity-100 transition-opacity border border-white/20"
                      >
                        <Trash2 size={8} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
            <Slider label="Shift Speed" value={shiftSpeed} onChange={onShiftSpeedChange} min={0} max={5} step={0.1} />
        </div>
    );
}

interface CollapsibleSectionProps { 
  title: string; 
  id: string; 
  icon: React.ElementType; 
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode; 
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  id, 
  icon: Icon, 
  isExpanded,
  onToggle,
  children 
}) => {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2 text-gray-300 group-hover:text-emerald-400 transition-colors">
          <Icon size={14} />
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        </div>
        {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </button>
      {isExpanded && (
        <div className="pb-3 px-1 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  config, 
  setConfig, 
  onRegrow, 
  onGenerate,
  isGenerating,
  isRecording, 
  onToggleRecord,
  onSnapshot
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  
  // Changed from Record<string, boolean> to string | null for mutually exclusive accordion
  const [activeSection, setActiveSection] = useState<string | null>('structure');

  // Library State
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [saveName, setSaveName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedConfigs(getSavedConfigs());
    // Set default name
    const date = new Date();
    setSaveName(`Tree ${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours()}:${date.getMinutes()}`);
  }, []);

  const toggleSection = (id: string) => {
    // If clicking the currently open section, close it (null). Otherwise, open the new one.
    setActiveSection(prev => prev === id ? null : id);
  };

  const handleChange = (key: keyof TreeConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
      setSaveName(prompt.substring(0, 20) + (prompt.length > 20 ? '...' : ''));
    }
  };

  // --- Library Handlers ---

  const handleSaveConfig = () => {
    const newSaved = saveConfig(config, saveName);
    setSavedConfigs(newSaved);
    const date = new Date();
    setSaveName(`Tree ${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours()}:${date.getMinutes()}`);
  };

  const handleLoadConfig = (saved: SavedConfig) => {
    setConfig(saved.config);
    onRegrow();
  };

  const handleDeleteConfig = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = deleteConfig(id);
    setSavedConfigs(newSaved);
  };

  const handleExportConfig = (saved: SavedConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    exportConfigToFile(saved.config, saved.name);
  };
  
  const handleExportCurrent = () => {
      exportConfigToFile(config, saveName || 'current-tree-config');
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        
        let configToImport: TreeConfig | null = null;
        let nameToImport = file.name.replace('.json', '');

        if (parsed.palette && Array.isArray(parsed.palette)) {
            configToImport = parsed;
        } else if (parsed.config && parsed.config.palette) {
            configToImport = parsed.config;
            if (parsed.name) nameToImport = parsed.name;
        }

        if (configToImport) {
            const newSaved = importConfigs(configToImport, nameToImport);
            setSavedConfigs(newSaved);
            setConfig(configToImport);
            onRegrow();
            if(fileInputRef.current) fileInputRef.current.value = '';
        } else {
            alert("Invalid configuration file.");
        }
      } catch (err) {
        console.error("Import failed", err);
        alert("Failed to import configuration.");
      }
    };
    reader.readAsText(file);
  };


  if (!isOpen) {
      return (
          <button 
            onClick={() => setIsOpen(true)}
            className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md p-3 rounded-full text-white border border-white/10 shadow-lg hover:bg-emerald-600/80 transition-all z-50"
          >
              <Settings2 size={24} />
          </button>
      )
  }

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-black/80 backdrop-blur-md border-l border-white/10 shadow-2xl transition-transform duration-300 transform translate-x-0 z-50 flex flex-col">
      
      {/* Fixed Header & Actions */}
      <div className="flex-none p-5 pb-2 bg-black/20 border-b border-white/10 z-10">
        <div className="flex justify-between items-center mb-4 select-none">
          <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              Controls
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <Settings2 size={20} />
          </button>
        </div>

        {/* AI Input Section */}
        <form onSubmit={handleGenerateSubmit} className="mb-3 relative group">
          <div className="relative flex items-center bg-gray-900/50 rounded-lg border border-white/10 focus-within:border-emerald-500/50 transition-colors overflow-hidden">
            <div className="pl-3 text-emerald-500 flex-shrink-0">
              {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe a tree..."
              disabled={isGenerating}
              className="w-full bg-transparent text-white px-3 py-2 text-xs outline-none placeholder-gray-500"
            />
             <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="hidden group-focus-within:block absolute right-1 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium py-1 px-2 rounded transition-colors disabled:opacity-50"
            >
              Go
            </button>
          </div>
        </form>

        {/* Primary Actions Grid */}
        <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
                onClick={onRegrow}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-2 px-3 rounded-md font-medium text-xs transition-colors shadow-lg shadow-emerald-900/50 select-none"
            >
                <RefreshCcw size={14} />
                Regrow
            </button>
            <button 
                onClick={onSnapshot}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white py-2 px-3 rounded-md font-medium text-xs transition-colors shadow-lg select-none"
            >
                <Camera size={14} />
                Photo
            </button>
            <button 
                onClick={onToggleRecord}
                className={`col-span-2 flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium text-xs transition-colors shadow-lg select-none ${
                    isRecording 
                        ? 'bg-red-500/80 hover:bg-red-500 animate-pulse text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white'
                }`}
            >
                {isRecording ? <Square size={14} fill="currentColor" /> : <Video size={14} />}
                {isRecording ? "Stop Recording" : "Record Video"}
            </button>
        </div>
      </div>

      {/* Scrollable Settings */}
      <div className="flex-1 overflow-y-auto px-5 py-2 custom-scrollbar space-y-1">
        
        <CollapsibleSection
            title="Library & Exports"
            id="library"
            icon={Library}
            isExpanded={activeSection === 'library'}
            onToggle={toggleSection}
        >
            <div className="bg-white/5 rounded-lg p-2 space-y-3">
                {/* Save Current */}
                <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Save Current</div>
                    <div className="flex gap-1">
                        <input 
                            type="text" 
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-emerald-500/50 outline-none"
                        />
                        <button 
                            onClick={handleSaveConfig}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded transition-colors"
                            title="Save to Library"
                        >
                            <Save size={14} />
                        </button>
                        <button 
                            onClick={handleExportCurrent}
                            className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition-colors"
                            title="Export to JSON"
                        >
                            <FileJson size={14} />
                        </button>
                    </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* Import */}
                <div>
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json"
                        className="hidden" 
                    />
                     <button 
                        onClick={handleImportClick}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-1.5 px-3 rounded text-xs transition-colors"
                     >
                        <Upload size={12} />
                        Import JSON File
                     </button>
                </div>

                {/* Saved List */}
                {savedConfigs.length > 0 && (
                    <>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-2">Saved Configurations</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                            {savedConfigs.map(item => (
                                <div key={item.id} className="flex items-center justify-between group bg-black/20 hover:bg-white/10 rounded p-1.5 transition-colors cursor-pointer" onClick={() => handleLoadConfig(item)}>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate text-gray-300 group-hover:text-white">{item.name}</div>
                                        <div className="text-[10px] text-gray-600 truncate">{new Date(item.timestamp).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                                        <button 
                                            onClick={(e) => handleExportConfig(item, e)}
                                            className="p-1 hover:text-emerald-400 transition-colors"
                                            title="Export"
                                        >
                                            <Download size={12} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteConfig(item.id, e)}
                                            className="p-1 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </CollapsibleSection>
        
        <CollapsibleSection
            title="Post Processing"
            id="post"
            icon={Wand2}
            isExpanded={activeSection === 'post'}
            onToggle={toggleSection}
        >
            <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Bloom</label>
                        <input 
                            type="checkbox" 
                            checked={config.useBloom} 
                            onChange={(e) => handleChange('useBloom', e.target.checked)}
                            className="accent-emerald-500"
                        />
                    </div>
                    {config.useBloom && (
                        <>
                            <Slider label="Intensity" value={config.bloomIntensity} onChange={(v) => handleChange('bloomIntensity', v)} min={0} max={1} step={0.01} />
                            <Slider label="Radius" value={config.bloomRadius} onChange={(v) => handleChange('bloomRadius', v)} min={0} max={50} step={1} suffix="px" />
                        </>
                    )}
                </div>

                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Vignette</label>
                        <input 
                            type="checkbox" 
                            checked={config.useVignette} 
                            onChange={(e) => handleChange('useVignette', e.target.checked)}
                            className="accent-emerald-500"
                        />
                    </div>
                    {config.useVignette && (
                        <Slider label="Strength" value={config.vignetteStrength} onChange={(v) => handleChange('vignetteStrength', v)} min={0} max={1} step={0.01} />
                    )}
                </div>

                <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Film Grain</label>
                        <input 
                            type="checkbox" 
                            checked={config.useGrain} 
                            onChange={(e) => handleChange('useGrain', e.target.checked)}
                            className="accent-emerald-500"
                        />
                    </div>
                    {config.useGrain && (
                        <Slider label="Opacity" value={config.grainOpacity} onChange={(v) => handleChange('grainOpacity', v)} min={0} max={0.2} step={0.01} />
                    )}
                </div>
            </div>
        </CollapsibleSection>

        <CollapsibleSection 
          title="Structure" 
          id="structure" 
          icon={Ruler}
          isExpanded={activeSection === 'structure'}
          onToggle={toggleSection}
        >
            <Slider label="Trunk Length" value={config.trunkLength} onChange={(v) => handleChange('trunkLength', v)} min={50} max={300} step={5} />
            <Slider label="Trunk Width" value={config.trunkWidth} onChange={(v) => handleChange('trunkWidth', v)} min={2} max={50} step={1} />
            
            <div className="p-2 bg-white/5 rounded-md mb-2 border border-white/5">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Angle Range</h4>
                <Slider label="Min Angle" value={config.minBranchAngle} onChange={(v) => handleChange('minBranchAngle', v)} min={5} max={90} step={1} suffix="°" />
                <Slider label="Max Angle" value={config.maxBranchAngle} onChange={(v) => handleChange('maxBranchAngle', v)} min={5} max={90} step={1} suffix="°" />
            </div>
            
            <div className="p-2 bg-white/5 rounded-md mb-2 border border-white/5">
                <h4 className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-2 font-semibold">Rogue Branches</h4>
                <Slider label="Chance" value={config.rogueChance} onChange={(v) => handleChange('rogueChance', v)} min={0} max={0.5} step={0.01} />
                <Slider label="Strength" value={config.rogueStrength} onChange={(v) => handleChange('rogueStrength', v)} min={1.0} max={2.5} step={0.1} suffix="x" />
            </div>

            <Slider label="Length Decay" value={config.lengthDecay} onChange={(v) => handleChange('lengthDecay', v)} min={0.5} max={0.95} step={0.01} />
            <Slider label="Width Decay" value={config.widthDecay} onChange={(v) => handleChange('widthDecay', v)} min={0.5} max={0.95} step={0.01} />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Growth Rules" 
          id="growth" 
          icon={Sprout}
          isExpanded={activeSection === 'growth'}
          onToggle={toggleSection}
        >
            <Slider label="Branch Probability" value={config.branchProbability} onChange={(v) => handleChange('branchProbability', v)} min={0.7} max={1.0} step={0.01} />
            <Slider label="Max Depth" value={config.maxDepth} onChange={(v) => handleChange('maxDepth', v)} min={5} max={16} step={1} />
            <Slider label="Growth Speed" value={config.growthSpeed} onChange={(v) => handleChange('growthSpeed', v)} min={1} max={10} step={1} />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Wind & Physics" 
          id="wind" 
          icon={Wind}
          isExpanded={activeSection === 'wind'}
          onToggle={toggleSection}
        >
             <div className="p-2 bg-white/5 rounded-md border border-white/5">
                <Slider label="Force" value={config.windForce} onChange={(v) => handleChange('windForce', v)} min={0} max={0.2} step={0.001} />
                <Slider label="Speed" value={config.windSpeed} onChange={(v) => handleChange('windSpeed', v)} min={0.1} max={5} step={0.1} />
                <Slider label="Direction" value={config.windDirection} onChange={(v) => handleChange('windDirection', v)} min={-0.5} max={0.5} step={0.01} />
                <Slider label="Turbulence" value={config.windVariability} onChange={(v) => handleChange('windVariability', v)} min={0} max={1} step={0.01} />
            </div>
        </CollapsibleSection>

        <CollapsibleSection 
          title="Aesthetics" 
          id="style" 
          icon={Palette}
          isExpanded={activeSection === 'style'}
          onToggle={toggleSection}
        >
            <ColorPicker label="Background" value={config.backgroundColor} onChange={(v) => handleChange('backgroundColor', v)} />
            
            <PaletteEditor 
                label="Branch Palette" 
                colors={config.palette} 
                onColorsChange={(c) => handleChange('palette', c)}
                shiftSpeed={config.colorShiftSpeed}
                onShiftSpeedChange={(s) => handleChange('colorShiftSpeed', s)}
            />

            <div className="my-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                    <Shapes size={12} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Leaves</span>
                </div>
                
                <Slider label="Leaf Size" value={config.leafSize} onChange={(v) => handleChange('leafSize', v)} min={0} max={15} step={1} />
                
                <div className="mb-2">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Leaf Shape</label>
                    <select 
                        value={config.leafShape}
                        onChange={(e) => handleChange('leafShape', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-emerald-500/50 outline-none"
                    >
                        <option value="circle">Circle</option>
                        <option value="oval">Oval</option>
                        <option value="triangle">Triangle</option>
                        <option value="diamond">Diamond</option>
                        <option value="star">Star</option>
                        <option value="heart">Heart</option>
                    </select>
                </div>

                <PaletteEditor 
                    label="Leaf Palette" 
                    colors={config.leafPalette || ['#ff007f']} 
                    onColorsChange={(c) => handleChange('leafPalette', c)}
                    shiftSpeed={config.leafColorShiftSpeed || 0}
                    onShiftSpeedChange={(s) => handleChange('leafColorShiftSpeed', s)}
                />
            </div>
        </CollapsibleSection>

        {/* Padding for bottom scroll */}
        <div className="h-4"></div>
      </div>
    </div>
  );
};

export default ControlPanel;