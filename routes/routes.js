const express = require("express");
const {
  estimate,
  getRates,
  addExchange,
  addToken,
} = require("../services/services");
const router = express.Router();

router.post("/estimate", estimate);
router.post("/addExchange", addExchange);
router.post("/addToken", addToken);
router.get("/getRates", getRates);

module.exports = router;
