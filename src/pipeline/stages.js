const { FEATURE_CATALOG, ROLE_KEYWORDS, CAPABILITY_KEYWORDS, FIELD_LIBRARY } = require("./catalog");

function extractIntent(prompt) {
  const text = normalize(prompt);
  const features = Object.keys(FEATURE_CATALOG).filter((key) => text.includes(key));
  const capabilities = Object.entries(CAPABILITY_KEYWORDS)
    .filter(([, words]) => words.some((word) => text.includes(word)))
    .map(([key]) => key);
  const roles = Object.entries(ROLE_KEYWORDS)
    .filter(([, words]) => words.some((word) => text.includes(word)))
    .map(([key]) => key);
  const conflicts = [];

  if (text.includes("no login") && capabilities.includes("auth")) {
    conflicts.push("Prompt both requests login/auth and says no login.");
  }
  if (text.includes("free") && (text.includes("premium") || text.includes("subscription"))) {
    conflicts.push("Prompt mixes free access with premium/subscription gating.");
  }

  const selectedFeatures = features.length ? features : inferFallbackFeatures(text);
  return {
    stage: "intent",
    rawPrompt: prompt,
    normalizedPrompt: text,
    productType: selectedFeatures[0],
    features: selectedFeatures,
    capabilities: uniq(["auth", "dashboard", ...capabilities]),
    roles: uniq(["admin", "member", ...roles]),
    constraints: extractConstraints(text),
    ambiguities: buildAmbiguities(text, selectedFeatures, conflicts),
    conflicts,
    assumptions: []
  };
}

function designSystem(intent) {
  const entities = uniq(intent.features.flatMap((feature) => FEATURE_CATALOG[feature]?.entities || []));
  const flows = uniq(intent.features.flatMap((feature) => FEATURE_CATALOG[feature]?.flows || []));
  const pages = uniq([
    "login",
    "dashboard",
    ...intent.features.flatMap((feature) => FEATURE_CATALOG[feature]?.pages || []),
    intent.capabilities.includes("payments") ? "billing" : null,
    intent.capabilities.includes("analytics") ? "analytics" : null,
    "settings"
  ].filter(Boolean));

  const roles = intent.roles.includes("customer") ? intent.roles : [...intent.roles, "customer"];
  const assumptions = [...intent.assumptions];
  if (intent.ambiguities.length) {
    assumptions.push("Used conservative defaults for unspecified fields, CRUD endpoints, and admin-owned analytics.");
  }

  return {
    stage: "system-design",
    app: {
      name: titleCase(`${intent.productType} workspace`),
      productType: intent.productType,
      description: `Generated ${intent.productType} application with ${intent.capabilities.join(", ")}.`
    },
    entities,
    pages,
    roles,
    flows,
    capabilities: intent.capabilities,
    assumptions,
    conflicts: intent.conflicts
  };
}

function generateSchemas(design) {
  const db = {
    tables: [
      userTable(design.roles),
      ...design.entities.map((entity) => tableFor(entity))
    ]
  };

  if (design.capabilities.includes("payments")) {
    db.tables.push(tableFor("subscription"));
  }

  const api = {
    endpoints: [
      endpoint("POST", "/auth/login", "users", "login"),
      endpoint("POST", "/auth/signup", "users", "signup"),
      ...db.tables
        .filter((table) => table.name !== "users")
        .flatMap((table) => crudEndpoints(table.name))
    ]
  };

  const ui = {
    pages: design.pages.map((page) => pageConfig(page, db.tables, design.roles))
  };

  const auth = {
    roles: design.roles.map((role) => ({ name: role, inherits: role === "admin" ? ["member"] : [] })),
    permissions: buildPermissions(design.roles, db.tables, design.capabilities)
  };

  return {
    version: "1.0",
    app: design.app,
    assumptions: design.assumptions,
    warnings: design.conflicts,
    ui,
    api,
    db,
    auth,
    businessLogic: buildBusinessLogic(design.capabilities)
  };
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function inferFallbackFeatures(text) {
  if (text.includes("shop") || text.includes("sell")) return ["ecommerce"];
  if (text.includes("task") || text.includes("team")) return ["project"];
  if (text.includes("course") || text.includes("student")) return ["learning"];
  return ["crm"];
}

function extractConstraints(text) {
  return {
    hasMobile: text.includes("mobile"),
    hasAdminAnalytics: text.includes("admin") && text.includes("analytics"),
    hasPremiumGate: text.includes("premium") || text.includes("subscription")
  };
}

function buildAmbiguities(text, features, conflicts) {
  const ambiguities = [];
  if (text.split(" ").length < 6) ambiguities.push("Prompt is very short.");
  if (!features.length) ambiguities.push("Product category was inferred.");
  if (!text.includes("role") && !text.includes("admin")) ambiguities.push("Roles were not fully specified.");
  return [...ambiguities, ...conflicts];
}

function tableFor(entity) {
  if (entity === "subscription") {
    return {
      name: "subscriptions",
      fields: baseFields([
        ["userId", "relation"],
        ["plan", "enum"],
        ["status", "enum"],
        ["currentPeriodEnd", "datetime"]
      ])
    };
  }
  return {
    name: pluralize(entity),
    fields: baseFields(FIELD_LIBRARY[entity] || [["name", "string"], ["status", "enum"]])
  };
}

function userTable(roles) {
  return {
    name: "users",
    fields: baseFields([
      ["name", "string"],
      ["email", "email"],
      ["passwordHash", "string"],
      ["role", "enum"],
      ["plan", "enum"]
    ]),
    enumValues: { role: roles, plan: ["free", "premium"] }
  };
}

function baseFields(fields) {
  return [
    { name: "id", type: "uuid", required: true, primary: true },
    ...fields.map(([name, type]) => ({ name, type, required: !["text", "boolean"].includes(type) })),
    { name: "createdAt", type: "datetime", required: true },
    { name: "updatedAt", type: "datetime", required: true }
  ];
}

function crudEndpoints(tableName) {
  const resource = tableName.replace(/s$/, "");
  return [
    endpoint("GET", `/${tableName}`, tableName, `list ${tableName}`),
    endpoint("POST", `/${tableName}`, tableName, `create ${resource}`),
    endpoint("GET", `/${tableName}/:id`, tableName, `read ${resource}`),
    endpoint("PATCH", `/${tableName}/:id`, tableName, `update ${resource}`),
    endpoint("DELETE", `/${tableName}/:id`, tableName, `delete ${resource}`)
  ];
}

function endpoint(method, path, table, action) {
  return {
    method,
    path,
    action,
    table,
    authRequired: !path.startsWith("/auth"),
    request: method === "GET" || method === "DELETE" ? {} : { bodyRef: table },
    response: { bodyRef: table }
  };
}

function pageConfig(page, tables, roles) {
  const productTables = tables.filter((table) => table.name !== "users");
  const matched = productTables.find((table) => page.includes(table.name.replace(/s$/, ""))) || productTables[0] || tables[0];
  const components = page === "login"
    ? [{ type: "form", id: "loginForm", endpoint: "/auth/login", fields: ["email", "password"] }]
    : [
        { type: "nav", id: `${page}Nav`, roles },
        { type: "table", id: `${page}Table`, endpoint: `/${matched.name}`, fields: matched.fields.slice(0, 5).map((field) => field.name) },
        { type: "form", id: `${page}Form`, endpoint: `/${matched.name}`, fields: matched.fields.filter((field) => !["id", "createdAt", "updatedAt"].includes(field.name)).map((field) => field.name) }
      ];

  return {
    id: page,
    route: page === "dashboard" ? "/" : `/${page}`,
    layout: page === "login" ? "centered" : "app-shell",
    components
  };
}

function buildPermissions(roles, tables, capabilities) {
  return roles.flatMap((role) => tables.map((table) => ({
    role,
    resource: table.name,
    actions: role === "admin" ? ["create", "read", "update", "delete"] : memberActions(role, table.name, capabilities)
  })));
}

function memberActions(role, table, capabilities) {
  if (role === "guest") return ["read"];
  if (table === "reports" || table === "metrics") return capabilities.includes("analytics") ? ["read"] : [];
  return ["create", "read", "update"];
}

function buildBusinessLogic(capabilities) {
  const rules = [
    { id: "auth-required", when: "endpoint.authRequired == true", then: "require authenticated user" },
    { id: "role-permissions", when: "request.user.role", then: "enforce auth.permissions" }
  ];
  if (capabilities.includes("payments")) {
    rules.push({ id: "premium-gate", when: "feature.requiresPlan == premium", then: "require active subscription" });
  }
  if (capabilities.includes("analytics")) {
    rules.push({ id: "admin-analytics", when: "route == /analytics", then: "allow admin or analytics read permission" });
  }
  return { rules };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function pluralize(value) {
  if (value.endsWith("y")) return `${value.slice(0, -1)}ies`;
  if (value.endsWith("s")) return value;
  return `${value}s`;
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = { extractIntent, designSystem, generateSchemas };
