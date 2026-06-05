import React from "react";
import ReactDOM from "react-dom/client";
import App from "./StealthApp";

const el = document.getElementById("root");
if (!el) throw new Error("找不到挂载点 #root");
ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
