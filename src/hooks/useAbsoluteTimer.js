import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setSubmitting } from '../store/examSlice';

export const useAbsoluteTimer = (targetEpochTimestamp, onExpire) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!targetEpochTimestamp) return;

    const calculateTime = () => {
      const now = Date.now();
      const remaining = targetEpochTimestamp - now;
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(timerRef.current);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      } else {
        setTimeRemaining(remaining);
      }
    };

    // Calculate immediately
    calculateTime();

    // Query relationship every 200 milliseconds per spec
    timerRef.current = setInterval(calculateTime, 200);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [targetEpochTimestamp]);

  const formatTime = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  return { 
    timeRemainingMs: timeRemaining, 
    formattedTime: formatTime(timeRemaining) 
  };
};
