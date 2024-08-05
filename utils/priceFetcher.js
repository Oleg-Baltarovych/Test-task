const { EXCHANGES } = require("../config/config");
const {
  getBinancePrice,
  getKuCoinPrice,
  getUniswapPrice,
} = require("../utils/fetchPriceFunctions");

const availableFunctions = {
  getBinancePrice,
  getKuCoinPrice,
  getUniswapPrice,
};

async function getPrice(exchange, baseCurrency, quoteCurrency) {
  const functionName = EXCHANGES[exchange];
  const fetchPrice = availableFunctions[functionName];

  if (!fetchPrice) {
    throw new Error(`Unsupported exchange: ${exchange}`);
  }

  try {
    return await fetchPrice(baseCurrency, quoteCurrency);
  } catch (error) {
    console.error(`Error in getPrice for ${exchange}:`, error);
    return 0;
  }
}

module.exports = {
  getPrice,
};
