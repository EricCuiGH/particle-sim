'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  brightness: number;
  trail: { x: number; y: number; alpha: number }[];
}

type EffectMode = 'gravity' | 'repulsion' | 'vortex' | 'wave' | 'flow' | 'attractor' | 'chaos' | 'aurora';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, down: false, vx: 0, vy: 0 });
  const timeRef = useRef(0);
  const fpsRef = useRef(60);
  const lastFrameTimeRef = useRef(Date.now());

  const [mode, setMode] = useState<EffectMode>('gravity');
  const [particleCount, setParticleCount] = useState(500);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showTrails, setShowTrails] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [bloom, setBloom] = useState(true);
  const [colorShift, setColorShift] = useState(0);
  const [turbulence, setTurbulence] = useState(0.5);
  const [interactionRadius, setInteractionRadius] = useState(150);

  // Initialize particles
  const initParticles = useCallback((count: number, canvas: HTMLCanvasElement) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        ax: 0,
        ay: 0,
        life: 1,
        maxLife: 1,
        size: Math.random() * 3 + 1,
        hue: Math.random() * 360,
        brightness: Math.random() * 50 + 50,
        trail: [],
      });
    }
    return particles;
  }, []);

  // Audio setup
  const setupAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength) as Uint8Array;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      setAudioEnabled(true);
    } catch (err) {
      console.error('Audio access denied:', err);
    }
  };

  // Physics and effects
  const applyForces = (particle: Particle, canvas: HTMLCanvasElement, audioData: number) => {
    const { x: mouseX, y: mouseY, down } = mouseRef.current;
    const dx = particle.x - mouseX;
    const dy = particle.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const time = timeRef.current;

    // Reset acceleration
    particle.ax = 0;
    particle.ay = 0;

    // Audio reactivity
    const audioForce = audioData / 255;

    switch (mode) {
      case 'gravity':
        particle.ay += 0.1 + audioForce * 0.5;
        if (down && dist < interactionRadius) {
          const force = (interactionRadius - dist) / interactionRadius;
          particle.ax -= (dx / dist) * force * 2;
          particle.ay -= (dy / dist) * force * 2;
        }
        break;

      case 'repulsion':
        if (dist < interactionRadius && dist > 0) {
          const force = (interactionRadius - dist) / interactionRadius;
          particle.ax += (dx / dist) * force * 3;
          particle.ay += (dy / dist) * force * 3;
        }
        particle.ax += (Math.random() - 0.5) * turbulence;
        particle.ay += (Math.random() - 0.5) * turbulence;
        break;

      case 'vortex':
        const angle = Math.atan2(dy, dx);
        const vortexStrength = 0.5 + audioForce;
        if (dist < interactionRadius * 2 && dist > 0) {
          particle.ax -= Math.cos(angle + Math.PI / 2) * vortexStrength;
          particle.ay -= Math.sin(angle + Math.PI / 2) * vortexStrength;
          particle.ax -= (dx / dist) * 0.1;
          particle.ay -= (dy / dist) * 0.1;
        }
        break;

      case 'wave':
        particle.ay += Math.sin(particle.x * 0.01 + time * 0.05) * 0.5;
        particle.ax += Math.cos(particle.y * 0.01 + time * 0.03) * 0.5;
        particle.ay += audioForce * Math.sin(time * 0.1);
        break;

      case 'flow':
        const noiseX = Math.sin(particle.x * 0.005 + time * 0.02) * Math.cos(particle.y * 0.003);
        const noiseY = Math.cos(particle.x * 0.003 + time * 0.01) * Math.sin(particle.y * 0.005);
        particle.ax += noiseX * 2;
        particle.ay += noiseY * 2;
        break;

      case 'attractor':
        const attractors = [
          { x: canvas.width * 0.25, y: canvas.height * 0.5 },
          { x: canvas.width * 0.75, y: canvas.height * 0.5 },
          { x: canvas.width * 0.5, y: canvas.height * 0.25 },
          { x: canvas.width * 0.5, y: canvas.height * 0.75 },
        ];
        attractors.forEach(attractor => {
          const adx = attractor.x - particle.x;
          const ady = attractor.y - particle.y;
          const adist = Math.sqrt(adx * adx + ady * ady);
          if (adist > 0) {
            const force = (500 / adist) * 0.1;
            particle.ax += (adx / adist) * force;
            particle.ay += (ady / adist) * force;
          }
        });
        break;

      case 'chaos':
        particle.ax += Math.sin(time * 0.1 + particle.x * 0.01) * 5;
        particle.ay += Math.cos(time * 0.15 + particle.y * 0.01) * 5;
        particle.ax += (Math.random() - 0.5) * audioForce * 10;
        particle.ay += (Math.random() - 0.5) * audioForce * 10;
        break;

      case 'aurora':
        const waveY = Math.sin(particle.x * 0.003 + time * 0.02) * 100 + canvas.height * 0.3;
        const distFromWave = particle.y - waveY;
        particle.ay += -distFromWave * 0.001;
        particle.ax += Math.cos(particle.y * 0.005 + time * 0.03) * 0.3;
        particle.ax += Math.sin(time * 0.05 + particle.x * 0.002) * audioForce * 2;
        break;
    }

    // Apply friction
    particle.vx *= 0.99;
    particle.vy *= 0.99;

    // Update velocity and position
    particle.vx += particle.ax;
    particle.vy += particle.ay;
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Boundary handling
    if (particle.x < 0) {
      particle.x = 0;
      particle.vx *= -0.5;
    } else if (particle.x > canvas.width) {
      particle.x = canvas.width;
      particle.vx *= -0.5;
    }
    if (particle.y < 0) {
      particle.y = 0;
      particle.vy *= -0.5;
    } else if (particle.y > canvas.height) {
      particle.y = canvas.height;
      particle.vy *= -0.5;
    }

    // Update trail
    if (showTrails) {
      particle.trail.push({ x: particle.x, y: particle.y, alpha: 1 });
      if (particle.trail.length > 10) {
        particle.trail.shift();
      }
      particle.trail.forEach((point, i) => {
        point.alpha *= 0.9;
      });
    }

    // Update color based on velocity
    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    particle.hue = (speed * 20 + colorShift + timeRef.current * 0.5) % 360;
    particle.brightness = Math.min(100, 50 + speed * 10 + audioForce * 50);
  };

  // Render function
  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Trails effect
    ctx.fillStyle = `rgba(0, 0, 5, ${showTrails ? 0.1 : 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get audio data
    let avgAudio = 0;
    if (audioEnabled && analyserRef.current && dataArrayRef.current) {
      // @ts-ignore - Type mismatch with Uint8Array but functionally correct
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      avgAudio = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
    }

    // Update and draw particles
    particlesRef.current.forEach(particle => {
      applyForces(particle, canvas, avgAudio);

      // Draw trail
      if (showTrails && particle.trail.length > 1) {
        ctx.beginPath();
        particle.trail.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.strokeStyle = `hsla(${particle.hue}, 100%, ${particle.brightness}%, ${0.3})`;
        ctx.lineWidth = particle.size * 0.5;
        ctx.stroke();
      }

      // Draw particle
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * (bloom ? 3 : 1)
      );
      gradient.addColorStop(0, `hsla(${particle.hue}, 100%, ${particle.brightness}%, 1)`);
      gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, ${particle.brightness}%, 0.5)`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 100%, ${particle.brightness}%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (bloom ? 3 : 1), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw audio spectrum
    if (audioEnabled && analyserRef.current && dataArrayRef.current) {
      // @ts-ignore - Type mismatch with Uint8Array but functionally correct
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const barWidth = canvas.width / dataArrayRef.current.length;
      const dataArray = dataArrayRef.current;
      dataArray.forEach((value, i) => {
        const height = (value / 255) * 100;
        const hue = (i / dataArray.length) * 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
        ctx.fillRect(i * barWidth, canvas.height - height, barWidth, height);
      });
    }

    // Draw interaction circle
    if (mouseRef.current.down) {
      ctx.beginPath();
      ctx.arc(mouseRef.current.x, mouseRef.current.y, interactionRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw stats
    if (showStats) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px monospace';
      ctx.fillText(`FPS: ${fpsRef.current.toFixed(1)}`, 10, 20);
      ctx.fillText(`Particles: ${particlesRef.current.length}`, 10, 35);
      ctx.fillText(`Mode: ${mode}`, 10, 50);
      if (audioEnabled) {
        ctx.fillText(`Audio: ${avgAudio.toFixed(1)}`, 10, 65);
      }
    }
  };

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate FPS
    const now = Date.now();
    const delta = now - lastFrameTimeRef.current;
    fpsRef.current = 1000 / delta;
    lastFrameTimeRef.current = now;

    timeRef.current += 0.016;

    render(ctx, canvas);
    animationRef.current = requestAnimationFrame(animate);
  }, [mode, showTrails, showStats, bloom, audioEnabled, colorShift, turbulence, interactionRadius]);

  // Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = initParticles(particleCount, canvas);

    // Mouse events
    const handleMouseMove = (e: MouseEvent) => {
      const prevX = mouseRef.current.x;
      const prevY = mouseRef.current.y;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.vx = e.clientX - prevX;
      mouseRef.current.vy = e.clientY - prevY;
    };

    const handleMouseDown = () => {
      mouseRef.current.down = true;
    };

    const handleMouseUp = () => {
      mouseRef.current.down = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Keyboard controls
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case '1': setMode('gravity'); break;
        case '2': setMode('repulsion'); break;
        case '3': setMode('vortex'); break;
        case '4': setMode('wave'); break;
        case '5': setMode('flow'); break;
        case '6': setMode('attractor'); break;
        case '7': setMode('chaos'); break;
        case '8': setMode('aurora'); break;
        case 't': setShowTrails(v => !v); break;
        case 's': setShowStats(v => !v); break;
        case 'b': setBloom(v => !v); break;
        case ' ': particlesRef.current = initParticles(particleCount, canvas); break;
      }
    };

    window.addEventListener('keypress', handleKeyPress);

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keypress', handleKeyPress);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, initParticles, particleCount]);

  // Update particle count
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    particlesRef.current = initParticles(particleCount, canvas);
  }, [particleCount, initParticles]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* Control Panel */}
      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md p-6 rounded-lg text-white max-w-sm space-y-4 border border-white/20">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Particle Playground
        </h2>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm block mb-2">Effect Mode</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as EffectMode)}
              className="w-full bg-white/10 p-2 rounded border border-white/20"
            >
              <option value="gravity">Gravity</option>
              <option value="repulsion">Repulsion</option>
              <option value="vortex">Vortex</option>
              <option value="wave">Wave</option>
              <option value="flow">Flow Field</option>
              <option value="attractor">Attractors</option>
              <option value="chaos">Chaos</option>
              <option value="aurora">Aurora</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-2">Particles: {particleCount}</label>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100"
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm block mb-2">Color Shift: {colorShift.toFixed(0)}</label>
            <input 
              type="range" 
              min="0" 
              max="360"
              value={colorShift}
              onChange={(e) => setColorShift(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm block mb-2">Turbulence: {turbulence.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1"
              value={turbulence}
              onChange={(e) => setTurbulence(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm block mb-2">Interaction Radius: {interactionRadius}</label>
            <input 
              type="range" 
              min="50" 
              max="400"
              value={interactionRadius}
              onChange={(e) => setInteractionRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              id="trails"
            />
            <label htmlFor="trails">Show Trails</label>
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={bloom}
              onChange={(e) => setBloom(e.target.checked)}
              id="bloom"
            />
            <label htmlFor="bloom">Bloom Effect</label>
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
              id="stats"
            />
            <label htmlFor="stats">Show Stats</label>
          </div>

          <button
            onClick={setupAudio}
            disabled={audioEnabled}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded font-semibold disabled:opacity-50 hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            {audioEnabled ? 'Audio Active' : 'Enable Audio'}
          </button>
        </div>

        <div className="text-xs text-white/60 space-y-1 border-t border-white/20 pt-4">
          <p><strong>Keyboard Shortcuts:</strong></p>
          <p>1-8: Switch modes</p>
          <p>T: Toggle trails</p>
          <p>B: Toggle bloom</p>
          <p>S: Toggle stats</p>
          <p>Space: Reset particles</p>
          <p><strong>Mouse:</strong> Click & drag to interact</p>
        </div>
      </div>

      {/* Mode Description */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md p-4 rounded-lg text-white max-w-md border border-white/20">
        <h3 className="font-bold mb-2">{mode.toUpperCase()} MODE</h3>
        <p className="text-sm text-white/80">
          {mode === 'gravity' && 'Particles fall with gravity. Click to repel particles away.'}
          {mode === 'repulsion' && 'Mouse creates a repulsion field. Particles scatter with turbulence.'}
          {mode === 'vortex' && 'Particles spiral around your cursor in a hypnotic vortex.'}
          {mode === 'wave' && 'Sine waves create flowing, undulating motion patterns.'}
          {mode === 'flow' && 'Perlin-noise-like flow fields guide particle movement.'}
          {mode === 'attractor' && 'Four attractors pull particles into orbital patterns.'}
          {mode === 'chaos' && 'Random forces create unpredictable, chaotic motion.'}
          {mode === 'aurora' && 'Particles mimic the flowing motion of aurora borealis.'}
        </p>
      </div>
    </div>
  );
}
