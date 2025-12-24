'use client';

import { useEffect, useState } from 'react';

// Check if we're in the holiday window (Dec 24 - Dec 31)
function isHolidayWeek(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed, so December is 11
  const day = now.getDate();

  // December 24-31
  return month === 11 && day >= 24 && day <= 31;
}

interface Snowflake {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function HolidayDecorator() {
  const [showHoliday, setShowHoliday] = useState(false);
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    const isHoliday = isHolidayWeek();
    setShowHoliday(isHoliday);

    if (isHoliday) {
      // Generate snowflakes
      const flakes: Snowflake[] = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 5 + Math.random() * 10,
        size: 0.5 + Math.random() * 1,
      }));
      setSnowflakes(flakes);
    }
  }, []);

  if (!showHoliday) return null;

  return (
    <>
      {/* Snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="snowflake absolute"
            style={{
              left: `${flake.left}%`,
              animationDelay: `${flake.delay}s`,
              animationDuration: `${flake.duration}s`,
              fontSize: `${flake.size}rem`,
              opacity: 0.7,
            }}
          >
            *
          </div>
        ))}
      </div>
    </>
  );
}

// Christmas hat component to be used on logos/icons
export function ChristmasHat({ className = '' }: { className?: string }) {
  const [showHat, setShowHat] = useState(false);

  useEffect(() => {
    setShowHat(isHolidayWeek());
  }, []);

  if (!showHat) return null;

  return (
    <span
      className={`christmas-hat ${className}`}
      role="img"
      aria-label="Christmas hat"
    >
      🎅
    </span>
  );
}

// Festive banner for the holiday week
export function HolidayBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(isHolidayWeek());
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-red-600 via-green-600 to-red-600 text-white text-center py-2 px-4 text-sm font-medium animate-pulse">
      <span className="mr-2">🎄</span>
      Happy Holidays! May your citations always be verified.
      <span className="ml-2">🎄</span>
    </div>
  );
}
