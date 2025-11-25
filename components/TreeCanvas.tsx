import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { TreeConfig } from '../types';

interface TreeCanvasProps {
  config: TreeConfig;
  triggerGrowth: number;
}

export interface TreeCanvasHandle {
  startRecording: () => void;
  stopRecording: () => void;
  takeSnapshot: () => void;
}

// Helper class to manage growing branches
class Branch {
  relativeAngle: number; // Angle relative to parent
  targetLength: number;
  width: number;
  depth: number;
  length: number = 0; // Current length (animation)
  finished: boolean = false;
  children: Branch[] = [];
  phaseOffset: number; // Random offset for wind variation

  constructor(relativeAngle: number, targetLength: number, width: number, depth: number) {
    this.relativeAngle = relativeAngle;
    this.targetLength = targetLength;
    this.width = width;
    this.depth = depth;
    this.phaseOffset = Math.random() * 10;
  }

  grow(speed: number): boolean {
    if (this.finished) return true;
    
    this.length += speed;
    if (this.length >= this.targetLength) {
      this.length = this.targetLength;
      this.finished = true;
      return true;
    }
    return false;
  }
}

const TreeCanvas = forwardRef<TreeCanvasHandle, TreeCanvasProps>(({ config, triggerGrowth }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const rootBranchRef = useRef<Branch | null>(null);
  const activeBranchesRef = useRef<Branch[]>([]);
  const timeRef = useRef<number>(0);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useImperativeHandle(ref, () => ({
    startRecording: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasAny = canvas as any;
      if (typeof canvasAny.captureStream !== 'function') {
        alert("Screen recording is not supported by this browser.");
        return;
      }

      const stream = canvasAny.captureStream(60); 
      
      const mimeTypes = [
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) {
        alert("No supported video recording format found in this browser.");
        return;
      }

      const options = { 
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000
      };

      try {
        const recorder = new MediaRecorder(stream, options);

        recordedChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const isMp4 = selectedMimeType.includes('mp4');
          const ext = isMp4 ? 'mp4' : 'webm';
          
          const blob = new Blob(recordedChunksRef.current, {
            type: selectedMimeType
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `arboreal-tree-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.error("Failed to start recording:", err);
        alert("Screen recording failed to start.");
      }
    },
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    },
    takeSnapshot: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `arboreal-snapshot-${Date.now()}.png`;
      a.href = url;
      a.click();
    }
  }));
  
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  const interpolateColor = useCallback((color1: string, color2: string, factor: number) => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r},${g},${b})`;
  }, []);

  const getPaletteColor = useCallback((palette: string[], t: number) => {
      if (!palette || palette.length === 0) return '#000000';
      if (palette.length === 1) return palette[0];

      let tProcessed = t % 2.0;
      if (tProcessed < 0) tProcessed += 2.0; 
      
      if (tProcessed > 1.0) {
        tProcessed = 2.0 - tProcessed;
      }
      
      const segmentCount = palette.length - 1;
      const indexFloat = tProcessed * segmentCount;
      let index = Math.floor(indexFloat);
      
      let segmentT = indexFloat - index;
      
      if (index >= segmentCount) {
        index = segmentCount - 1;
        segmentT = 1.0;
      }
      
      const idx1 = index;
      const idx2 = index + 1;

      const easedT = (1 - Math.cos(segmentT * Math.PI)) / 2;

      return interpolateColor(palette[idx1], palette[idx2], easedT);

  }, [interpolateColor]);

  // Leaf Drawing Logic
  const drawLeafShape = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: string, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    switch (shape) {
        case 'circle':
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            break;
        case 'oval':
            ctx.ellipse(0, 0, size * 1.5, size * 0.8, 0, 0, Math.PI * 2);
            break;
        case 'triangle':
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.8, size);
            ctx.lineTo(-size * 0.8, size);
            ctx.closePath();
            break;
        case 'diamond':
            ctx.moveTo(0, -size * 1.2);
            ctx.lineTo(size * 0.8, 0);
            ctx.lineTo(0, size * 1.2);
            ctx.lineTo(-size * 0.8, 0);
            ctx.closePath();
            break;
        case 'star':
             for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * size,
                           Math.sin((18 + i * 72) * Math.PI / 180) * size);
                ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (size * 0.5),
                           Math.sin((54 + i * 72) * Math.PI / 180) * (size * 0.5));
             }
             ctx.closePath();
            break;
        case 'heart':
            ctx.moveTo(0, size * 0.5);
            ctx.bezierCurveTo(size, -size * 0.5, size, -size * 1.2, 0, -size * 1.2);
            ctx.bezierCurveTo(-size, -size * 1.2, -size, -size * 0.5, 0, size * 0.5);
            break;
        default: // Fallback to circle
            ctx.arc(0, 0, size, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }, []);

  useEffect(() => {
    const root = new Branch(-Math.PI / 2, config.trunkLength, config.trunkWidth, 0);
    rootBranchRef.current = root;
    activeBranchesRef.current = [root];
    timeRef.current = 0;

  }, [triggerGrowth, config.trunkLength, config.trunkWidth]);

  const drawBranch = useCallback((
    ctx: CanvasRenderingContext2D, 
    branch: Branch, 
    startX: number, 
    startY: number, 
    parentAngle: number,
    time: number
  ) => {
    // 1. Calculate Wind Physics
    let currentAngle = parentAngle + branch.relativeAngle;

    if (branch.depth > 0) {
      const noise = Math.sin(time * config.windSpeed + branch.depth * 0.5 + branch.phaseOffset * config.windVariability);
      const sway = noise * config.windForce * (branch.depth / config.maxDepth); 
      const directionBias = config.windDirection * (branch.depth * 0.02);
      currentAngle += sway + directionBias;
    }

    // 2. Calculate End Point
    const endX = startX + Math.cos(currentAngle) * branch.length;
    const endY = startY + Math.sin(currentAngle) * branch.length;

    // 3. Draw Branch
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    
    // Calculate Branch Color
    const baseT = Math.min(branch.depth / config.maxDepth, 1);
    let colorT = baseT;
    if (config.colorShiftSpeed !== 0) {
        colorT = baseT - (time * config.colorShiftSpeed * 0.1); 
    }

    ctx.strokeStyle = getPaletteColor(config.palette, colorT);
    ctx.lineWidth = branch.width;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 4. Draw Leaf
    if (branch.finished && config.leafSize > 0 && branch.length > 0) {
       if (branch.depth > config.maxDepth * 0.6 || branch.children.length === 0) {
          const leafSwayX = Math.cos(time * config.windSpeed * 2 + branch.phaseOffset) * (config.leafSize * 0.2);
          const leafSwayY = Math.sin(time * config.windSpeed * 2 + branch.phaseOffset) * (config.leafSize * 0.2);
          
          // Calculate Leaf Color
          let leafColorT = baseT;
          if (config.leafColorShiftSpeed !== 0) {
              leafColorT = baseT - (time * config.leafColorShiftSpeed * 0.1);
          }
          const leafColor = getPaletteColor(config.leafPalette || ['#ff007f'], leafColorT);
          
          ctx.fillStyle = leafColor;
          // Align leaf with branch
          drawLeafShape(ctx, endX + leafSwayX, endY + leafSwayY, config.leafSize, config.leafShape, currentAngle + Math.PI/2);
       }
    }

    // 5. Recursively Draw Children
    for (const child of branch.children) {
      drawBranch(ctx, child, endX, endY, currentAngle, time);
    }

  }, [config, interpolateColor, getPaletteColor, drawLeafShape]);


  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    timeRef.current += 0.016; 

    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const newActiveBranches: Branch[] = [];
    let growingActivity = false;

    activeBranchesRef.current.forEach(b => {
      const grown = b.grow(config.growthSpeed);
      if (grown) {
        if (b.children.length === 0 && b.depth < config.maxDepth) {
             const getBranchAngleRad = () => {
                const min = Math.min(config.minBranchAngle, config.maxBranchAngle);
                const max = Math.max(config.minBranchAngle, config.maxBranchAngle);
                const angle = Math.random() * (max - min) + min;
                return (angle * Math.PI) / 180;
             }

             const getChildLength = (parentLen: number) => {
               let decay = config.lengthDecay;
               if (config.rogueChance > 0 && Math.random() < config.rogueChance) {
                 decay *= config.rogueStrength;
               }
               return parentLen * decay;
             };

             if (Math.random() < config.branchProbability) {
                const angleRad = getBranchAngleRad();
                const newLen = getChildLength(b.targetLength);
                const newWidth = Math.max(0.5, b.width * config.widthDecay);
                const child = new Branch(-angleRad, newLen, newWidth, b.depth + 1);
                b.children.push(child);
                newActiveBranches.push(child);
                growingActivity = true;
             }
             
             if (Math.random() < config.branchProbability) {
                const angleRad = getBranchAngleRad();
                const newLen = getChildLength(b.targetLength);
                const newWidth = Math.max(0.5, b.width * config.widthDecay);
                const child = new Branch(angleRad, newLen, newWidth, b.depth + 1);
                b.children.push(child);
                newActiveBranches.push(child);
                growingActivity = true;
             }
        }
      } else {
        newActiveBranches.push(b);
        growingActivity = true;
      }
    });
    activeBranchesRef.current = newActiveBranches;

    if (rootBranchRef.current) {
        drawBranch(ctx, rootBranchRef.current, canvas.width / 2, canvas.height, 0, timeRef.current);
    }

    requestRef.current = requestAnimationFrame(animate);

  }, [config, drawBranch]);


  useEffect(() => {
    const handleResize = () => {
        if(canvasRef.current) {
            const rawWidth = window.innerWidth;
            const rawHeight = window.innerHeight;
            canvasRef.current.width = rawWidth - (rawWidth % 4);
            canvasRef.current.height = rawHeight - (rawHeight % 4);
        }
    }
    window.addEventListener('resize', handleResize);
    handleResize(); 

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(animate);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);


  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full block touch-none select-none"
    />
  );
});

export default TreeCanvas;