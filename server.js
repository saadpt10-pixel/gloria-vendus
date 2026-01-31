const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// Railway gives you the PORT to listen on
const PORT = process.env.PORT || 3000;

/**
 * Health check (Railway + Browser)
 */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * GloriaFood webhook endpoint
 * GloriaFood sends POST requests here.
 *
 * IMPORTANT: Respond fast (200 OK) so GloriaFood/Railway doesn't time out,
 * then process the order async.
 */
app.post("/", (req, res) => {
  res.status(200).send("OK");

  handleOrder(req.body).catch((err) => {
    console.error(
      "Order processing error:",
      err?.response?.data || err?.message || err
    );
  });
});

async function handleOrder(order) {
  if (!order) {
    console.log("No order body received");
    return;
  }

  console.log("Incoming GloriaFood order:", JSON.stringify(order, null, 2));

  // Build Vendus payload
  // NOTE: Vendus rejected "customer" and "lines", so we use only allowed fields.
  const payload = {
    api_key: process.env.VENDUS_API_KEY, // must exist in Railway variables
    type: "FT",                          // invoice type (keep as you want)
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    external_reference: order.order_id ? String(order.order_id) : undefined,
    notes: "GloriaFood Order #" + (order.order_id || ""),

    // Vendus expects "items", not "lines"
    items: (order.items || []).map((item) => ({
      // These are common item fields used by Vendus.
      // If your Vendus account requires product IDs, we will adjust after seeing the next error.
      ref: item.id || item.code || item.name || "ITEM",
      qty: Number(item.quantity || 1),
      price: Number(item.price || 0),
      description: item.name || undefined,
    })),
  };

  // Remove undefined fields (keeps payload clean)
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  try {
    const response = await axios.post(
      "https://www.vendus.pt/ws/v1.1/documents",
      payload,
      { timeout: 20000 }
    );

    console.log("Vendus response:", response.data);
  } catch (err) {
    console.error("Vendus ERROR:", err?.response?.data || err?.message || err);
    throw err;
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
