import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface GeminiInputProps {
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

const GeminiInput: React.FC<GeminiInputProps> = ({ onGenerate, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 z-10 w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-gray-900 rounded-xl p-1.5 border border-white/10 shadow-2xl">
          <div className="pl-3 text-pink-500">
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a tree (e.g., 'Neon Cyberpunk Bonsai')"
            disabled={isGenerating}
            className="w-full bg-transparent text-white px-3 py-2 outline-none placeholder-gray-500 text-sm"
          />
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeminiInput;