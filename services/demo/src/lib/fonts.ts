import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "latin-ext"], // latin-ext for Czech diacritics (š ř č á…)
  ignoreTooManyRequestsWarning: true,
});
export const jetbrains = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

export const interFamily = inter.fontFamily;
export const monoFamily = jetbrains.fontFamily;
