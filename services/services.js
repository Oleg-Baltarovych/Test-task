const {
  EXCHANGES,
  SUPPORTED_CURRENCIES,
  TOKEN_INFO,
} = require("../config/config");
const {
  getBinancePrice,
  getKuCoinPrice,
  getUniswapPrice,
} = require("../utils/fetchPriceFunctions");
const { getPrice } = require("../utils/priceFetcher");

async function estimate(req, res) {
  const { inputAmount, inputCurrency, outputCurrency } = req.body;
  if (
    !SUPPORTED_CURRENCIES.includes(inputCurrency) ||
    !SUPPORTED_CURRENCIES.includes(outputCurrency)
  ) {
    return res.status(400).send("Unsupported currency");
  }
  let bestExchange = null;
  let bestOutputAmount = 0;
  for (const [exchange] of Object.entries(EXCHANGES)) {
    try {
      const rate = await getPrice(exchange, inputCurrency, outputCurrency);
      const outputAmount = inputAmount * rate;
      if (outputAmount > bestOutputAmount) {
        bestOutputAmount = outputAmount;
        bestExchange = exchange;
      }
    } catch (error) {
      console.error(`Error fetching price from ${exchange}:`, error.message);
    }
  }
  if (bestExchange) {
    res.json({ bestExchange, outputAmount: bestOutputAmount });
  } else {
    res.status(500).send("Unable to fetch prices from exchanges");
  }
}

async function getRates(req, res) {
  const { baseCurrency, quoteCurrency } = req.query;
  if (
    !SUPPORTED_CURRENCIES.includes(baseCurrency) ||
    !SUPPORTED_CURRENCIES.includes(quoteCurrency)
  ) {
    return res.status(400).send("Unsupported currency");
  }
  const rates = [];
  for (const [exchange] of Object.entries(EXCHANGES)) {
    try {
      const rate = await getPrice(exchange, baseCurrency, quoteCurrency);
      rates.push({ exchangeName: exchange, rate });
    } catch (error) {
      console.error(`Error fetching price from ${exchange}:`, error.message);
      rates.push({ exchangeName: exchange, rate: 0 });
    }
  }
  res.json(rates);
}

function addExchange(req, res) {
  const { name, fetchPriceFunctionName } = req.body;

  if (
    !["getBinancePrice", "getKuCoinPrice", "getUniswapPrice"].includes(
      fetchPriceFunctionName
    )
  ) {
    return res.status(400).send("Invalid fetchPriceFunctionName");
  }

  EXCHANGES[name] = fetchPriceFunctionName;
  res.status(200).send(`Exchange ${name} added`);
}

function addToken(req, res) {
  const { symbol, address, decimals } = req.body;
  if (!symbol || !address || typeof decimals !== "number") {
    return res.status(400).send("Invalid input");
  }
  TOKEN_INFO[symbol] = { address, decimals };
  SUPPORTED_CURRENCIES.push(symbol);
  res.status(200).send(`Token ${symbol} added`);
}

module.exports = {
  estimate,
  getRates,
  addExchange,
  addToken,
};
