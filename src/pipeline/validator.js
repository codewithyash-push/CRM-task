const REQUIRED_TOP_LEVEL = ["version", "app", "ui", "api", "db", "auth", "businessLogic"];
const FIELD_TYPES = new Set(["uuid", "string", "email", "text", "enum", "money", "number", "boolean", "datetime", "date", "relation"]);
const METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { valid: false, errors: [{ code: "INVALID_ROOT", message: "Config root must be an object." }], warnings };
  }

  for (const key of REQUIRED_TOP_LEVEL) {
    if (!(key in config)) errors.push(error("MISSING_KEY", `Missing top-level key: ${key}`, key));
  }

  const tables = config.db?.tables || [];
  const tableNames = new Set(tables.map((table) => table.name));
  const endpointPaths = new Set((config.api?.endpoints || []).map((endpoint) => endpoint.path));

  for (const table of tables) {
    if (!table.name) errors.push(error("TABLE_NAME_MISSING", "A database table is missing name.", "db.tables"));
    if (!Array.isArray(table.fields)) errors.push(error("TABLE_FIELDS_MISSING", `Table ${table.name} must have fields array.`, `db.${table.name}`));
    for (const field of table.fields || []) {
      if (!field.name) errors.push(error("FIELD_NAME_MISSING", `Table ${table.name} has an unnamed field.`, table.name));
      if (!FIELD_TYPES.has(field.type)) errors.push(error("UNKNOWN_FIELD_TYPE", `${table.name}.${field.name} uses unsupported type ${field.type}.`, table.name));
    }
    if (!(table.fields || []).some((field) => field.name === "id" && field.primary)) {
      errors.push(error("PRIMARY_KEY_MISSING", `Table ${table.name} needs primary id field.`, table.name));
    }
  }

  for (const endpoint of config.api?.endpoints || []) {
    if (!METHODS.has(endpoint.method)) errors.push(error("INVALID_METHOD", `${endpoint.path} uses invalid method ${endpoint.method}.`, endpoint.path));
    if (!tableNames.has(endpoint.table)) errors.push(error("API_TABLE_MISSING", `${endpoint.path} references missing table ${endpoint.table}.`, endpoint.path));
    if (endpoint.request?.bodyRef && !tableNames.has(endpoint.request.bodyRef)) {
      errors.push(error("API_REQUEST_REF_MISSING", `${endpoint.path} request references missing table ${endpoint.request.bodyRef}.`, endpoint.path));
    }
  }

  for (const page of config.ui?.pages || []) {
    if (!page.id || !page.route) errors.push(error("PAGE_SHAPE_INVALID", "Each page needs id and route.", "ui.pages"));
    for (const component of page.components || []) {
      if (component.endpoint && !endpointPaths.has(component.endpoint)) {
        errors.push(error("UI_ENDPOINT_MISSING", `${page.id}.${component.id} points at missing endpoint ${component.endpoint}.`, page.id));
      }
      if (component.endpoint && component.fields?.length) {
        const endpoint = (config.api?.endpoints || []).find((candidate) => candidate.path === component.endpoint);
        const table = tables.find((candidate) => candidate.name === endpoint?.table);
        const fieldNames = new Set((table?.fields || []).map((field) => field.name));
        for (const field of component.fields) {
          if (field !== "password" && !fieldNames.has(field)) {
            errors.push(error("UI_FIELD_MISSING", `${page.id}.${component.id} uses ${field}, absent from ${table?.name}.`, page.id));
          }
        }
      }
    }
  }

  for (const permission of config.auth?.permissions || []) {
    if (!tableNames.has(permission.resource)) {
      errors.push(error("PERMISSION_RESOURCE_MISSING", `${permission.role} references missing resource ${permission.resource}.`, permission.role));
    }
  }

  if ((config.warnings || []).length) {
    warnings.push(...config.warnings.map((message) => ({ code: "PROMPT_CONFLICT", message })));
  }

  return { valid: errors.length === 0, errors, warnings };
}

function error(code, message, path) {
  return { code, message, path };
}

module.exports = { validateConfig };
