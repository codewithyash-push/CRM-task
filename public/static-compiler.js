(function () {
  const featureCatalog = {
    crm: { entities: ["contact", "company", "deal", "activity"], pages: ["dashboard", "contacts", "companies", "deals"], flows: ["manage contacts", "track pipeline"] },
    ecommerce: { entities: ["product", "order", "customer", "payment"], pages: ["storefront", "products", "cart", "orders"], flows: ["browse products", "checkout"] },
    booking: { entities: ["service", "booking", "customer", "availability"], pages: ["calendar", "bookings", "services"], flows: ["schedule booking", "manage availability"] },
    project: { entities: ["project", "task", "comment"], pages: ["projects", "tasks"], flows: ["assign tasks", "track status"] },
    learning: { entities: ["course", "lesson", "enrollment"], pages: ["courses", "lessons", "progress"], flows: ["consume lessons", "track learning"] },
    content: { entities: ["post", "asset", "category"], pages: ["content", "editor"], flows: ["publish content"] },
    finance: { entities: ["invoice", "transaction", "account"], pages: ["invoices", "transactions"], flows: ["record payments"] },
    analytics: { entities: ["metric", "report"], pages: ["analytics"], flows: ["view analytics"] }
  };

  const fieldLibrary = {
    contact: [["name", "string"], ["email", "email"], ["phone", "string"], ["status", "enum"]],
    company: [["name", "string"], ["domain", "string"], ["industry", "string"]],
    deal: [["title", "string"], ["amount", "money"], ["stage", "enum"], ["contactId", "relation"]],
    activity: [["kind", "enum"], ["notes", "text"], ["contactId", "relation"]],
    product: [["name", "string"], ["price", "money"], ["description", "text"], ["active", "boolean"]],
    order: [["customerId", "relation"], ["total", "money"], ["status", "enum"]],
    customer: [["name", "string"], ["email", "email"], ["plan", "enum"]],
    payment: [["orderId", "relation"], ["amount", "money"], ["status", "enum"]],
    service: [["name", "string"], ["durationMinutes", "number"], ["price", "money"]],
    booking: [["serviceId", "relation"], ["customerId", "relation"], ["startsAt", "datetime"], ["status", "enum"]],
    availability: [["weekday", "number"], ["startTime", "string"], ["endTime", "string"]],
    project: [["name", "string"], ["status", "enum"], ["ownerId", "relation"]],
    task: [["title", "string"], ["status", "enum"], ["assigneeId", "relation"], ["projectId", "relation"]],
    comment: [["body", "text"], ["taskId", "relation"], ["authorId", "relation"]],
    course: [["title", "string"], ["description", "text"], ["published", "boolean"]],
    lesson: [["courseId", "relation"], ["title", "string"], ["content", "text"]],
    enrollment: [["courseId", "relation"], ["studentId", "relation"], ["progress", "number"]],
    post: [["title", "string"], ["body", "text"], ["status", "enum"]],
    asset: [["url", "string"], ["kind", "enum"], ["postId", "relation"]],
    category: [["name", "string"], ["slug", "string"]],
    invoice: [["customerId", "relation"], ["amount", "money"], ["dueDate", "date"], ["status", "enum"]],
    transaction: [["accountId", "relation"], ["amount", "money"], ["postedAt", "date"]],
    account: [["name", "string"], ["type", "enum"], ["balance", "money"]],
    metric: [["name", "string"], ["value", "number"], ["period", "string"]],
    report: [["title", "string"], ["range", "string"], ["ownerId", "relation"]]
  };

  const productPrompts = [
    "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.",
    "Create an ecommerce store with products, cart, orders, customer login, subscription billing, and admin reports.",
    "Build a booking app for clinics with services, availability, customers, reminders, dashboard, and admin analytics.",
    "Create a project management app with teams, tasks, comments, role permissions, dashboard, and notifications.",
    "Build a learning platform with courses, lessons, students, progress dashboard, payments, and admin analytics.",
    "Create a content publishing CMS with login, posts, assets, categories, editor workflow, and audit history.",
    "Build a finance tracker with accounts, invoices, transactions, dashboard, reports, and role-based access.",
    "Create a marketplace app with product listings, orders, customers, payments, and admin metrics.",
    "Build a client portal CRM with companies, contacts, deals, file uploads, premium access, and analytics.",
    "Create a service scheduling platform with booking calendar, customers, payments, notifications, and staff roles."
  ];

  const edgePrompts = [
    "App.",
    "Build something for my team.",
    "CRM with login but no login, and everyone is admin but admins only see analytics.",
    "Free app with premium-only payments and no users.",
    "Dashboard analytics reports metrics.",
    "Build a store without products but sell products and take payments.",
    "Make a project app; roles later; database whatever.",
    "Booking system where customers cannot book but need customer booking pages.",
    "Learning platform with courses, no students, students track progress.",
    "CRM mobile app with contacts maybe deals maybe payments maybe not."
  ];

  function compilePrompt(prompt, options = {}) {
    const startedAt = Date.now();
    const intent = extractIntent(prompt);
    const design = designSystem(intent);
    let config = generateSchemas(design);
    let validation = validateConfig(config);
    let repairs = [];
    let retries = 0;
    if (!validation.valid || options.forceRepair) {
      retries = 1;
      const repaired = repairConfig(config);
      config = repaired.config;
      repairs = repaired.repairs;
      validation = validateConfig(config);
    }
    const runtime = simulateRuntime(config);
    return {
      ok: validation.valid && runtime.ok,
      config,
      validation,
      runtime,
      pipeline: [
        { name: "intent-extraction", durationMs: 0, summary: { productType: intent.productType, features: intent.features, roles: intent.roles, ambiguities: intent.ambiguities } },
        { name: "system-design", durationMs: 0, summary: { pages: design.pages.length, entities: design.entities, flows: design.flows } },
        { name: "schema-generation", durationMs: 0, summary: { pages: config.ui.pages.length, endpoints: config.api.endpoints.length, tables: config.db.tables.length } },
        { name: "refinement-repair", durationMs: 0, summary: { repairs, valid: validation.valid } },
        { name: "execution-simulation", durationMs: 0, summary: { ok: runtime.ok, checks: runtime.checks.length, failures: runtime.failures } }
      ],
      repairs,
      metrics: {
        retries,
        repairCount: repairs.length,
        latencyMs: Date.now() - startedAt,
        estimatedCostUsd: Number((((prompt.length + JSON.stringify(config).length) / 4 / 1000) * 0.0006).toFixed(5))
      },
      clarificationNeeded: clarify(intent)
    };
  }

  function extractIntent(prompt) {
    const text = normalize(prompt);
    const features = Object.keys(featureCatalog).filter((key) => text.includes(key));
    const selectedFeatures = features.length ? features : inferFallbackFeatures(text);
    const capabilities = unique(["auth", "dashboard",
      text.match(/payment|premium|billing|subscription|plan/) ? "payments" : null,
      text.match(/analytics|reports|metrics/) ? "analytics" : null,
      text.match(/role|permission|access|rbac/) ? "rbac" : null,
      text.match(/search|filter/) ? "search" : null,
      text.match(/notification|email|reminder/) ? "notifications" : null,
      text.match(/upload|file|image/) ? "upload" : null
    ]);
    const roles = unique(["admin", "member",
      text.match(/customer|client|buyer|patient|student/) ? "customer" : null,
      text.match(/guest|public|anonymous/) ? "guest" : null
    ]);
    const conflicts = [];
    if (text.includes("no login") && capabilities.includes("auth")) conflicts.push("Prompt both requests login/auth and says no login.");
    if (text.includes("free") && text.match(/premium|subscription/)) conflicts.push("Prompt mixes free access with premium/subscription gating.");
    return {
      stage: "intent",
      rawPrompt: prompt,
      normalizedPrompt: text,
      productType: selectedFeatures[0],
      features: selectedFeatures,
      capabilities,
      roles,
      constraints: {
        hasMobile: text.includes("mobile"),
        hasAdminAnalytics: text.includes("admin") && text.includes("analytics"),
        hasPremiumGate: text.includes("premium") || text.includes("subscription")
      },
      ambiguities: buildAmbiguities(text, features, conflicts),
      conflicts,
      assumptions: []
    };
  }

  function designSystem(intent) {
    const entities = unique(intent.features.flatMap((feature) => featureCatalog[feature]?.entities || []));
    const pages = unique(["login", "dashboard", ...intent.features.flatMap((feature) => featureCatalog[feature]?.pages || []), intent.capabilities.includes("payments") ? "billing" : null, intent.capabilities.includes("analytics") ? "analytics" : null, "settings"]);
    const roles = intent.roles.includes("customer") ? intent.roles : [...intent.roles, "customer"];
    return {
      stage: "system-design",
      app: { name: titleCase(`${intent.productType} workspace`), productType: intent.productType, description: `Generated ${intent.productType} application with ${intent.capabilities.join(", ")}.` },
      entities,
      pages,
      roles,
      flows: unique(intent.features.flatMap((feature) => featureCatalog[feature]?.flows || [])),
      capabilities: intent.capabilities,
      assumptions: intent.ambiguities.length ? ["Used conservative defaults for unspecified fields, CRUD endpoints, and admin-owned analytics."] : [],
      conflicts: intent.conflicts
    };
  }

  function generateSchemas(design) {
    const db = { tables: [userTable(design.roles), ...design.entities.map(tableFor)] };
    if (design.capabilities.includes("payments")) db.tables.push(tableFor("subscription"));
    const api = { endpoints: [endpoint("POST", "/auth/login", "users", "login"), endpoint("POST", "/auth/signup", "users", "signup"), ...db.tables.filter((table) => table.name !== "users").flatMap((table) => crudEndpoints(table.name))] };
    const ui = { pages: design.pages.map((page) => pageConfig(page, db.tables, design.roles)) };
    const auth = {
      roles: design.roles.map((role) => ({ name: role, inherits: role === "admin" ? ["member"] : [] })),
      permissions: design.roles.flatMap((role) => db.tables.map((table) => ({ role, resource: table.name, actions: role === "admin" ? ["create", "read", "update", "delete"] : ["create", "read", "update"] })))
    };
    return { version: "1.0", app: design.app, assumptions: design.assumptions, warnings: design.conflicts, ui, api, db, auth, businessLogic: businessLogic(design.capabilities) };
  }

  function validateConfig(config) {
    const errors = [];
    const warnings = (config.warnings || []).map((message) => ({ code: "PROMPT_CONFLICT", message }));
    const tables = config.db?.tables || [];
    const tableNames = new Set(tables.map((table) => table.name));
    const endpointPaths = new Set((config.api?.endpoints || []).map((endpoint) => endpoint.path));
    ["version", "app", "ui", "api", "db", "auth", "businessLogic"].forEach((key) => {
      if (!(key in config)) errors.push({ code: "MISSING_KEY", message: `Missing top-level key: ${key}`, path: key });
    });
    tables.forEach((table) => {
      if (!table.fields?.some((field) => field.name === "id" && field.primary)) errors.push({ code: "PRIMARY_KEY_MISSING", message: `${table.name} needs primary id field.`, path: table.name });
    });
    (config.api?.endpoints || []).forEach((endpoint) => {
      if (!tableNames.has(endpoint.table)) errors.push({ code: "API_TABLE_MISSING", message: `${endpoint.path} references missing table ${endpoint.table}.`, path: endpoint.path });
    });
    (config.ui?.pages || []).forEach((page) => (page.components || []).forEach((component) => {
      if (component.endpoint && !endpointPaths.has(component.endpoint)) errors.push({ code: "UI_ENDPOINT_MISSING", message: `${component.id} points at missing endpoint ${component.endpoint}.`, path: page.id });
    }));
    return { valid: errors.length === 0, errors, warnings };
  }

  function repairConfig(config) {
    const clone = JSON.parse(JSON.stringify(config));
    const repairs = [];
    (clone.db.tables || []).forEach((table) => {
      if (!table.fields.some((field) => field.name === "id")) {
        table.fields.unshift({ name: "id", type: "uuid", required: true, primary: true });
        repairs.push(`Added id primary key to ${table.name}.`);
      }
    });
    return { config: clone, repairs };
  }

  function simulateRuntime(config) {
    const checks = [
      { name: "db-tables-materialize", passed: config.db.tables.every((table) => table.name && table.fields.length) },
      { name: "api-routes-bind", passed: config.api.endpoints.every((endpoint) => endpoint.method && endpoint.path && endpoint.table) },
      { name: "ui-renders-pages", passed: config.ui.pages.every((page) => page.route && Array.isArray(page.components)) },
      { name: "auth-has-admin", passed: config.auth.roles.some((role) => role.name === "admin") }
    ];
    const failures = checks.filter((check) => !check.passed).map((check) => check.name);
    return {
      ok: failures.length === 0,
      checks,
      failures,
      executablePlan: {
        migrations: config.db.tables.map((table) => `CREATE TABLE ${table.name} (${table.fields.map((field) => field.name).join(", ")});`),
        routes: config.api.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path} -> ${endpoint.table}`),
        pages: config.ui.pages.map((page) => `${page.route} using ${page.layout}`)
      }
    };
  }

  function runEvaluation() {
    const results = [...productPrompts.map((prompt) => ({ kind: "product", prompt })), ...edgePrompts.map((prompt) => ({ kind: "edge", prompt }))].map((item, index) => {
      const result = compilePrompt(item.prompt);
      return { id: index + 1, kind: item.kind, prompt: item.prompt, ok: result.ok, retries: result.metrics.retries, repairCount: result.metrics.repairCount, latencyMs: result.metrics.latencyMs, failureTypes: result.validation.errors.map((error) => error.code), clarificationNeeded: result.clarificationNeeded.required };
    });
    return {
      generatedAt: new Date().toISOString(),
      total: results.length,
      success: results.filter((result) => result.ok).length,
      successRate: Number((results.filter((result) => result.ok).length / results.length).toFixed(2)),
      avgRetries: average(results.map((result) => result.retries)),
      avgLatencyMs: Math.round(average(results.map((result) => result.latencyMs))),
      clarificationRate: Number((results.filter((result) => result.clarificationNeeded).length / results.length).toFixed(2)),
      failureCounts: {},
      costQualityTradeoff: {
        deterministicLocalPass: "Runs low-cost rule-based stages first for predictable structure.",
        selectiveRepair: "Repairs only invalid references/fields instead of regenerating the whole config.",
        staticDeployment: "GitHub Pages runs the compiler in-browser, avoiding paid backend hosting for the demo."
      },
      results
    };
  }

  function tableFor(entity) {
    return { name: entity === "subscription" ? "subscriptions" : pluralize(entity), fields: baseFields(entity === "subscription" ? [["userId", "relation"], ["plan", "enum"], ["status", "enum"], ["currentPeriodEnd", "datetime"]] : fieldLibrary[entity] || [["name", "string"], ["status", "enum"]]) };
  }

  function userTable(roles) {
    return { name: "users", fields: baseFields([["name", "string"], ["email", "email"], ["passwordHash", "string"], ["role", "enum"], ["plan", "enum"]]), enumValues: { role: roles, plan: ["free", "premium"] } };
  }

  function baseFields(fields) {
    return [{ name: "id", type: "uuid", required: true, primary: true }, ...fields.map(([name, type]) => ({ name, type, required: !["text", "boolean"].includes(type) })), { name: "createdAt", type: "datetime", required: true }, { name: "updatedAt", type: "datetime", required: true }];
  }

  function crudEndpoints(tableName) {
    return [endpoint("GET", `/${tableName}`, tableName, `list ${tableName}`), endpoint("POST", `/${tableName}`, tableName, `create ${tableName}`), endpoint("GET", `/${tableName}/:id`, tableName, `read ${tableName}`), endpoint("PATCH", `/${tableName}/:id`, tableName, `update ${tableName}`), endpoint("DELETE", `/${tableName}/:id`, tableName, `delete ${tableName}`)];
  }

  function endpoint(method, path, table, action) {
    return { method, path, action, table, authRequired: !path.startsWith("/auth"), request: method === "GET" || method === "DELETE" ? {} : { bodyRef: table }, response: { bodyRef: table } };
  }

  function pageConfig(page, tables, roles) {
    const productTables = tables.filter((table) => table.name !== "users");
    const matched = productTables.find((table) => page.includes(table.name.replace(/s$/, ""))) || productTables[0] || tables[0];
    return {
      id: page,
      route: page === "dashboard" ? "/" : `/${page}`,
      layout: page === "login" ? "centered" : "app-shell",
      components: page === "login"
        ? [{ type: "form", id: "loginForm", endpoint: "/auth/login", fields: ["email", "password"] }]
        : [{ type: "nav", id: `${page}Nav`, roles }, { type: "table", id: `${page}Table`, endpoint: `/${matched.name}`, fields: matched.fields.slice(0, 5).map((field) => field.name) }, { type: "form", id: `${page}Form`, endpoint: `/${matched.name}`, fields: matched.fields.filter((field) => !["id", "createdAt", "updatedAt"].includes(field.name)).map((field) => field.name) }]
    };
  }

  function businessLogic(capabilities) {
    const rules = [{ id: "auth-required", when: "endpoint.authRequired == true", then: "require authenticated user" }, { id: "role-permissions", when: "request.user.role", then: "enforce auth.permissions" }];
    if (capabilities.includes("payments")) rules.push({ id: "premium-gate", when: "feature.requiresPlan == premium", then: "require active subscription" });
    if (capabilities.includes("analytics")) rules.push({ id: "admin-analytics", when: "route == /analytics", then: "allow admin or analytics read permission" });
    return { rules };
  }

  function clarify(intent) {
    if (intent.conflicts.length) return { required: true, questions: intent.conflicts.map((conflict) => `Please resolve: ${conflict}`) };
    if (intent.normalizedPrompt.split(" ").length < 4) return { required: true, questions: ["What users, core workflow, and data should the app manage?"] };
    return { required: false, questions: [] };
  }

  function inferFallbackFeatures(text) {
    if (text.includes("shop") || text.includes("sell") || text.includes("store")) return ["ecommerce"];
    if (text.includes("task") || text.includes("team")) return ["project"];
    if (text.includes("course") || text.includes("student")) return ["learning"];
    if (text.includes("booking") || text.includes("schedule")) return ["booking"];
    return ["crm"];
  }

  function buildAmbiguities(text, features, conflicts) {
    return [...(text.split(" ").length < 6 ? ["Prompt is very short."] : []), ...(features.length ? [] : ["Product category was inferred."]), ...(!text.includes("role") && !text.includes("admin") ? ["Roles were not fully specified."] : []), ...conflicts];
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function pluralize(value) {
    if (value.endsWith("y")) return `${value.slice(0, -1)}ies`;
    if (value.endsWith("s")) return value;
    return `${value}s`;
  }

  function titleCase(value) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function average(values) {
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  }

  window.AppCompiler = { compilePrompt, runEvaluation };
})();
