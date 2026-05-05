function simulateRuntime(config) {
  const checks = [];
  const failures = [];

  check("db-tables-materialize", () => config.db.tables.every((table) => table.name && table.fields.length), checks, failures);
  check("api-routes-bind", () => config.api.endpoints.every((endpoint) => endpoint.method && endpoint.path && endpoint.table), checks, failures);
  check("ui-renders-pages", () => config.ui.pages.every((page) => page.route && Array.isArray(page.components)), checks, failures);
  check("auth-has-admin", () => config.auth.roles.some((role) => role.name === "admin"), checks, failures);
  check("crud-has-backed-table", () => {
    const tables = new Set(config.db.tables.map((table) => table.name));
    return config.api.endpoints.every((endpoint) => tables.has(endpoint.table));
  }, checks, failures);

  const executablePlan = {
    migrations: config.db.tables.map((table) => `CREATE TABLE ${table.name} (${table.fields.map((field) => field.name).join(", ")});`),
    routes: config.api.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path} -> ${endpoint.table}`),
    pages: config.ui.pages.map((page) => `${page.route} using ${page.layout}`)
  };

  return { ok: failures.length === 0, checks, failures, executablePlan };
}

function check(name, predicate, checks, failures) {
  const passed = Boolean(predicate());
  checks.push({ name, passed });
  if (!passed) failures.push(name);
}

module.exports = { simulateRuntime };
