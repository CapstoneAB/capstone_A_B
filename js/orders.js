// Buildmart — My Orders page
// Reads the logged-in user's orders from GET /api/users/:id/orders, shows one order's
// items from GET /api/orders/:orderId, and cancels with PATCH /api/orders/:orderId.

(function () {
  const TOKEN_KEY = "buildmartToken";
  const PAGE_SIZE = 5;
  const SERVER_HELP = "Could not reach the server. Start the backend (npm start in backend/) and open this page from http://localhost:3000/orders.html.";

  const message = document.getElementById("ordersMessage");
  const area = document.getElementById("ordersArea");
  const list = document.getElementById("ordersList");
  const filters = document.getElementById("orderFilters");
  const prev = document.getElementById("prevPage");
  const next = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  let user = null;
  let page = 1;

  function readToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {"Content-Type": "application/json", Authorization: `Bearer ${readToken()}`}
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Something went wrong. Please try again.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  // Text goes in with textContent, so nothing from the server is read as HTML
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  const money = value => `$${Number(value).toFixed(2)}`;
  // SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; show it in the user's local time
  const when = text => new Date(text.replace(" ", "T") + "Z").toLocaleString("en-AU", {dateStyle: "medium", timeStyle: "short"});

  function showMessage(text, linkText, linkHref) {
    message.replaceChildren(document.createTextNode(text));
    if (linkText) {
      message.append(" ");
      const link = el("a", linkText);
      link.href = linkHref;
      message.append(link);
    }
  }

  function filterQuery() {
    const params = new URLSearchParams({page: String(page), limit: String(PAGE_SIZE)});
    const add = (name, id) => {
      const value = document.getElementById(id).value.trim();
      if (value) params.set(name, value);
    };
    add("status", "statusFilter");
    add("from", "fromFilter");
    add("to", "toFilter");
    add("min_total", "minFilter");
    add("max_total", "maxFilter");
    return params.toString();
  }

  function cell(label, value, className) {
    const span = el("span", undefined, className);
    span.append(el("span", label, "label"), document.createTextNode(value));
    return span;
  }

  function renderOrder(summary) {
    const details = el("details", undefined, "order");
    const head = el("summary");
    head.append(
      cell("Order", `#${summary.order_id}`),
      cell("Date", when(summary.created_at)),
      cell("Items", String(summary.item_count)),
      cell("Total", money(summary.total)),
      cell("Status", summary.status, `status status-${summary.status}`)
    );
    const body = el("div", "Loading items…", "order-body");
    details.append(head, body);
    // Items are only fetched the first time the order is opened
    details.addEventListener("toggle", () => {
      if (details.open && !details.dataset.loaded) {
        details.dataset.loaded = "yes";
        loadOrderDetails(summary.order_id, body);
      }
    });
    return details;
  }

  async function loadOrderDetails(orderId, body) {
    try {
      const order = await api(`/api/orders/${orderId}`);
      const table = el("table");
      const headRow = el("tr");
      headRow.append(el("th", "Product"), el("th", "Price", "num"), el("th", "Qty", "num"), el("th", "Subtotal", "num"));
      table.append(headRow);
      for (const item of order.items) {
        const row = el("tr");
        row.append(el("td", item.product_name), el("td", money(item.unit_price), "num"),
          el("td", String(item.quantity), "num"), el("td", money(item.subtotal), "num"));
        table.append(row);
      }
      const actions = el("div", undefined, "order-actions");
      actions.append(el("span", `GST included: ${money(order.gst_included)} · Total: ${money(order.total)}`));
      if (order.status === "Placed") {
        const cancel = el("button", "Cancel order", "plain-btn");
        cancel.type = "button";
        cancel.addEventListener("click", () => cancelOrder(order.order_id, cancel));
        actions.append(cancel);
      }
      body.replaceChildren(table, actions);
    } catch (err) {
      body.textContent = err instanceof TypeError ? SERVER_HELP : err.message;
    }
  }

  async function cancelOrder(orderId, button) {
    if (!window.confirm(`Cancel order #${orderId}? The items go back into stock.`)) return;
    button.disabled = true;
    try {
      await api(`/api/orders/${orderId}`, {method: "PATCH", body: JSON.stringify({status: "Cancelled"})});
      showMessage(`Order #${orderId} has been cancelled.`);
      await loadOrders();
    } catch (err) {
      showMessage(err instanceof TypeError ? SERVER_HELP : err.message);
      button.disabled = false;
    }
  }

  async function loadOrders() {
    try {
      const data = await api(`/api/users/${user.user_id}/orders?${filterQuery()}`);
      const pages = Math.max(1, Math.ceil(data.total_count / PAGE_SIZE));
      if (data.orders.length === 0) {
        const empty = el("p", "No orders to show. ", "page-sub");
        const link = el("a", "Go to the shop");
        link.href = "shop.html";
        empty.append(link);
        list.replaceChildren(empty);
      } else {
        list.replaceChildren(...data.orders.map(renderOrder));
      }
      pageInfo.textContent = `Page ${data.page} of ${pages} (${data.total_count} order${data.total_count === 1 ? "" : "s"})`;
      prev.disabled = data.page <= 1;
      next.disabled = data.page >= pages;
    } catch (err) {
      showMessage(err instanceof TypeError ? SERVER_HELP : err.message);
    }
  }

  filters.addEventListener("submit", event => {
    event.preventDefault();
    page = 1;
    showMessage("");
    loadOrders();
  });
  // Clearing the form shows every order again
  filters.addEventListener("reset", () => {
    page = 1;
    setTimeout(loadOrders); // after the browser has emptied the fields
  });
  prev.addEventListener("click", () => { page -= 1; loadOrders(); });
  next.addEventListener("click", () => { page += 1; loadOrders(); });

  // Only a logged-in user has orders
  async function start() {
    if (!readToken()) {
      showMessage("Please log in to see your orders.", "Log in", "login.html");
      return;
    }
    try {
      user = (await api("/auth/verify")).user;
    } catch (err) {
      if (err.status === 401) {
        try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
        showMessage("Your login has expired. Please log in again.", "Log in", "login.html");
      } else {
        showMessage(err instanceof TypeError ? SERVER_HELP : err.message);
      }
      return;
    }
    area.hidden = false;
    loadOrders();
  }
  start();
})();
