const express = require("express");
const axios = require("axios");
const { ethers } = require("ethers");
const QUOTER_ABI = require("./abis/quoterABI");

const app = express();
app.use(express.json());

// Запуск сервера ---------------------------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Налаштування провайдера ------------------------------------------------------------------------
const provider = new ethers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/a16dcb0d5ffe45a8b2f5edbc754959e5"
);

// Адреси токенів ---------------------------------------------------------------------------------
const TOKEN_INFO = {
  ETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    decimals: 18,
  },
  BTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    decimals: 8,
  },
  USDT: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    decimals: 6,
  },
};

// Інші змінні ------------------------------------------------------------------------------------
const EXCHANGES = {
  binance: getBinancePrice,
  kucoin: getKuCoinPrice,
  uniswap: getUniswapPrice,
};
const SUPPORTED_CURRENCIES = Object.keys(TOKEN_INFO);
const QUOTER_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const POOL_FEE = 3000;

// Функція для додавання нових бірж ---------------------------------------------------------------
function addExchange(name, fetchPriceFunctionName) {
  const fetchPriceFunction =
    availableFetchPriceFunctions[fetchPriceFunctionName];
  if (!fetchPriceFunction) {
    throw new Error("Function not found");
  }
  EXCHANGES[name] = fetchPriceFunction;
  console.log(`Added new exchange: ${name}`);
}

const availableFetchPriceFunctions = {
  getBinancePrice,
  getKuCoinPrice,
  getUniswapPrice,
};

// Функція для додавання нових токенів ------------------------------------------------------------
function addToken(symbol, address, decimals) {
  TOKEN_INFO[symbol] = { address, decimals };
  SUPPORTED_CURRENCIES.push(symbol);
  console.log(`Added token: ${address}`);
}

// Функція для отримання останніх цін з бірж ------------------------------------------------------
async function getPrice(exchange, baseCurrency, quoteCurrency) {
  const fetchPrice = EXCHANGES[exchange];
  if (!fetchPrice) {
    throw new Error("Unsupported exchange");
  }
  try {
    return await fetchPrice(baseCurrency, quoteCurrency);
  } catch (error) {
    console.error(`Error in getPrice for ${exchange}:`, error);
    return 0;
  }
}

// Функція для отримання цін з Binance ------------------------------------------------------------
async function getBinancePrice(baseCurrency, quoteCurrency) {
  const symbol = `${baseCurrency}${quoteCurrency}`;
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    );
    return parseFloat(response.data.price) || 0;
  } catch (error) {
    console.error("Error fetching Binance price:", error);
    return 0;
  }
}

// Функція для отримання цін з KuCoin -------------------------------------------------------------
async function getKuCoinPrice(baseCurrency, quoteCurrency) {
  const symbol = `${baseCurrency}-${quoteCurrency}`;
  try {
    const response = await axios.get(
      `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol}`
    );
    return parseFloat(response.data.data.price) || 0;
  } catch (error) {
    console.error("Error fetching KuCoin price:", error);
    return 0;
  }
}

// Функція для отримання цін з Uniswap ------------------------------------------------------------
async function getUniswapPrice(baseCurrency, quoteCurrency) {
  const tokenIn = TOKEN_INFO[baseCurrency]?.address;
  const tokenOut = TOKEN_INFO[quoteCurrency]?.address;
  const decimalsOut = TOKEN_INFO[quoteCurrency]?.decimals;

  if (!tokenIn || !tokenOut || decimalsOut === undefined) {
    console.error("Invalid token info for Uniswap:", {
      baseCurrency,
      quoteCurrency,
    });
    return 0;
  }

  const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);
  const amountIn = ethers.parseUnits("1", TOKEN_INFO[baseCurrency].decimals);
  const sqrtPriceLimitX96 = 0;

  try {
    const amountOut = await provider.call({
      to: QUOTER_ADDRESS,
      data: quoter.interface.encodeFunctionData("quoteExactInputSingle", [
        tokenIn,
        tokenOut,
        POOL_FEE,
        amountIn,
        sqrtPriceLimitX96,
      ]),
    });

    const decodedAmountOut = quoter.interface.decodeFunctionResult(
      "quoteExactInputSingle",
      amountOut
    );

    const formattedAmountOut = ethers.formatUnits(
      decodedAmountOut[0],
      decimalsOut
    );
    return parseFloat(formattedAmountOut) || 0;
  } catch (error) {
    console.error("Error in getUniswapPrice:", error);
    return 0;
  }
}

// Ендпоінт estimate ------------------------------------------------------------------------------
app.post("/estimate", async (req, res) => {
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
});

// Ендпоінт getRates ------------------------------------------------------------------------------
app.get("/getRates", async (req, res) => {
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
});

// Ендпоінт для додавання нових бірж -----------------------------------------------------------
app.post("/addExchange", (req, res) => {
  const { name, fetchPriceFunctionName } = req.body;
  if (!name || typeof fetchPriceFunctionName !== "string") {
    return res.status(400).send("Invalid input");
  }

  try {
    addExchange(name, fetchPriceFunctionName);
    res.status(200).send(`Exchange ${name} added`);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// Ендпоінт для додавання нових токенів -----------------------------------------------------------
app.post("/addToken", (req, res) => {
  const { symbol, address, decimals } = req.body;
  if (!symbol || !address || typeof decimals !== "number") {
    return res.status(400).send("Invalid input");
  }
  addToken(symbol, address, decimals);
  res.status(200).send(`Token ${symbol} added`);
});
