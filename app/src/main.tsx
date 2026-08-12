import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";

const el = document.getElementById("dt-app");
if (el)
  createRoot(el).render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }