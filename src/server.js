const express = require("express");
const path = require("path");
const { compilePrompt } = require("./pipeline/compiler");
const { runEvaluation } = require("./evaluation/evaluator");

const app = express();
const PORT = process.env.PORT || 4100;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/compile", (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });
  res.json(compilePrompt(prompt, { forceRepair: Boolean(req.body?.forceRepair) }));
});

app.get("/api/evaluation", (_req, res) => {
  res.json(runEvaluation());
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`App Compiler Platform running at http://localhost:${PORT}`);
});
