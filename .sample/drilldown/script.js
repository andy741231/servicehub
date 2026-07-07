const menuData = [
  {
    id: "account",
    label: "Account",
    icon: "user",
    children: [
      {
        id: "profile",
        label: "Profile",
        icon: "id",
        children: [
          { id: "name", label: "Display Name", icon: "text" },
          { id: "avatar", label: "Avatar", icon: "image" },
          { id: "bio", label: "Bio", icon: "align-left" }
        ]
      },
      {
        id: "security",
        label: "Security",
        icon: "shield",
        children: [
          { id: "password", label: "Password", icon: "lock" },
          { id: "2fa", label: "Two-Factor Auth", icon: "smartphone" },
          { id: "sessions", label: "Active Sessions", icon: "monitor" }
        ]
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: "bell",
        children: [
          { id: "email-notif", label: "Email", icon: "mail" },
          { id: "push-notif", label: "Push", icon: "smartphone" },
          { id: "sms-notif", label: "SMS", icon: "message-square" }
        ]
      }
    ]
  },
  {
    id: "content",
    label: "Content",
    icon: "layout",
    children: [
      {
        id: "pages",
        label: "Pages",
        icon: "file-text",
        children: [
          { id: "home", label: "Homepage", icon: "home" },
          { id: "about", label: "About", icon: "info" },
          { id: "contact", label: "Contact", icon: "mail" }
        ]
      },
      {
        id: "media",
        label: "Media",
        icon: "image",
        children: [
          { id: "gallery", label: "Gallery", icon: "grid" },
          { id: "uploads", label: "Uploads", icon: "upload" },
          { id: "embeds", label: "Embeds", icon: "code" }
        ]
      }
    ]
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: "shopping-bag",
    children: [
      {
        id: "products",
        label: "Products",
        icon: "package",
        children: [
          { id: "inventory", label: "Inventory", icon: "list" },
          { id: "categories", label: "Categories", icon: "tag" },
          { id: "reviews", label: "Reviews", icon: "star" }
        ]
      },
      {
        id: "orders",
        label: "Orders",
        icon: "truck",
        children: [
          { id: "all-orders", label: "All Orders", icon: "clipboard" },
          { id: "fulfillment", label: "Fulfillment", icon: "box" },
          { id: "returns", label: "Returns", icon: "rotate-ccw" }
        ]
      }
    ]
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "bar-chart",
    children: [
      {
        id: "traffic",
        label: "Traffic",
        icon: "users",
        children: [
          { id: "overview", label: "Overview", icon: "pie-chart" },
          { id: "sources", label: "Sources", icon: "link" },
          { id: "realtime", label: "Realtime", icon: "activity" }
        ]
      }
    ]
  }
];

const icons = {
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  id: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  text: '<line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  "align-left": '<line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  "shopping-bag": '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  "rotate-ccw": '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  "bar-chart": '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  "pie-chart": '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
};

const rootNav = document.getElementById("menu-root");
const backBtn = document.getElementById("back-btn");
const titleEl = document.getElementById("menu-title");
const selectedPathEl = document.getElementById("selected-path");

let stack = [];

function svgIcon(name) {
  const path = icons[name] || icons["layout"];
  return `<svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function chevronRight() {
  return `<svg class="menu-item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
}

function getCurrentItems() {
  let items = menuData;
  for (const frame of stack) {
    const found = items.find((i) => i.id === frame.id);
    items = found ? found.children || [] : [];
  }
  return items;
}

function getCurrentTitle() {
  if (stack.length === 0) return "Menu";
  return stack[stack.length - 1].label;
}

function updateSelectedPath() {
  if (stack.length === 0) {
    selectedPathEl.textContent = "Selected: —";
    return;
  }
  const path = stack.map((frame) => frame.label).join(" / ");
  selectedPathEl.textContent = `Selected: ${path}`;
}

function renderMenu() {
  const items = getCurrentItems();
  const title = getCurrentTitle();

  titleEl.textContent = title;
  backBtn.classList.toggle("visible", stack.length > 0);

  rootNav.innerHTML = "";
  rootNav.classList.remove("is-entering", "is-leaving");
  void rootNav.offsetWidth; // trigger reflow
  rootNav.classList.add("is-entering");

  items.forEach((item) => {
    const button = document.createElement("button");
    button.className = "menu-item";
    button.type = "button";

    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    button.innerHTML = `
      <span class="menu-item-label">
        ${svgIcon(item.icon)}
        ${item.label}
      </span>
      ${hasChildren ? chevronRight() : ""}
    `;

    button.addEventListener("click", () => {
      if (hasChildren) {
        stack.push({ id: item.id, label: item.label });
        renderMenu();
        updateSelectedPath();
      } else {
        stack.push({ id: item.id, label: item.label });
        updateSelectedPath();
        stack.pop();
      }
    });

    rootNav.appendChild(button);
  });
}

backBtn.addEventListener("click", () => {
  if (stack.length === 0) return;
  rootNav.classList.add("is-leaving");
  setTimeout(() => {
    stack.pop();
    renderMenu();
    updateSelectedPath();
  }, 180);
});

renderMenu();
updateSelectedPath();
