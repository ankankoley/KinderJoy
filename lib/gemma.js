import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function callGemma(prompt, model, image) {
  // image = { mimeType: "image/jpeg", data: "<base64 without data: prefix>" } or undefined
  const contents = image
    ? [{ role: "user", parts: [{ inlineData: image }, { text: prompt }] }]
    : prompt;

  const response = await ai.models.generateContent({
    model,
    contents,
    config: { temperature: 0.4, maxOutputTokens: 4096 },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemma");
  return text;
}

export function extractJson(text) {
  const clean = text.replace(/```json|```/g, "");
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON in model output");
  return JSON.parse(clean.slice(s, e + 1));
}