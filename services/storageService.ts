import { TreeConfig, SavedConfig } from '../types';

const STORAGE_KEY = 'arboreal_configs';

export const getSavedConfigs = (): SavedConfig[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load configs", e);
    return [];
  }
};

export const saveConfig = (config: TreeConfig, name: string): SavedConfig[] => {
  const current = getSavedConfigs();
  const newSave: SavedConfig = {
    id: crypto.randomUUID(),
    name: name || `Tree ${new Date().toLocaleString()}`,
    timestamp: Date.now(),
    config: { ...config } // Deep copy
  };
  const updated = [newSave, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteConfig = (id: string): SavedConfig[] => {
  const current = getSavedConfigs();
  const updated = current.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const importConfigs = (config: TreeConfig, name: string): SavedConfig[] => {
    return saveConfig(config, name);
};

export const exportConfigToFile = (config: TreeConfig, name: string) => {
    // We export a clean structure
    const exportData = {
        name: name,
        exportedAt: new Date().toISOString(),
        config: config
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
};