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
 * IMPORTANT: We respond fast (200 OK) so Railway/GloriaFood doesn't time out,
 * then we process the order in the background.
 */
app.post("/", (req, res) => {
  // Respond immediately so Railway doesn't show "failed to respond"
  res.status(200).send("OK");

  // Process async (does not block the response)
  handleOrder(req.body).catch((err) => {
    console.error("Order processing error:", err?.response?.data || err?.message || err);
  });
});

async function handleOrder(order) {
  // Basic safety check
  if (!order) {
    console.log("No order body received");
    return;
  }

  // Build Vendus payload (adjust if your Vendus expects different fields)
  const payload = {
    api_key: process.env.VENDUS_API_KEY,
    type: "FT",
    customer: {
      name: order.customer?.name || "Cliente Online",
      email: order.customer?.email || "",
    },
    lines: (order.items || []).map((item) => ({
      ref: item.id,
      qty: item.quantity,
      price: item.price,
    })),
    notes: "GloriaFood Order #" + (order.order_id || ""),
  };

  // Send to Vendus
  const response = await axios.post("https://www.vendus.pt/ws/v1.1/documents", payload);

  console.log("Vendus response:", response.data);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
