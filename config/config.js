const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/a16dcb0d5ffe45a8b2f5edbc754959e5"
);

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

const SUPPORTED_CURRENCIES = Object.keys(TOKEN_INFO);

const EXCHANGES = {
  binance: "getBinancePrice",
  kucoin: "getKuCoinPrice",
  uniswap: "getUniswapPrice",
};

const QUOTER_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const POOL_FEE = 3000;

module.exports = {
  provider,
  TOKEN_INFO,
  SUPPORTED_CURRENCIES,
  EXCHANGES,
  QUOTER_ADDRESS,
  POOL_FEE,
};
