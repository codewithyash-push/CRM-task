const { validateConfig } = require("./validator");

function repairConfig(config) {
  const repairs = [];
  let next = JSON.parse(JSON.stringify(config));

  next = ensureTopLevel(next, repairs);
  next = ensurePrimaryKeys(next, repairs);
  next = repairApiRefs(next, repairs);
  next = repairUiRefs(next, repairs);
  next = repairPermissions(next, repairs);

  const validation = validateConfig(next);
  return { config: next, repairs, validation };
}

function ensureTopLevel(config, repairs) {
  const next = config && typeof config === "object" ? config : {};
  if (!next.version) { next.version = "1.0"; repairs.push("Added version."); }
  if (!next.app) { next.app = { name: "Generated App", productType: "generic", description: "Generated application." }; repairs.push("Added app metadata."); }
  if (!next.ui) { next.ui = { pages: [] }; repairs.push("Added UI block."); }
  if (!next.api) { next.api = { endpoints: [] }; repairs.push("Added API block."); }
  if (!next.db) { next.db = { tables: [] }; repairs.push("Added DB block."); }
  if (!next.auth) { next.auth = { roles: [], permissions: [] }; repairs.push("Added auth block."); }
  if (!next.businessLogic) { next.businessLogic = { rules: [] }; repairs.push("Added businessLogic block."); }
  return next;
}

function ensurePrimaryKeys(config, repairs) {
  for (const table of config.db.tables || []) {
    table.fields = Array.isArray(table.fields) ? table.fields : [];
    if (!table.fields.some((field) => field.name === "id")) {
      table.fields.unshift({ name: "id", type: "uuid", required: true, primary: true });
      repairs.push(`Added id primary key to ${table.name}.`);
    }
    const id = table.fields.find((field) => field.name === "id");
    id.type = "uuid";
    id.required = true;
    id.primary = true;
  }
  return config;
}

function repairApiRefs(config, repairs) {
  const tableNames = new Set((config.db.tables || []).map((table) => table.name));
  config.api.endpoints = (config.api.endpoints || []).filter((endpoint) => {
    if (!tableNames.has(endpoint.table)) {
      repairs.push(`Removed endpoint ${endpoint.path} because table ${endpoint.table} does not exist.`);
      return false;
    }
    return true;
  });
  return config;
}

function repairUiRefs(config, repairs) {
  const endpoints = new Map((config.api.endpoints || []).map((endpoint) => [endpoint.path, endpoint]));
  const tables = new Map((config.db.tables || []).map((table) => [table.name, table]));

  for (const page of config.ui.pages || []) {
    page.components = (page.components || []).filter((component) => {
      if (!component.endpoint || endpoints.has(component.endpoint)) return true;
      repairs.push(`Removed UI component ${component.id} because endpoint ${component.endpoint} is missing.`);
      return false;
    });

    for (const component of page.components || []) {
      const endpoint = endpoints.get(component.endpoint);
      const table = tables.get(endpoint?.table);
      if (!table || !Array.isArray(component.fields)) continue;
      const allowed = new Set(table.fields.map((field) => field.name));
      component.fields = component.fields.filter((field) => {
        const keep = field === "password" || allowed.has(field);
        if (!keep) repairs.push(`Removed hallucinated UI field ${field} from ${component.id}.`);
        return keep;
      });
    }
  }
  return config;
}

function repairPermissions(config, repairs) {
  const tableNames = new Set((config.db.tables || []).map((table) => table.name));
  config.auth.permissions = (config.auth.permissions || []).filter((permission) => {
    if (tableNames.has(permission.resource)) return true;
    repairs.push(`Removed permission for missing resource ${permission.resource}.`);
    return false;
  });
  return config;
}

module.exports = { repairConfig };
