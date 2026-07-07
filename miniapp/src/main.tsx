import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FishingMiniGame } from "./features/fishing/FishingMiniGame";
import "./styles.css";

function getInitialStandaloneScreen() {
  const params = new URLSearchParams(window.location.search);
  const requestedScreen = params.get("screen");
  return requestedScreen === "fishing" || window.location.hash === "#fishing" ? "fishing" : "app";
}

function Root() {
  const [standaloneScreen, setStandaloneScreen] = useState(getInitialStandaloneScreen);

  useEffect(() => {
    const syncRoute = () => setStandaloneScreen(getInitialStandaloneScreen());
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  if (standaloneScreen === "fishing") {
    return (
      <FishingMiniGame
        onBack={() => {
          if (window.location.hash === "#fishing") window.location.hash = "";
          else window.history.pushState({}, "", window.location.pathname);
          setStandaloneScreen("app");
        }}
      />
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
