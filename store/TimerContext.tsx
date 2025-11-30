import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const DEFAULT_DURATION = 18 * 60; // 18 minutes

interface TimerContextType {
  timeLeft: number;
  isActive: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  requestNotificationPermission: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType>({
  timeLeft: DEFAULT_DURATION,
  isActive: false,
  startTimer: () => {},
  pauseTimer: () => {},
  resetTimer: () => {},
  requestNotificationPermission: async () => {},
});

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [isActive, setIsActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
      audioRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
  }, []);

  const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
          await Notification.requestPermission();
      }
  };

  const notifyTimeUp = () => {
      // Sound
      if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio blocked", e));
      }
      
      // Push Notification
      if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("¡Tiempo Terminado!", {
              body: "El turno ha finalizado. Por favor, introducid los resultados.",
              icon: "/favicon.ico" // You might want to add an icon
          });
      }
      
      // Vibration
      if ('vibrate' in navigator) {
          navigator.vibrate([500, 200, 500]);
      }
  };

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                setIsActive(false);
                notifyTimeUp();
                return 0;
            }
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startTimer = () => {
      setIsActive(true);
      requestNotificationPermission(); // Ask on start
  };
  const pauseTimer = () => setIsActive(false);
  const resetTimer = () => {
      setIsActive(false);
      setTimeLeft(DEFAULT_DURATION);
  };

  return (
    <TimerContext.Provider value={{ timeLeft, isActive, startTimer, pauseTimer, resetTimer, requestNotificationPermission }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);