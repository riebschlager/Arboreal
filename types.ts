export interface TreeConfig {
  trunkLength: number;
  trunkWidth: number;
  minBranchAngle: number;  // Minimum degrees deviation
  maxBranchAngle: number;  // Maximum degrees deviation
  lengthDecay: number;     // Multiplier for child length (0.5 - 0.99)
  widthDecay: number;      // Multiplier for child width (0.5 - 0.99)
  branchProbability: number; // 0.0 - 1.0 chance to spawn a branch
  maxDepth: number;        // Recursion limit
  
  palette: string[];       // Array of hex colors for the gradient
  colorShiftSpeed: number; // Speed of color cycling
  
  backgroundColor: string; // Hex background
  
  leafShape: 'circle' | 'oval' | 'triangle' | 'diamond' | 'star' | 'heart';
  leafSize: number;        // 0 for no leaves
  leafPalette: string[];   // Array of hex colors for leaf gradient
  leafColorShiftSpeed: number; 
  growthSpeed: number;     // Animation speed
  
  // Rogue / Variance
  rogueChance: number;     // 0.0 - 1.0 chance a branch ignores decay
  rogueStrength: number;   // 1.0 - 3.0 multiplier for rogue branch length

  // Wind / Animation
  windSpeed: number;       // Speed of oscillation
  windForce: number;       // Magnitude of the sway
  windDirection: number;   // -1 (Left) to 1 (Right) bias
  windVariability: number; // Randomness factor in the wave
}

export interface SavedConfig {
  id: string;
  name: string;
  timestamp: number;
  config: TreeConfig;
}

export const DEFAULT_CONFIG: TreeConfig = {
  trunkLength: 120,
  trunkWidth: 12,
  minBranchAngle: 20,
  maxBranchAngle: 50,
  lengthDecay: 0.8,
  widthDecay: 0.7,
  branchProbability: 0.95,
  maxDepth: 12,
  
  palette: ["#4a3728", "#8b5a2b", "#2ecc71", "#27ae60"],
  colorShiftSpeed: 0,
  
  backgroundColor: "#111827",
  
  leafShape: 'oval',
  leafSize: 0,
  leafPalette: ["#ff007f", "#ff55a3"],
  leafColorShiftSpeed: 0,
  
  growthSpeed: 2,
  
  rogueChance: 0.0,
  rogueStrength: 1.5,

  windSpeed: 1.0,
  windForce: 0.0, // Start still
  windDirection: 0.2,
  windVariability: 0.5,
};