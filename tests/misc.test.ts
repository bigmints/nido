import { describe, expect, it, vi } from "vitest";
import { AiError, chat, endpointUrl, explainPrompt, isConfigured, parseAiRecipe } from "@/lib/ai";
import { addDays, daysBetween, startOfWeek, toISO, weekDates } from "@/lib/dates";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { translate } from "@/lib/i18n";
import { RECIPES } from "@/lib/recipes";
import { DEMO_FRIDGE, demoData } from "@/lib/seed";
import { describeCode, fetchWeather, formatTemp, parseForecast, searchCity } from "@/lib/weather";
import { canon } from "@/lib/recipes/catalog";

describe("dates", () => {
  it("computes Monday-based weeks across month boundaries", () => {
    expect(startOfWeek("2026-03-01")).toBe("2026-02-23"); // Sunday
    expect(startOfWeek("2026-03-02")).toBe("2026-03-02"); // Monday
    expect(weekDates("2026-02-23")[6]).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-03-01", "2026-03-11")).toBe(10);
    expect(toISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("weather", () => {
  const payload = {
    current: { temperature_2m: 14.2, apparent_temperature: 12.1, weather_code: 61, is_day: 1 },
    daily: {
      temperature_2m_max: [17],
      temperature_2m_min: [9],
      precipitation_probability_max: [80],
    },
  };

  it("parses an Open-Meteo forecast", () => {
    const w = parseForecast(payload);
    expect(w).toMatchObject({
      tempC: 14.2,
      feelsC: 12.1,
      maxC: 17,
      minC: 9,
      kind: "rain",
      rain: true,
      precipProb: 80,
    });
  });

  it("treats a dry code with high precipitation probability as rain, and clear sky as not", () => {
    expect(
      parseForecast({ ...payload, current: { ...payload.current, weather_code: 2 } }).rain,
    ).toBe(true);
    const dry = parseForecast({
      current: { temperature_2m: 25, weather_code: 0 },
      daily: { precipitation_probability_max: [5] },
    });
    expect(dry.rain).toBe(false);
    expect(dry.feelsC).toBe(25);
  });

  it("rejects malformed payloads and maps codes", () => {
    expect(() => parseForecast({})).toThrow();
    expect(describeCode(0, false).emoji).toBe("🌙");
    expect(describeCode(95).kind).toBe("storm");
    expect(describeCode(73).kind).toBe("snow");
  });

  it("formats temperatures in both unit systems", () => {
    expect(formatTemp(20, "metric")).toBe("20°C");
    expect(formatTemp(20, "imperial")).toBe("68°F");
  });

  it("calls the expected endpoints", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(payload)));
    await fetchWeather({ name: "x", lat: 40.4, lon: -3.7 }, f as unknown as typeof fetch);
    const url = String((f.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("api.open-meteo.com");
    expect(url).toContain("latitude=40.4");
    const g = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                name: "Madrid",
                latitude: 40.4,
                longitude: -3.7,
                admin1: "Madrid",
                country: "España",
              },
            ],
          }),
        ),
    );
    const r = await searchCity("Madr", "es", g as unknown as typeof fetch);
    expect(r[0]).toMatchObject({ name: "Madrid", lat: 40.4, detail: "Madrid, España" });
    expect(await searchCity("a", "es", g as unknown as typeof fetch)).toEqual([]);
  });
});

describe("optional AI client", () => {
  const cfg = { baseUrl: "http://localhost:11434/v1/", apiKey: "", model: "llama3.2" };

  it("builds the endpoint and detects configuration", () => {
    expect(endpointUrl(cfg.baseUrl)).toBe("http://localhost:11434/v1/chat/completions");
    expect(isConfigured(cfg)).toBe(true);
    expect(isConfigured({ ...cfg, model: "" })).toBe(false);
    expect(isConfigured(null)).toBe(false);
  });

  it("sends the key only when present and returns the answer", async () => {
    const f = vi.fn(
      async () => new Response(JSON.stringify({ choices: [{ message: { content: " hola " } }] })),
    );
    expect(await chat(cfg, [{ role: "user", content: "x" }], f as unknown as typeof fetch)).toBe(
      "hola",
    );
    const init = (f.mock.calls[0] as unknown[])[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    await chat({ ...cfg, apiKey: "k" }, [], f as unknown as typeof fetch);
    expect(((f.mock.calls[1] as unknown[])[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer k",
    });
  });

  it("maps failures to friendly error codes", async () => {
    const net = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(chat(cfg, [], net as unknown as typeof fetch)).rejects.toMatchObject({
      code: "network",
    });
    const auth = vi.fn(async () => new Response("no", { status: 401 }));
    await expect(chat(cfg, [], auth as unknown as typeof fetch)).rejects.toMatchObject({
      code: "auth",
    });
    const srv = vi.fn(async () => new Response("no", { status: 500 }));
    await expect(chat(cfg, [], srv as unknown as typeof fetch)).rejects.toMatchObject({
      code: "http",
    });
    const empty = vi.fn(async () => new Response(JSON.stringify({ choices: [] })));
    await expect(chat(cfg, [], empty as unknown as typeof fetch)).rejects.toBeInstanceOf(AiError);
  });

  it("parses a recipe out of a chatty, fenced answer and skips bad ingredient lines", () => {
    const answer =
      'Claro!\n```json\n{"name":"Revuelto de espinacas","emoji":"🥬","meals":["dinner"],"time":15,"difficulty":"facil","servings":2,"ingredients":["4 u huevo","200 g espinacas","un poco de sal"],"steps":["Saltea","Añade los huevos"]}\n```';
    const r = parseAiRecipe(answer, 1000);
    expect(r).toMatchObject({
      name: "Revuelto de espinacas",
      custom: true,
      id: "ai-1000",
      time: 15,
    });
    expect(r.ingredients.map((i) => i.name)).toEqual(["huevo", "espinacas"]);
    expect(r.diet).toContain("vegetariano");
    expect(() => parseAiRecipe("sorry, no")).toThrow(AiError);
    expect(() => parseAiRecipe('{"name":"x","ingredients":["mucho"],"steps":["a"]}')).toThrow();
  });

  it("builds an explanation prompt in the requested language", () => {
    const m = explainPrompt(["Camisa"], { tempC: 12, rain: true, occasion: "work" }, "en");
    expect(m[0].content).toContain("English");
    expect(m[1].content).toContain("rain");
  });
});

describe("i18n", () => {
  it("English has exactly the same keys as Spanish, and no empty strings", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    expect(Object.values(en).every((v) => v.length > 0)).toBe(true);
  });

  it("interpolates variables and keeps placeholders consistent across languages", () => {
    expect(translate("es", "fridge.match", { have: 3, total: 5 })).toBe("Tienes 3 de 5");
    expect(translate("en", "fridge.match", { have: 3, total: 5 })).toBe("You have 3 of 5");
    for (const k of Object.keys(es) as (keyof typeof es)[]) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(ph(en[k])).toBe(ph(es[k]));
    }
  });
});

describe("demo data", () => {
  it("only references recipes that exist and fills the whole week", () => {
    const d = demoData("2026-03-04");
    const ids = new Set(RECIPES.map((r) => r.id));
    expect(Object.keys(d.plan!)).toHaveLength(21);
    for (const id of Object.values(d.plan!)) expect(ids.has(id)).toBe(true);
    for (const key of Object.keys(d.plan!))
      expect(key >= "2026-03-02" && key <= "2026-03-08:z").toBe(true);
  });

  it("demo fridge items are known ingredients", () => {
    expect(DEMO_FRIDGE.length).toBeGreaterThan(3);
    expect(canon("queso rallado")).toBeTruthy();
  });
});
