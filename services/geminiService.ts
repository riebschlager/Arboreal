import { GoogleGenAI, Type } from "@google/genai";
import { TreeConfig, DEFAULT_CONFIG } from "../types";

export async function generateTreeTheme(prompt: string): Promise<Partial<TreeConfig>> {
  try {
    // Robust key retrieval to support various environment configurations (Vite, Netlify, etc.)
    const apiKey = 
      process.env.API_KEY || 
      process.env.GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_API_KEY || 
      (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("API Key not found. Please set API_KEY or GEMINI_API_KEY in your environment.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a configuration for a procedural fractal tree art piece based on this description: "${prompt}".
      
      Think about how the description translates to visual properties:
      - "Willow" might have low angles, long decay, and high wind force (droopy/swaying).
      - "Stormy" should have high wind speed and force.
      - "Stiff" or "Frozen" should have zero wind force.
      - "Cherry blossom" needs pink leaves (oval/circle) and dark wood, gentle breeze.
      - "Spooky" might be jagged (high angle), dark colors, no leaves, maybe high rogue chance for weird limbs.
      - "Cyberpunk" might use neon colors, black background, maybe diamond or star leaves.
      - "Wild", "Ancient" or "Organic" might have a large gap between min and max branch angles and higher rogue chance.
      - "Rainbow" or "Psychedelic" should have a multi-color palette and high color shift speed.
      
      Also consider Post-Processing:
      - "Neon", "Glowing", "Ethereal" -> High Bloom.
      - "Retro", "Old Photo" -> High Grain, Vignette.
      - "Clean", "Vector" -> No Bloom, No Grain.

      Return a JSON object matching the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trunkLength: { type: Type.NUMBER, description: "Initial trunk length (50-200)" },
            trunkWidth: { type: Type.NUMBER, description: "Initial trunk width (5-30)" },
            minBranchAngle: { type: Type.NUMBER, description: "Minimum branch angle in degrees (5-90)" },
            maxBranchAngle: { type: Type.NUMBER, description: "Maximum branch angle in degrees (min-90)" },
            lengthDecay: { type: Type.NUMBER, description: "0.5 to 0.95" },
            widthDecay: { type: Type.NUMBER, description: "0.5 to 0.95" },
            branchProbability: { type: Type.NUMBER, description: "0.7 to 1.0" },
            maxDepth: { type: Type.NUMBER, description: "8 to 14" },
            palette: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of 2-5 hex color codes forming the tree gradient"
            },
            colorShiftSpeed: { type: Type.NUMBER, description: "Speed of color cycling animation (0-5)" },
            backgroundColor: { type: Type.STRING, description: "Hex color code for canvas background" },
            
            leafShape: { 
                type: Type.STRING, 
                // Removed strict enum to prevent backend 500 errors. Validation handled in code.
                description: "Shape of the leaves. Preferred values: circle, oval, triangle, diamond, star, heart" 
            },
            leafSize: { type: Type.NUMBER, description: "Radius of leaves, 0 for none (0-10)" },
            leafPalette: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of 1-4 hex color codes for leaf gradient"
            },
            leafColorShiftSpeed: { type: Type.NUMBER, description: "Speed of leaf color cycling animation (0-5)" },
            
            growthSpeed: { type: Type.NUMBER, description: "Animation speed (1-10)" },
            windSpeed: { type: Type.NUMBER, description: "Animation speed (0.1 - 5.0)" },
            windForce: { type: Type.NUMBER, description: "Sway strength (0.0 - 0.15)" },
            windDirection: { type: Type.NUMBER, description: "Bias -0.5 (left) to 0.5 (right)" },
            windVariability: { type: Type.NUMBER, description: "Turbulence (0.0 - 1.0)" },
            rogueChance: { type: Type.NUMBER, description: "Probability of abnormal branch length (0.0 - 0.5)" },
            rogueStrength: { type: Type.NUMBER, description: "Multiplier for abnormal branches (1.0 - 2.5)" },

            useBloom: { type: Type.BOOLEAN },
            bloomRadius: { type: Type.NUMBER, description: "10-50" },
            bloomIntensity: { type: Type.NUMBER, description: "0.1-0.8" },
            useVignette: { type: Type.BOOLEAN },
            vignetteStrength: { type: Type.NUMBER, description: "0.1-0.8" },
            useGrain: { type: Type.BOOLEAN },
            grainOpacity: { type: Type.NUMBER, description: "0.01-0.15" },
          },
          required: ["palette", "backgroundColor", "minBranchAngle", "maxBranchAngle"],
        },
      },
    });

    const text = response.text;
    if (!text) return DEFAULT_CONFIG;

    const parsed = JSON.parse(text);

    // Client-side validation for leafShape since we removed strict enum from schema
    const validShapes = ["circle", "oval", "triangle", "diamond", "star", "heart"];
    if (parsed.leafShape && !validShapes.includes(parsed.leafShape)) {
      parsed.leafShape = "oval"; // Fallback
    }

    return { ...DEFAULT_CONFIG, ...parsed };

  } catch (error) {
    console.error("Failed to generate theme:", error);
    throw error;
  }
}