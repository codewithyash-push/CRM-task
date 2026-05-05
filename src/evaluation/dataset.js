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

module.exports = { productPrompts, edgePrompts };
