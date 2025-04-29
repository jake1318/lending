import React from "react";
import { createRoot } from "react-dom/client";
import { WalletProvider } from "@suiet/wallet-kit";
import App from "./App";
import "./styles/theme.scss";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
