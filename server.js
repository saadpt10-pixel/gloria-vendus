"use strict";

const express = require("express");
const axios = require("axios");

const app = express();

// GloriaFood sends JSON
app.use(express.json({ limit: "1mb" }));

/**
 * Health check (Browser + Railway)
 */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * Optional: simple ping endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * GloriaFood webhook endpoint (POST)
 * In GloriaFood, your "Endpoint URL" should be:
 * https://YOUR-RAILWAY-DOMAIN/
 */
app.post("/", async (req, res) => {
  // Always respond quickly so GloriaFood doesn't retry
  res.status(200).send("OK");

  try {
    const order = req.body || {};

    // --- OPTIONAL SECURITY CHECK (recommended) ---
    // If you saved these in Railway variables, enable this check.
    // GloriaFood "Master key" + "Restaurant Token" are usually sent in payload
    // or can be set by their integration tool. Because formats differ, we check both
    // body and headers in a tolerant way.
    const expectedMaster = process.env.GLORIA_MASTER_KEY;
    const expectedToken = process.env.GLORIA_RESTAURANT_TOKEN;

    const providedMaster =
      order.master_key ||
      order.masterKey ||
      req.headers["x-master-key"] ||
      req.headers["master-key"];

    const providedToken =
      order.restaurant_token ||
      order.restaurantToken ||
      order.token ||
      req.headers["x-restaurant-token"] ||
      req.headers["restaurant-token"];

    // If you want to enforce it, uncomment below:
    /*
    if (expectedMaster && expectedToken) {
      if (String(providedMaster || "") !== String(expectedMaster)) {
        console.warn("Rejected: invalid master key");
        return;
      }
      if (String(providedToken || "") !== String(expectedToken)) {
        console.warn("Rejected: invalid restaurant token");
        return;
      }
    }
    */

    // --- Build a Vendus document payload ---
    const vendusApiKey = process.env.VENDUS_API_KEY;
    if (!vendusApiKey) {
      console.error("Missing VENDUS_API_KEY in Railway variables.");
      return;
    }

    // GloriaFood order id can appear in different fields depending on integration
    const orderId =
      order.order_id ||
      order.orderId ||
      order.id ||
      order.order?.id ||
      order.order?.order_id ||
      "unknown";

    // Customer
    const customerName =
      order.customer?.name ||
      order.customer_name ||
      order.customerName ||
      "Cliente Online";

    const customerEmail =
      order.customer?.email ||
      order.customer_email ||
      order.customerEmail ||
      "";

    // Items: try common shapes
    const items =
      order.items ||
      order.order?.items ||
      order.cart?.items ||
      order.products ||
      [];

    const lines = Array.isArray(items)
      ? items.map((item, idx) => {
          const qty = Number(item.quantity ?? item.qty ?? 1) || 1;

          // price might be in cents or in normal currency depending on source
          // keep as given; adjust if your Vendus expects a specific format
          const priceRaw = item.price ?? item.unit_price ?? item.unitPrice ?? 0;
          const price = Number(priceRaw) || 0;

          const ref =
            item.id ||
            item.product_id ||
            item.productId ||
            item.sku ||
            String(idx + 1);

          return {
            ref,
            qty,
            price,
            // If Vendus expects description fields, you can add:
            // description: item.name || item.title || `Item ${idx + 1}`,
          };
        })
      : [];

    // Minimum safe document
    const vendusPayload = {
      api_key: vendusApiKey,
      type: "FT", // invoice type (keep what you used before)
      customer: {
        name: customerName,
        email: customerEmail,
      },
      lines,
      notes: `GloriaFood Order #${orderId}`,
    };

    // --- Send to Vendus ---
    const vendusUrl = "https://www.vendus.pt/ws/v1.1/documents";

    const response = await axios.post(vendusUrl, vendusPayload, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
    });

    console.log("Vendus OK:", response.status, response.data);
  } catch (err) {
    // Never crash the server
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("Error sending to Vendus:", status || "", data || err.message);
  }
});

/**
 * IMPORTANT: Railway uses process.env.PORT
 */
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
