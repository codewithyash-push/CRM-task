const { extractIntent, designSystem, generateSchemas } = require("./stages");
const { validateConfig } = require("./validator");
const { repairConfig } = require("./repair");
const { simulateRuntime } = require("../runtime/simulator");

function compilePrompt(prompt, options = {}) {
  const startedAt = Date.now();
  const stages = [];
  const metrics = { retries: 0, repairCount: 0, latencyMs: 0, estimatedCostUsd: 0 };

  const intent = track(stages, "intent-extraction", () => extractIntent(prompt));
  const design = track(stages, "system-design", () => designSystem(intent.output));
  const schema = track(stages, "schema-generation", () => generateSchemas(design.output));

  let validation = validateConfig(schema.output);
  let finalConfig = schema.output;
  let repairs = [];

  if (!validation.valid || options.forceRepair) {
    metrics.retries += 1;
    const repaired = track(stages, "refinement-repair", () => repairConfig(finalConfig));
    finalConfig = repaired.output.config;
    repairs = repaired.output.repairs;
    validation = repaired.output.validation;
  } else {
    stages.push({ name: "refinement-repair", durationMs: 0, output: { repairs: [] } });
  }

  const runtime = track(stages, "execution-simulation", () => simulateRuntime(finalConfig));
  metrics.repairCount = repairs.length;
  metrics.latencyMs = Date.now() - startedAt;
  metrics.estimatedCostUsd = estimateCost(prompt, finalConfig);

  return {
    ok: validation.valid && runtime.output.ok,
    config: finalConfig,
    validation,
    runtime: runtime.output,
    pipeline: stages.map((stage) => ({
      name: stage.name,
      durationMs: stage.durationMs,
      summary: summarize(stage.output)
    })),
    repairs,
    metrics,
    clarificationNeeded: shouldClarify(intent.output)
  };
}

function track(stages, name, fn) {
  const startedAt = Date.now();
  const output = fn();
  const result = { name, durationMs: Date.now() - startedAt, output };
  stages.push(result);
  return result;
}

function summarize(output) {
  if (output?.stage === "intent") {
    return {
      productType: output.productType,
      features: output.features,
      roles: output.roles,
      ambiguities: output.ambiguities
    };
  }
  if (output?.stage === "system-design") {
    return {
      pages: output.pages.length,
      entities: output.entities,
      flows: output.flows
    };
  }
  if (output?.config) {
    return { repairs: output.repairs, valid: output.validation.valid };
  }
  if (output?.ok !== undefined) {
    return { ok: output.ok, checks: output.checks.length, failures: output.failures };
  }
  return {
    pages: output?.ui?.pages?.length,
    endpoints: output?.api?.endpoints?.length,
    tables: output?.db?.tables?.length
  };
}

function shouldClarify(intent) {
  if (intent.conflicts.length) {
    return {
      required: true,
      questions: intent.conflicts.map((conflict) => `Please resolve: ${conflict}`)
    };
  }
  if (intent.normalizedPrompt.split(" ").length < 4) {
    return {
      required: true,
      questions: ["What users, core workflow, and data should the app manage?"]
    };
  }
  return { required: false, questions: [] };
}

function estimateCost(prompt, config) {
  const pseudoTokens = Math.ceil((prompt.length + JSON.stringify(config).length) / 4);
  return Number(((pseudoTokens / 1000) * 0.0006).toFixed(5));
}

module.exports = { compilePrompt };
