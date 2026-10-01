import "server-only";
import { google } from "@ai-sdk/google";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function getModel() {
  return google(process.env.AI_MODEL || DEFAULT_MODEL);
}
