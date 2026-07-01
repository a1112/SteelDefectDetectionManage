"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "#05080d",
          "--normal-text": "#f0f6fc",
          "--normal-border": "#3f4b5a",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
