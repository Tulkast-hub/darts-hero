import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const el = document.getElementById("dt-app");
if (el) createRoot(el).render(<App />);
