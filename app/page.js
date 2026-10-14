"use client";
import { useEffect, useRef, useState } from "react";

/* ---------- data ---------- */
const TYPES = ["Code output", "Log", "Chart", "Diagram / Image", "API response"];

const EXAMPLES = [
  { icon: "🔢", label: "Fibonacci output", type: "Code output", text: "[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]" },
  { icon: "🚨", label: "Server error log", type: "Log", text: "12:01:03 INFO  GET /login 200 (45ms)\n12:01:04 WARN  db pool usage 9/10\n12:01:05 ERROR timeout after 30s on /checkout\n12:01:05 ERROR 500 /checkout" },
  { icon: "📊", label: "Sales chart", type: "Chart", text: "Bar chart of monthly sales Jan–Dec: 15,25,35,30,32,40,55,68,58,65,75,88 with a smooth rising trend line above the bars." },
  { icon: "🐛", label: "Wrong output", type: "Code output", text: "Function calculate(a, b) should return a + b, but calculate(2, 3) returns -1 and calculate(5, 5) returns 10." },
];

const STAGES = [
  { name: "Component Extraction", hint: "Identifying parts of the result" },
  { name: "Relationship Inference", hint: "Working out how parts connect" },
  { name: "Process Reconstruction", hint: "Building plausible workflows" },
  { name: "Hypothesis Ranking", hint: "Scoring alternative explanations" },
];

const CORE = [
  ["01", "Component Extraction", "Identifies parts and elements within the result."],
  ["02", "Relationship Inference", "Deduces how components interact or depend on each other."],
  ["03", "Process Reconstruction", "Builds plausible sequences or workflows producing the result."],
  ["04", "Hypothesis Ranking", "Evaluates alternative scenarios with plausibility scores."],
];

const USE_CASES = [
  ["🐞", "Software Debugging", "Work backward from incorrect outputs to likely bugs and execution paths."],
  ["🎓", "Education & Learning", "Reconstruct the steps behind solved problems, diagrams or algorithms."],
  ["🎨", "UI & Design Analysis", "Infer design and implementation steps from a finished interface."],
  ["🛰️", "System Investigation", "Go from system states and logs to possible workflows and events."],
  ["📈", "Data & Visualization", "Infer the data transformations that could have produced a chart."],
  ["🧮", "Algorithm Reconstruction", "Study outputs to infer the logic and processing sequence."],
];

const COLORS = ["#22d3ee", "#a78bfa", "#f472b6"];

/* ---------- helpers ---------- */
function loadImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/jpeg", 0.88);
      URL.revokeObjectURL(url);
      resolve({ mimeType: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, name: file.name });
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = url;
  });
}

/* ---------- small components ---------- */
function Ring({ value, color, size = 64 }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dasharray .9s ease" }} />
      <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">{value}</text>
    </svg>
  );
}

function StepFlow({ steps, color }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4 fade-up" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold border-2"
              style={{ borderColor: color, color, background: "rgba(255,255,255,.03)" }}>{i + 1}</div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 my-1" style={{ background: `linear-gradient(${color}, transparent)` }} />
            )}
          </div>
          <div className="glass rounded-xl px-4 py-3 mb-3 flex-1 text-sm text-gray-200 leading-relaxed">{s}</div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ eyebrow, children }) {
  return (
    <div className="mb-8">
      <p className="text-xs tracking-[0.25em] text-cyan-400 mb-2">{eyebrow}</p>
      <h2 className="text-3xl md:text-4xl font-extrabold">{children}</h2>
    </div>
  );
}

function FlowStrip() {
  const box = "px-5 py-3 rounded-xl glass font-bold text-sm tracking-wide";
  return (
    <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap mt-12 float">
      <div className={box}>RESULT</div>
      <svg width="46" height="12"><line x1="0" y1="6" x2="46" y2="6" stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 4" className="dash-flow" /></svg>
      <div className={`${box} border-dashed text-cyan-300`} style={{ borderStyle: "dashed", borderColor: "#22d3ee" }}>???</div>
      <svg width="46" height="12"><line x1="0" y1="6" x2="46" y2="6" stroke="#a855f7" strokeWidth="2" strokeDasharray="6 4" className="dash-flow" /></svg>
      <div className={box}>PROCESS</div>
    </div>
  );
}

/* ---------- page ---------- */
export default function Home() {
  const [input, setInput] = useState("");
  const [type, setType] = useState("Code output");
  const [image, setImage] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(0);
  const [compare, setCompare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const [detail, setDetail] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const resultRef = useRef(null);

  /* loading animation */
  useEffect(() => {
    if (!loading) return;
    setStage(0); setSecs(0);
    const a = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3000);
    const b = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [loading]);

  /* paste an image from clipboard */
  useEffect(() => {
    const onPaste = (e) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); attach(f); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function attach(file) {
    if (!file?.type?.startsWith("image/")) { setErr("Please choose an image file (PNG, JPG, WEBP)."); return; }
    try {
      setErr(""); setDetail("");
      setImage(await loadImage(file));
      setType("Diagram / Image");
    } catch (e) { setErr(e.message); }
  }

  async function run() {
    setLoading(true); setErr(""); setDetail(""); setData(null); setSel(0); setCompare(false);
    try {
      const r = await fetch("/api/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input, type,
          image: image ? { mimeType: image.mimeType, data: image.data } : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setDetail(j.detail || ""); throw new Error(j.error || "Something went wrong."); }
      setData(j);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  function downloadReport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reverse-engineer-report.json";
    a.click();
  }

  function copyCode(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const h = data?.hypotheses?.[sel];
  const canRun = (input.trim() || image) && !loading;

  return (
    <main className="min-h-screen bg-aurora relative overflow-x-hidden">
      <div className="absolute inset-0 bg-dots pointer-events-none" />

      {/* NAV */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="font-extrabold text-lg tracking-tight">
          <span className="grad-text">Reverse</span>Engineer
        </div>
        <div className="hidden md:flex gap-7 text-sm text-gray-400">
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#demo" className="hover:text-white transition">Live demo</a>
          <a href="#uses" className="hover:text-white transition">Use cases</a>
        </div>
        <span className="text-xs px-3 py-1 rounded-full glass text-cyan-300">Gemma 4 · Open-weight</span>
      </nav>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-20 text-center fade-up">
        <span className="inline-block text-[11px] tracking-[0.25em] px-4 py-1.5 rounded-full glass text-cyan-300 mb-7">
          REVERSE REASONING PLATFORM · TEAM KINDERJOY
        </span>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-none grad-text">ReverseEngineer</h1>
        <p className="mt-6 text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
          Give it the result. <span className="text-cyan-400 font-semibold">AI</span> reconstructs how it could have happened.
        </p>
        <div className="mt-9 flex justify-center gap-4 flex-wrap">
          <a href="#demo" className="grad-btn px-8 py-3.5 rounded-xl font-bold glow">Try the live demo</a>
          <a href="#how" className="px-8 py-3.5 rounded-xl font-semibold glass hover:bg-white/10 transition">How it works</a>
        </div>
        <FlowStrip />
      </section>

      {/* WHY */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-7">
          <p className="text-xs tracking-[0.25em] text-gray-400 mb-2">TRADITIONAL AI</p>
          <p className="text-gray-300 mb-5">Most AI systems work forward from input to result.</p>
          <div className="flex items-center gap-3 text-sm font-semibold flex-wrap">
            <span className="glass px-4 py-2 rounded-lg">INPUT</span><span className="text-gray-500">→</span>
            <span className="glass px-4 py-2 rounded-lg">PROCESS</span><span className="text-gray-500">→</span>
            <span className="glass px-4 py-2 rounded-lg">RESULT</span>
          </div>
        </div>
        <div className="glass glow rounded-2xl p-7" style={{ borderColor: "rgba(34,211,238,.45)" }}>
          <p className="text-xs tracking-[0.25em] text-cyan-300 mb-2">REVERSE ENGINEER</p>
          <p className="text-gray-300 mb-5">But often, only the final result is available.</p>
          <div className="flex items-center gap-3 text-sm font-semibold flex-wrap">
            <span className="glass px-4 py-2 rounded-lg">RESULT</span><span className="text-cyan-400">→</span>
            <span className="px-4 py-2 rounded-lg text-cyan-300" style={{ border: "1px dashed #22d3ee" }}>???</span><span className="text-cyan-400">→</span>
            <span className="glass px-4 py-2 rounded-lg">PROCESS</span>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <SectionTitle eyebrow="CORE COMPONENTS">Four steps from <span className="grad-text">result to process</span></SectionTitle>
        <div className="grid md:grid-cols-4 gap-4">
          {CORE.map(([n, t, d]) => (
            <div key={n} className="glass rounded-2xl p-6 hover:-translate-y-1 hover:glow transition duration-300">
              <div className="text-4xl font-black grad-text">{n}</div>
              <h3 className="font-bold mt-3">{t}</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="relative z-10 max-w-6xl mx-auto px-6 pb-24 scroll-mt-6">
        <SectionTitle eyebrow="LIVE DEMO">Show it a result. <span className="grad-text">Watch it work backwards.</span></SectionTitle>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* INPUT PANEL */}
          <div className="lg:col-span-2 glass rounded-2xl p-5 lg:sticky lg:top-6">
            <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-2">QUICK EXAMPLES</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {EXAMPLES.map((e) => (
                <button key={e.label}
                  onClick={() => { setInput(e.text); setType(e.type); setImage(null); setErr(""); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-cyan-900 hover:border-cyan-400 hover:bg-cyan-500/10 transition">
                  {e.icon} {e.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-2">RESULT TYPE</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {TYPES.map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${type === t ? "grad-btn font-semibold" : "glass hover:bg-white/10"}`}>
                  {t}
                </button>
              ))}
            </div>

            {/* image drop zone */}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => attach(e.target.files?.[0])} />
            {!image ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); attach(e.dataTransfer.files?.[0]); }}
                className={`cursor-pointer rounded-xl text-center py-6 px-4 mb-4 transition border-2 border-dashed ${dragging ? "border-cyan-400 bg-cyan-500/10" : "border-cyan-900 hover:border-cyan-600"}`}>
                <div className="text-2xl mb-1">🖼️</div>
                <p className="text-sm text-gray-300">Drop a diagram, screenshot or chart</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse · or paste with Ctrl+V</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden mb-4 border border-cyan-800">
                <img src={image.preview} alt="uploaded result" className="w-full max-h-56 object-contain bg-black/40" />
                {loading && <div className="scanline" />}
                <button onClick={() => setImage(null)}
                  className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded-md bg-black/70 hover:bg-red-500/80 transition">✕ Remove</button>
              </div>
            )}

            <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-2">{image ? "EXTRA CONTEXT (OPTIONAL)" : "PASTE THE RESULT"}</p>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={image ? 3 : 8}
              placeholder={image ? "e.g. This is the architecture diagram of our checkout service…" : "Paste output, logs, an error, or describe a chart…"}
              className="w-full bg-[#0a1020] border border-cyan-900 rounded-xl p-3 font-mono text-sm outline-none focus:border-cyan-400 transition resize-none" />

            <button onClick={run} disabled={!canRun}
              className="mt-4 w-full py-3.5 rounded-xl font-bold grad-btn disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? "Reconstructing…" : "Reverse Engineer →"}
            </button>

            {err && (
              <div className="mt-4 rounded-lg p-3 text-sm bg-red-500/10 border border-red-500/40 text-red-300">
                {err}
                {detail && <details className="mt-1 text-xs text-red-300/70"><summary className="cursor-pointer">Technical details</summary>{detail}</details>}
              </div>
            )}
          </div>

          {/* OUTPUT PANEL */}
          <div className="lg:col-span-3" ref={resultRef}>
            {!data && !loading && (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4 float">🔍</div>
                <p className="text-lg font-semibold">Waiting for a result</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Pick an example, paste your own result, or drop in an image. ReverseEngineer will propose how it could have been produced.
                </p>
              </div>
            )}

            {loading && (
              <div className="glass rounded-2xl p-7 fade-up">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-cyan-300 font-semibold animate-pulse">Gemma is working backwards…</p>
                  <span className="text-xs text-gray-500">{secs}s</span>
                </div>
                <div className="space-y-4">
                  {STAGES.map((s, i) => (
                    <div key={s.name} className={`flex items-center gap-4 transition duration-500 ${i <= stage ? "opacity-100" : "opacity-25"}`}>
                      <span className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${i < stage ? "grad-btn" : "border border-cyan-400 text-cyan-300"}`}>
                        {i < stage ? "✓" : i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 space-y-3">
                  <div className="h-3 rounded shimmer w-full" />
                  <div className="h-3 rounded shimmer w-4/5" />
                  <div className="h-3 rounded shimmer w-3/5" />
                </div>
              </div>
            )}

            {data && (
              <div className="space-y-5 fade-up">
                {/* summary */}
                <div className="glass glow rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-[11px] tracking-[0.2em] text-cyan-400 mb-1">WHAT WE SEE</p>
                      <p className="text-lg font-semibold leading-snug">{data.summary}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={downloadReport} className="text-xs px-3 py-1.5 rounded-lg glass hover:bg-white/10 transition">⬇ Report</button>
                    </div>
                  </div>
                  {data.components.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-2">COMPONENTS</p>
                      <div className="flex flex-wrap gap-2">
                        {data.components.map((c, i) => (
                          <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-700/60 text-cyan-100">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.relationships.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-2">RELATIONSHIPS</p>
                      <ul className="space-y-1.5">
                        {data.relationships.map((r, i) => (
                          <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-purple-400">⇢</span>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* hypothesis selector */}
                <div>
                  <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-3">RANKED HYPOTHESES</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {data.hypotheses.map((x, i) => (
                      <button key={i} onClick={() => { setSel(i); setCompare(false); }}
                        className={`text-left rounded-2xl p-4 transition duration-300 ${sel === i && !compare ? "glow" : "opacity-80 hover:opacity-100"} glass`}
                        style={sel === i && !compare ? { borderColor: COLORS[i], boxShadow: `0 0 30px ${COLORS[i]}33` } : {}}>
                        <div className="flex items-center gap-3">
                          <Ring value={x.confidence} color={COLORS[i]} />
                          <div>
                            <p className="text-[10px] tracking-widest text-gray-500">HYPOTHESIS {"ABC"[i]}</p>
                            <p className="text-sm font-semibold leading-tight mt-0.5">{x.name}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setCompare(!compare)}
                    className="mt-3 text-sm px-4 py-2 rounded-lg border border-purple-500/60 hover:bg-purple-500/10 transition">
                    {compare ? "← Back to single view" : "⇄ Compare all paths"}
                  </button>
                </div>

                {/* single hypothesis */}
                {!compare && h && (
                  <div key={sel} className="glass rounded-2xl p-6 fade-up" style={{ borderColor: `${COLORS[sel]}55` }}>
                    <p className="text-[11px] tracking-[0.2em] mb-1" style={{ color: COLORS[sel] }}>WHY THIS COULD BE IT</p>
                    <p className="text-sm text-gray-200 leading-relaxed mb-6">{h.reasoning}</p>

                    <p className="text-[11px] tracking-[0.2em] text-gray-400 mb-4">RECONSTRUCTED PROCESS</p>
                    <StepFlow steps={h.steps} color={COLORS[sel]} />

                    {h.code && (
                      <div className="mt-5">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[11px] tracking-[0.2em] text-gray-400">REPRODUCING CODE</p>
                          <button onClick={() => copyCode(h.code)} className="text-xs text-cyan-300 hover:text-white transition">
                            {copied ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs overflow-x-auto text-cyan-100 leading-relaxed">{h.code}</pre>
                      </div>
                    )}

                    {h.validation && (
                      <div className="mt-5 rounded-xl p-4 bg-purple-500/10 border border-purple-500/40">
                        <p className="text-[11px] tracking-[0.2em] text-purple-300 mb-1">HOW TO VALIDATE</p>
                        <p className="text-sm text-gray-200">{h.validation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* compare */}
                {compare && (
                  <div className="grid md:grid-cols-3 gap-3 fade-up">
                    {data.hypotheses.map((x, i) => (
                      <div key={i} className="glass rounded-2xl p-4" style={{ borderColor: `${COLORS[i]}55` }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-sm" style={{ color: COLORS[i] }}>Hypothesis {"ABC"[i]}</span>
                          <span className="text-xs text-gray-400">{x.confidence}%</span>
                        </div>
                        <p className="text-xs font-semibold mb-3">{x.name}</p>
                        <ol className="space-y-2">
                          {x.steps.map((s, j) => (
                            <li key={j} className="text-xs text-gray-300 flex gap-2">
                              <span style={{ color: COLORS[i] }} className="font-bold">{j + 1}.</span>{s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}

                {/* anomalies */}
                {data.anomalies.length > 0 && (
                  <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/40">
                    <p className="text-[11px] tracking-[0.2em] text-amber-300 mb-2">⚠ ANOMALIES & AMBIGUITY</p>
                    <ul className="space-y-1 text-sm text-amber-100/90">
                      {data.anomalies.map((a, i) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] text-gray-500">
                  Plausibility scores are the model's own estimates, not calibrated probabilities. Generated by {data.model}.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="uses" className="relative z-10 max-w-6xl mx-auto px-6 pb-24 scroll-mt-6">
        <SectionTitle eyebrow="USE CASES">Where can it be <span className="grad-text">used?</span></SectionTitle>
        <div className="grid md:grid-cols-3 gap-4">
          {USE_CASES.map(([icon, title, text]) => (
            <div key={title} className="glass rounded-2xl p-6 hover:-translate-y-1 hover:glow transition duration-300">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-cyan-300">{title}</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center text-xs text-gray-500 pb-10">
        <span className="grad-text font-semibold">ReverseEngineer</span> &nbsp;|&nbsp; Team KinderJoy &nbsp;|&nbsp; Gemma 4
      </footer>
    </main>
  );
}