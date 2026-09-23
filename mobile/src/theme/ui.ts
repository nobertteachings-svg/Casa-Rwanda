import { lightColors } from "./casa";
import { makeUi } from "./ThemeContext";

export { fontFamily } from "./fonts";
export { makeUi } from "./ThemeContext";

/** Static light styles. Screens should prefer `useCasaTheme().ui`. */
export const ui = makeUi(lightColors);
