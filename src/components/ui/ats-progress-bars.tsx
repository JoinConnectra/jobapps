"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface ATSProgressBarProps {
  label: string;
  score: number;
  color: string;
  delay?: number;
}

function ATSProgressBar({ label, score, color, delay = 0 }: ATSProgressBarProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation when component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    // Animate the percentage number
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = score / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const newScore = Math.min(Math.round(increment * currentStep), score);
      setDisplayScore(newScore);

      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayScore(score);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isVisible, score]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-semibold">{displayScore}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={isVisible ? { width: `${score}%` } : { width: "0%" }}
          transition={{
            duration: 1.5,
            delay: delay / 1000,
            ease: "easeOut",
          }}
        />
      </div>
    </div>
  );
}

export function ATSProgressBars() {
  const items = [
    { label: "Skills Match", score: 92, color: "#386641" },
    { label: "Experience", score: 85, color: "#124559" },
    { label: "Education", score: 78, color: "#9e2a2b" },
    { label: "Overall Match", score: 88, color: "#3d6a4a" },
  ];

  return (
    <div className="space-y-3 p-4">
      {items.map((item, idx) => (
        <ATSProgressBar
          key={idx}
          label={item.label}
          score={item.score}
          color={item.color}
          delay={idx * 150} // Stagger the animations
        />
      ))}
    </div>
  );
}

