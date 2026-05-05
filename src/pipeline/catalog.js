const FEATURE_CATALOG = {
  crm: {
    entities: ["contact", "company", "deal", "activity"],
    pages: ["dashboard", "contacts", "companies", "deals"],
    flows: ["manage contacts", "track pipeline"]
  },
  ecommerce: {
    entities: ["product", "order", "customer", "payment"],
    pages: ["storefront", "products", "cart", "orders"],
    flows: ["browse products", "checkout"]
  },
  booking: {
    entities: ["service", "booking", "customer", "availability"],
    pages: ["calendar", "bookings", "services"],
    flows: ["schedule booking", "manage availability"]
  },
  analytics: {
    entities: ["metric", "report"],
    pages: ["analytics"],
    flows: ["view analytics"]
  },
  project: {
    entities: ["project", "task", "comment"],
    pages: ["projects", "tasks"],
    flows: ["assign tasks", "track status"]
  },
  learning: {
    entities: ["course", "lesson", "enrollment"],
    pages: ["courses", "lessons", "progress"],
    flows: ["consume lessons", "track learning"]
  },
  content: {
    entities: ["post", "asset", "category"],
    pages: ["content", "editor"],
    flows: ["publish content"]
  },
  finance: {
    entities: ["invoice", "transaction", "account"],
    pages: ["invoices", "transactions"],
    flows: ["record payments"]
  }
};

const ROLE_KEYWORDS = {
  admin: ["admin", "owner", "manager"],
  member: ["member", "user", "agent", "employee"],
  customer: ["customer", "client", "buyer", "patient", "student"],
  guest: ["guest", "public", "anonymous"]
};

const CAPABILITY_KEYWORDS = {
  auth: ["login", "signup", "sign in", "authentication", "auth"],
  payments: ["payment", "payments", "stripe", "subscription", "premium", "plan", "billing"],
  dashboard: ["dashboard", "home"],
  analytics: ["analytics", "reports", "metrics"],
  rbac: ["role", "roles", "permission", "access", "rbac"],
  search: ["search", "filter"],
  notifications: ["notification", "email", "reminder"],
  upload: ["upload", "file", "image"],
  audit: ["audit", "log", "history"]
};

const FIELD_LIBRARY = {
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
  metric: [["name", "string"], ["value", "number"], ["period", "string"]],
  report: [["title", "string"], ["range", "string"], ["ownerId", "relation"]],
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
  account: [["name", "string"], ["type", "enum"], ["balance", "money"]]
};

module.exports = { FEATURE_CATALOG, ROLE_KEYWORDS, CAPABILITY_KEYWORDS, FIELD_LIBRARY };
