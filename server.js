const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ✅ Health check (GET)
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// ✅ GloriaFood webhook (POST)
app.post("/", async (req, res) => {
  const order = req.body;

  try {
    const response = await axios.post(
      'https://www.vendus.pt/ws/v1.1/documents',
      {
        api_key: process.env.VENDUS_API_KEY,
        type: "FT",
        customer: {
          name: order.customer?.name || "Cliente Online",
          email: order.customer?.email || ""
        },
        lines: (order.items || []).map(item => ({
          ref: item.id,
          qty: item.quantity,
          price: item.price
        })),
        notes: "GloriaFood Order #" + order.order_id
      }
    );

    console.log(response.data);
    res.send("OK");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("ERROR");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

