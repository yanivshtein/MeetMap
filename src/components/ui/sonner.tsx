"use client";

import { Toaster as Sonner } from "sonner";

export default function Toaster() {
  return (
    <Sonner
      closeButton
      position="top-right"
      richColors
      toastOptions={{
        className: "rounded-xl border border-gray-200 bg-white shadow-lg",
      }}
    />
  );
}
