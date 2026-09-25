import { hydrateRecipe } from "../recipes";
import type { Difficulty, MealSlot, RawRecipe, Recipe } from "../recipes/types";

/**
 * Optional AI assist. Works with any OpenAI-compatible /chat/completions endpoint
 * (OpenAI, OpenRouter, Groq, LM Studio, Ollama at http://localhost:11434/v1, ...).
 * Requests go straight from the browser to the configured endpoint: there is no Nido server.
 */
export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const AI_STORAGE_KEY = "nido-ai-config";

export function isConfigured(c: AiConfig | null | undefined): c is AiConfig {
  return !!c && c.baseUrl.trim().length > 0 && c.model.trim().length > 0;
}

export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as AiConfig;
    return isConfigured(c) ? c : null;
  } catch {
    return null;
  }
}

export function saveAiConfig(c: AiConfig | null): void {
  try {
    if (c && isConfigured(c)) localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(c));
    else localStorage.removeItem(AI_STORAGE_KEY);
  } catch {
    /* storage unavailable: ignore */
  }
}

export type AiErrorCode = "network" | "auth" | "http" | "empty" | "parse";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function endpointUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "") + "/chat/completions";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(
  config: AiConfig,
  messages: ChatMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let res: Response;
  try {
    res = await fetchImpl(endpointUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: config.model, messages, temperature: 0.7 }),
    });
  } catch {
    // fetch rejects on CORS failures, offline, DNS errors, refused connections...
    throw new AiError("network", "Could not reach the AI endpoint (network or CORS).");
  }
  if (res.status === 401 || res.status === 403)
    throw new AiError("auth", "The AI endpoint rejected the API key.");
  if (!res.ok) throw new AiError("http", `The AI endpoint answered with HTTP ${res.status}.`);
  let json: { choices?: { message?: { content?: string } }[] };
  try {
    json = await res.json();
  } catch {
    throw new AiError("parse", "The AI endpoint returned an unreadable response.");
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiError("empty", "The AI endpoint returned an empty answer.");
  return text;
}

export function recipePrompt(fridge: string[], lang: "es" | "en"): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a helpful home cook. Reply ONLY with one JSON object, no markdown. Schema: " +
        '{"name":string,"emoji":string,"meals":["breakfast"|"lunch"|"dinner"],"time":minutes,' +
        '"difficulty":"facil"|"medio"|"dificil","servings":number,' +
        '"ingredients":["<qty> <unit> <name>"],"steps":[string]}. ' +
        'Units allowed: g, kg, ml, l, cl, u, cda, cdta, pizca (example: "200 g arroz"). ' +
        "Write name, ingredient names and steps in Spanish.",
    },
    {
      role: "user",
      content:
        `Invent a tasty recipe using mostly these ingredients: ${fridge.join(", ")}. ` +
        "Pantry staples (oil, salt, pepper, water) are available. " +
        (lang === "en" ? "The user reads English but keep the JSON content in Spanish." : ""),
    },
  ];
}

const DIFFS: Difficulty[] = ["facil", "medio", "dificil"];
const MEALS: MealSlot[] = ["breakfast", "lunch", "dinner"];

/** Extract and validate the recipe JSON from a model answer (tolerates ``` fences and chatter). */
export function parseAiRecipe(text: string, now = Date.now()): Recipe {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AiError("parse", "No JSON found in the answer.");
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiError("parse", "The answer was not valid JSON.");
  }
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const ings = Array.isArray(obj.ingredients)
    ? obj.ingredients.filter((x): x is string => typeof x === "string")
    : [];
  const steps = Array.isArray(obj.steps)
    ? obj.steps.filter((x): x is string => typeof x === "string")
    : [];
  if (!name || ings.length === 0 || steps.length === 0)
    throw new AiError("parse", "The recipe was incomplete.");
  const meals = (Array.isArray(obj.meals) ? obj.meals : []).filter((m): m is MealSlot =>
    MEALS.includes(m as MealSlot),
  );
  const raw: RawRecipe = {
    id: `ai-${now}`,
    name,
    emoji: typeof obj.emoji === "string" && obj.emoji ? obj.emoji.slice(0, 4) : "🍽️",
    hue: now % 360,
    meals: meals.length ? meals : ["lunch", "dinner"],
    time: Number(obj.time) > 0 ? Math.round(Number(obj.time)) : 30,
    difficulty: DIFFS.includes(obj.difficulty as Difficulty)
      ? (obj.difficulty as Difficulty)
      : "medio",
    servings: Number(obj.servings) > 0 ? Math.round(Number(obj.servings)) : 2,
    ingredients: [],
    steps,
  };
  const parsed: string[] = [];
  for (const line of ings) {
    try {
      // validate each line with the same parser recipes use
      hydrateRecipe({ ...raw, ingredients: [line] });
      parsed.push(line);
    } catch {
      /* skip lines the model formatted badly */
    }
  }
  if (parsed.length === 0) throw new AiError("parse", "No valid ingredients in the answer.");
  return { ...hydrateRecipe({ ...raw, ingredients: parsed }), custom: true };
}

export function explainPrompt(
  items: string[],
  ctx: { tempC: number; rain: boolean; occasion: string },
  lang: "es" | "en",
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a warm, concise personal stylist. Answer in ${lang === "es" ? "Spanish" : "English"} with at most two friendly sentences and no lists.`,
    },
    {
      role: "user",
      content: `Outfit: ${items.join(", ")}. Weather: ${Math.round(ctx.tempC)} C${ctx.rain ? ", rain" : ""}. Occasion: ${ctx.occasion}. Explain why it works and offer one small tweak.`,
    },
  ];
}

export function friendlyError(e: unknown): AiErrorCode {
  return e instanceof AiError ? e.code : "network";
}
