const { productPrompts, edgePrompts } = require("./dataset");
const { compilePrompt } = require("../pipeline/compiler");

function runEvaluation() {
  const cases = [
    ...productPrompts.map((prompt) => ({ kind: "product", prompt })),
    ...edgePrompts.map((prompt) => ({ kind: "edge", prompt }))
  ];

  const results = cases.map((testCase, index) => {
    const result = compilePrompt(testCase.prompt);
    return {
      id: index + 1,
      kind: testCase.kind,
      prompt: testCase.prompt,
      ok: result.ok,
      retries: result.metrics.retries,
      repairCount: result.metrics.repairCount,
      latencyMs: result.metrics.latencyMs,
      failureTypes: [
        ...result.validation.errors.map((error) => error.code),
        ...result.runtime.failures
      ],
      clarificationNeeded: result.clarificationNeeded.required
    };
  });

  const total = results.length;
  const success = results.filter((result) => result.ok).length;
  const failures = results.flatMap((result) => result.failureTypes);
  const failureCounts = failures.reduce((acc, code) => {
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    total,
    success,
    successRate: Number((success / total).toFixed(2)),
    avgRetries: average(results.map((result) => result.retries)),
    avgLatencyMs: Math.round(average(results.map((result) => result.latencyMs))),
    clarificationRate: Number((results.filter((result) => result.clarificationNeeded).length / total).toFixed(2)),
    failureCounts,
    costQualityTradeoff: {
      deterministicLocalPass: "Runs low-cost rule-based stages first for predictable structure.",
      selectiveRepair: "Repairs only invalid references/fields instead of regenerating the whole config.",
      llmUpgradePath: "In production, replace individual stages with constrained LLM calls only when catalog coverage is low."
    },
    results
  };
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

module.exports = { runEvaluation };
