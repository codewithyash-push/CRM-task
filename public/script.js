const promptEl = document.querySelector("#prompt");
const outputEl = document.querySelector("#output");
const compileBtn = document.querySelector("#compileBtn");
const evalBtn = document.querySelector("#evalBtn");
const forceRepairEl = document.querySelector("#forceRepair");
const notesEl = document.querySelector("#notes");
const tabs = [...document.querySelectorAll(".tab")];
let latest = null;
let activeTab = "config";

compileBtn.addEventListener("click", compile);
evalBtn.addEventListener("click", runEval);
tabs.forEach((tab) => tab.addEventListener("click", () => {
  tabs.forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  activeTab = tab.dataset.tab;
  renderOutput();
}));

compile();

async function compile() {
  setBusy(compileBtn, true, "Compiling...");
  notesEl.textContent = "";
  try {
    const response = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptEl.value, forceRepair: forceRepairEl.checked })
    });
    latest = await response.json();
    if (!response.ok) throw new Error(latest.error || "Compile failed");
    renderSummary(latest);
    renderOutput();
  } catch (error) {
    outputEl.textContent = error.message;
  } finally {
    setBusy(compileBtn, false, "Compile");
  }
}

async function runEval() {
  setBusy(evalBtn, true, "Running...");
  try {
    const response = await fetch("/api/evaluation");
    const data = await response.json();
    renderMetrics(data);
    outputEl.textContent = JSON.stringify(data, null, 2);
    activeTab = "pipeline";
  } finally {
    setBusy(evalBtn, false, "Run Evaluation");
  }
}

function renderSummary(result) {
  document.querySelector("#validStatus").textContent = result.validation.valid ? "yes" : "no";
  document.querySelector("#runtimeStatus").textContent = result.runtime.ok ? "passes" : "fails";
  document.querySelector("#retryStatus").textContent = result.metrics.retries;
  document.querySelector("#latencyStatus").textContent = `${result.metrics.latencyMs} ms`;

  const notes = [];
  if (result.repairs.length) notes.push(`Repairs: ${result.repairs.join(" ")}`);
  if (result.clarificationNeeded.required) notes.push(`Clarify: ${result.clarificationNeeded.questions.join(" ")}`);
  if (result.validation.warnings.length) notes.push(`Warnings: ${result.validation.warnings.map((warning) => warning.message).join(" ")}`);
  notesEl.textContent = notes.join(" ");
}

function renderOutput() {
  if (!latest) return;
  const payload = activeTab === "runtime"
    ? latest.runtime
    : activeTab === "pipeline"
      ? { pipeline: latest.pipeline, validation: latest.validation, repairs: latest.repairs, metrics: latest.metrics }
      : latest.config;
  outputEl.textContent = JSON.stringify(payload, null, 2);
}

function renderMetrics(data) {
  const values = [
    `${Math.round(data.successRate * 100)}%`,
    data.avgRetries,
    `${data.avgLatencyMs} ms`,
    `${Math.round(data.clarificationRate * 100)}%`
  ];
  document.querySelectorAll("#metricsGrid strong").forEach((node, index) => {
    node.textContent = values[index];
  });
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}
