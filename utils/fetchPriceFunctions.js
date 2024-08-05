const axios = require("axios");
const {
  TOKEN_INFO,
  QUOTER_ADDRESS,
  POOL_FEE,
  provider,
} = require("../config/config");
const QUOTER_ABI = require("../abis/quoterABI");
const { ethers } = require("ethers");

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
    return (
      parseFloat(ethers.formatUnits(decodedAmountOut[0], decimalsOut)) || 0
    );
  } catch (error) {
    console.error("Error in getUniswapPrice:", error);
    return 0;
  }
}

module.exports = {
  getBinancePrice,
  getKuCoinPrice,
  getUniswapPrice,
};
