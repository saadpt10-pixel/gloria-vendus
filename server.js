const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

/**
 * Health check (Railway + browser)
 */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/**
 * GloriaFood webhook endpoint
 * GloriaFood sends POST requests here
 */
app.post("/", async (req, res) => {
  const order = req.body;

  try {
    const response = await axios.post(
      "https://www.vendus.pt/ws/v1.1/documents",
      {
        api_key: process.env.VENDUS_API_KEY,
