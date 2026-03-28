import { useState, useEffect } from "react";

/**
 * 检测是否为移动设备
 */
export const useDeviceDetection = () => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobileDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };

    checkMobileDevice();
    window.addEventListener("resize", checkMobileDevice);
    return () =>
      window.removeEventListener("resize", checkMobileDevice);
  }, []);

  return { isMobileDevice };
};