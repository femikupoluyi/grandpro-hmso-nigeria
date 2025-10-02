import React, { useEffect, useRef } from 'react';

const RealTimeChart = ({ 
  data = [], 
  type = 'line', 
  color = '#3B82F6', 
  height = 100,
  showGrid = false,
  animate = true 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const actualHeight = canvas.height;
    
    // Find min and max values
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // Clear canvas
    ctx.clearRect(0, 0, width, actualHeight);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.1)';
      ctx.lineWidth = 1;
      
      // Horizontal lines
      for (let i = 0; i <= 4; i++) {
        const y = (actualHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical lines
      for (let i = 0; i <= 6; i++) {
        const x = (width / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, actualHeight);
        ctx.stroke();
      }
    }

    const drawChart = (progress = 1) => {
      ctx.clearRect(0, 0, width, actualHeight);

      if (showGrid) {
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
          const y = (actualHeight / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      if (type === 'line') {
        // Draw line chart
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, actualHeight);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');

        ctx.beginPath();
        const pointsToShow = Math.floor(data.length * progress);
        
        for (let i = 0; i < pointsToShow; i++) {
          const x = (width / (data.length - 1)) * i;
          const y = actualHeight - ((data[i].value - minValue) / range) * actualHeight * 0.9 - actualHeight * 0.05;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Draw the line
        ctx.stroke();

        // Fill area under the line
        if (pointsToShow > 0) {
          ctx.lineTo((width / (data.length - 1)) * (pointsToShow - 1), actualHeight);
          ctx.lineTo(0, actualHeight);
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Draw points
        ctx.fillStyle = color;
        for (let i = 0; i < pointsToShow; i++) {
          const x = (width / (data.length - 1)) * i;
          const y = actualHeight - ((data[i].value - minValue) / range) * actualHeight * 0.9 - actualHeight * 0.05;
          
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 'bar') {
        // Draw bar chart
        const barWidth = width / data.length * 0.8;
        const gap = width / data.length * 0.2;
        const pointsToShow = Math.floor(data.length * progress);

        for (let i = 0; i < pointsToShow; i++) {
          const x = i * (barWidth + gap) + gap / 2;
          const barHeight = ((data[i].value - minValue) / range) * actualHeight * 0.9;
          const y = actualHeight - barHeight - actualHeight * 0.05;

          // Create gradient for bars
          const gradient = ctx.createLinearGradient(0, y, 0, actualHeight);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, color + '80');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    };

    if (animate) {
      let start = null;
      const duration = 1000;

      const animateChart = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        drawChart(progress);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateChart);
        }
      };

      animationRef.current = requestAnimationFrame(animateChart);
    } else {
      drawChart(1);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, type, color, height, showGrid, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={height}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
};

export default RealTimeChart;
