import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// No StrictMode: its dev-only double-mount opens the websocket twice, delivering
// every event (and message) twice. One connection = one stream.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
