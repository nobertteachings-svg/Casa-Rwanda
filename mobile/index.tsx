import { registerRootComponent } from "expo";

import App from "./App";
import AppErrorBoundary from "./src/components/AppErrorBoundary";

registerRootComponent(() => (
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
));
