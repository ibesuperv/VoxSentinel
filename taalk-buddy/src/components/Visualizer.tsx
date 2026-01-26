
import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current || !isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Calculate a centered bar height
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // Multi-color psychological gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1'); // Indigo
        gradient.addColorStop(0.5, '#fb7185'); // Rose
        gradient.addColorStop(1, '#f59e0b'); // Amber

        ctx.fillStyle = gradient;
        
        // Draw bars with rounded ends (capsule style)
        const radius = barWidth / 2;
        const y = (canvas.height - barHeight) / 2; // Center vertically
        
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, radius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
        }

        x += barWidth + 4;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyser, isRecording]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={150} 
      className="w-full h-24 pointer-events-none opacity-80"
    />
  );
};

export default Visualizer;
