import { NextResponse } from "next/server";
import { callGemma, extractJson } from "@/lib/gemma";

export const maxDuration = 60;

const INSTRUCTIONS = `You are ReverseEngineer, a reverse-reasoning engine.
Given a RESULT (code output, log, error, API response, chart, UI screenshot, or diagram),
reconstruct HOW it could have been produced. If an image is attached, the image IS the result:
read it carefully (text, shapes, arrows, labels, values) before reasoning.

Respond with ONLY valid JSON, no markdown, no commentary, in exactly this shape:
{
  "summary": "one sentence describing what the result is",
  "components": ["parts or elements found in the result"],
  "relationships": ["how components interact or depend on each other"],
  "hypotheses": [
    {
      "name": "short title",
      "confidence": 0-100 (integer, your estimated plausibility),
      "reasoning": "why this explains the result",
      "steps": ["ordered process steps that would produce the result"],
      "code": "minimal code that reproduces it, or empty string",
      "validation": "one concrete test that confirms or rejects this hypothesis"
    }
  ],
  "anomalies": ["anything odd, missing, or ambiguous"]
}
Give exactly 3 distinct hypotheses. Be concrete and specific to the input, never generic.`;

function normalize(d) {
  const hyps = (d.hypotheses ?? []).slice(0, 3).map((h) => ({
    name: String(h.name ?? "Hypothesis"),
    confidence: Math.max(0, Math.min(100, Math.round(Number(h.confidence) || 0))),
    reasoning: String(h.reasoning ?? ""),
    steps: Array.isArray(h.steps) ? h.steps.map(String) : [],
    code: String(h.code ?? ""),
    validation: String(h.validation ?? ""),
  }));
  if (!hyps.length) throw new Error("No hypotheses returned");
  hyps.sort((a, b) => b.confidence - a.confidence);
  return {
    summary: String(d.summary ?? ""),
    components: (d.components ?? []).map(String),
    relationships: (d.relationships ?? []).map(String),
    hypotheses: hyps,
    anomalies: (d.anomalies ?? []).map(String),
  };
}

export async function POST(req) {
  try {
    const { input = "", type = "Text", image } = await req.json();

    if (!input.trim() && !image)
      return NextResponse.json({ error: "Please enter a result or upload an image first." }, { status: 400 });
    if (input.length > 8000)
      return NextResponse.json({ error: "Input too long (max 8000 characters)." }, { status: 400 });
    if (image && (!image.data || image.data.length > 6_000_000))
      return NextResponse.json({ error: "Image is too large. Try a smaller one." }, { status: 400 });

    const prompt = `${INSTRUCTIONS}\n\nInput type: ${type}\n${
      image ? "An image is attached. Additional context from the user (may be empty):" : "RESULT:"
    }\n${input}`;

    const models = [process.env.GEMMA_MODEL, process.env.GEMMA_FALLBACK_MODEL].filter(Boolean);
    const attempts = [models[0], models[0], models[1]].filter(Boolean);

    let lastErr;
    for (const m of attempts) {
      try {
        const text = await callGemma(prompt, m, image);
        return NextResponse.json({ ...normalize(extractJson(text)), model: m });
      } catch (e) {
        lastErr = e;
        console.error(`[reverse] ${m} failed:`, e?.message ?? e);
      }
    }
    return NextResponse.json(
      { error: "Gemma could not reconstruct this. Try again in a moment.", detail: String(lastErr?.message ?? lastErr).slice(0, 400) },
      { status: 502 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}