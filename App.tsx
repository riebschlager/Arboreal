import React, { useState, useCallback, useRef, useEffect } from 'react';
import TreeCanvas, { TreeCanvasHandle } from './components/TreeCanvas';
import ControlPanel from './components/ControlPanel';
import { TreeConfig, DEFAULT_CONFIG } from './types';
import { generateTreeTheme } from './services/geminiService';
import { Leaf } from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<TreeConfig>(DEFAULT_CONFIG);
  const [growthTrigger, setGrowthTrigger] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const treeCanvasRef = useRef<TreeCanvasHandle>(null);

  const handleRegrow = useCallback(() => {
    setGrowthTrigger(prev => prev + 1);
  }, []);

  const handleAiGenerate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const newConfig = await generateTreeTheme(prompt);
      setConfig(prev => ({
        ...prev,
        ...newConfig
      }));
      setGrowthTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error applying theme", error);
      alert("Failed to generate theme. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleRecord = useCallback(() => {
    if (!treeCanvasRef.current) return;

    if (isRecording) {
      treeCanvasRef.current.stopRecording();
      setIsRecording(false);
    } else {
      treeCanvasRef.current.startRecording();
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleSnapshot = useCallback(() => {
    if (treeCanvasRef.current) {
      treeCanvasRef.current.takeSnapshot();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.code === 'Space' && !isInput) {
        e.preventDefault(); // Prevent scrolling
        handleRegrow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRegrow]);

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      {/* Background Canvas */}
      <TreeCanvas 
        ref={treeCanvasRef}
        config={config} 
        triggerGrowth={growthTrigger} 
      />

      {/* Header / Branding */}
      <div className="absolute top-6 left-6 pointer-events-none z-10 select-none">
        <div className="flex items-center gap-2 text-white/90">
            <div className="bg-emerald-500/20 p-2 rounded-lg backdrop-blur-sm border border-emerald-500/30">
                <Leaf size={24} className="text-emerald-400" />
            </div>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Arboreal AI</h1>
                <p className="text-xs text-emerald-400/80 font-mono tracking-wider">GENERATIVE SYSTEM</p>
            </div>
        </div>
      </div>

      {/* Manual Controls & AI Input */}
      <ControlPanel 
        config={config} 
        setConfig={setConfig} 
        onRegrow={handleRegrow}
        onGenerate={handleAiGenerate}
        isGenerating={isGenerating}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        onSnapshot={handleSnapshot}
      />
    </div>
  );
};

export default App;