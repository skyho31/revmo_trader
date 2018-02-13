/**
 * Currency Class
 * 
 * @author Revine Kim
 * @version 1.0.0
 * @since 2018.02.12
 * 
 */

const MIN_TRADE_UNITS = {
  BTC: 0.001,
  ETH: 0.001,
  DASH: 0.001,
  LTC: 0.01,
  ETC: 0.1,
  XRP: 10,
  BCH: 0.001,
  XMR: 0.01,
  ZEC: 0.01,
  QTUM: 0.1,
  BTG: 0.01,
  EOS: 0.1
};

class Currency {
  constructor(key, name){
    // Default Data
    this.name = name;
    this.key = key;
    this.minUnitTrade = MIN_TRADE_UNITS[key];
    this.quantity = 0;

    // Chart raw data
    this.highPrice = [];
    this.lowPrice = [];
    this.startPrice = [];
    this.endPrice = [];

    // Trade data
    this.recentBoughtPrice = 0;
    this.expectedProfit = 0;
    this.maxExpectedProfit = 0;

    // MACD data
    this.histogramGraph = [];
    this.macdGraph = [];
    this.signalGraph = [];
  }
}

module.exports = Currency;
