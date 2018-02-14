/**
 * AMO - traderbot
 * 
 * @author Revine Kim
 * @version 1.0.0
 * @since 2018.02.12
 * 
 */


// npm modules
const fs = require('fs');
const macd = require('macd');
const events = require('events');
const colors = require('colors');

// bithumb module
const xCoin = require('./xCoin');

// custom modules
const Log = require('../../src/Log');
const Util = require('../../src/Util');
const Wallet = require('./Wallet');
const Currency = require('./Currency');

// default Settings
const FEE_RATE = 0.00075;
const TRACKING_ERROR = 5 * 0.001;
const collectEvents = new events.EventEmitter();

class Trader {

  /**
   * Trader Constructor
   * @param {String} traderName 
   * @param {Number} defaultMoney 
   * @param {Number} intervalPeriods request interval minutes
   * @param {Number} LongPeriods default = 26
   * @param {Number} ShortPeriods default = 12
   * @param {Number} SignalPeriods default = 9
   */
  constructor(traderName, defaultMoney, intervalPeriods = 1, LongPeriods = 26, ShortPeriods = 12, SignalPeriods = 9){
    this.wallet = new Wallet(defaultMoney).makeWallet();
    this.traderName = traderName;
    this.macdOptions = {
      long : LongPeriods * intervalPeriods,
      short : ShortPeriods * intervalPeriods,
      signal : SignalPeriods * intervalPeriods
    };
    this.collectDataCount = 0;
    this.coinCount = Object.keys(this.wallet.currency).length;
    this.cacheKrw = 0;
  }

  start(){
    let me = this;
    let currencyObj;

    this.readData().then(() => {
      Util.setIntervalMsg(this.traderName, () => {
        me.checkStatus().then(() => {
          currencyObj = me.wallet.currency;
          for(let key in currencyObj){
            me.checkChartData(currencyObj[key]);
          }
        });
      });
    });

    collectEvents.on('collectChartData', () => {
      this.collectDataCount++;

      let loadingPercent = (this.collectDataCount / this.coinCount) * 100;
      Util.write(`[${this.traderName}] : ${loadingPercent === 100 ? 'completed' : loadingPercent.toFixed(2) + '%'}`.yellow + ' / ');

      if(this.collectDataCount === this.coinCount) {
        Util.write(`[${this.traderName}] : Data Load Completed`.yellow + ' | ' );
        console.log(Util.getTime());
        this.collectDataCount = 0;
        for(let key in currencyObj){
          this.cacheKrw = this.wallet.krw;
          this.executeTradeStrategy(currencyObj[key]);
        }
      }
    });
  }

  executeTradeStrategy(currency){
    let key = currency.key;
    let name = currency.name;

    // raw data part
    // price
    let priceLen = currency.endPrice.length;
    let curPrice = currency.endPrice[priceLen - 1];
    let prevPrice = currency.endPrice[priceLen - 2];

    // histogram
    let histoLen = currency.histogramGraph.length;
    let curHisto = currency.histogramGraph[histoLen - 1];
    let prevHisto = currency.histogramGraph[histoLen - 2];
    
    // signal
    let signalLen = currency.signalGraph.length;
    let curSignal = currency.signalGraph[signalLen - 1];
    let prevSignal = currency.signalGraph[signalLen - 2];

    // macd
    let macdLen = currency.macdGraph.length;
    let curMacd = currency.macdGraph[macdLen - 1];
    let prevMacd = currency.macdGraph[macdLen - 2];

    // parsed data part
    let priceDiffRate = Util.getPercent(curPrice, prevPrice);
    let histoDiffRate = Util.getPercent(curHisto, prevHisto);
    let macdDiffRate = Util.getPercent(curMacd, prevMacd);


    // basic tradeLogic
    if(curHisto < 0){
      this.sellCoin(currency);
    } else if (curHisto * prevHisto <= 0 && curHisto >= 0 && prevHisto <= 0){
      this.buyCoin(currency);
    }

    console.log(`[${this.traderName}] ${currency.key} Price : ${curPrice} (${priceDiffRate}%) Macd : ${curMacd.toFixed(2)} (${macdDiffRate}%) Histo : ${curHisto.toFixed(2)} (${histoDiffRate}%) / ${Util.getTime().green}`);
  }

  checkStatus(){
    return new Promise((resolve) => {
      let totalMoney = this.wallet.totalMoney = this.getTotal();
      let fee = this.wallet.tradeAmount * FEE_RATE;
      let realMoney = totalMoney - fee;
      let profitRate = ((realMoney / this.wallet.default) - 1) * 100;

      console.log(`[${this.traderName}] TotalMoney : ${Math.floor(realMoney)}(${profitRate.toFixed(2)}%) TradeAmount : ${Math.floor(this.wallet.tradeAmount)} CurrentKRW : ￦ ${this.wallet.krw}`.blue)

      fs.writeFile(`./logs/${this.traderName}_wallet.json`, JSON.stringify(this.wallet), (err) => {
        if(err) console.log(err);
      });
      resolve();
    })
  }

  checkChartData(currency){
    const TYPE = ['timestamp', 'startPrice', 'endPrice', 'highPrice', 'lowPrice', 'strLength'];

    fs.readFile('../logs/' + currency.key + '.json', 'utf8', (err, body) => {
      try{
        let result = JSON.parse(body);
        let graph;
  
        currency.timestamp = result.chart[TYPE[0]];
        currency.startPrice = result.chart[TYPE[1]];
        currency.endPrice = result.chart[TYPE[2]];
        currency.highPrice = result.chart[TYPE[3]];
        currency.lowPrice = result.chart[TYPE[4]];
        currency.strLength = result.chart[TYPE[5]];
        currency.buyPrice = result.buyPrice;
        currency.sellPrice = result.sellPrice;
  
        graph = macd(currency.endPrice, this.macdOptions.long, this.macdOptions.short, this.macdOptions.signal);
        currency.macdGraph = graph.MACD.slice(0);
        currency.histogramGraph = graph.histogram.slice(0);
        currency.signalGraph = graph.signal.slice(0);
  
        collectEvents.emit('collectChartData');
      } catch(e) {
        collectEvents.emit('collectChartData');
      }
    })
  }

  getTotal(){
    let total = 0;
    let myWallet = this.wallet.currency;

    for(let key in myWallet){
      let curValue = myWallet[key].quantity * myWallet[key].endPrice.slice(-1)[0];
      total += isNaN(curValue) ? 0 : curValue;
    }

    total += this.wallet.krw;
    return total;
  }

  readData(){
    return new Promise((resolve) => {
      console.log(`[${this.traderName}] Trader Process Start`.yellow);

      let walletFilePath = `./logs/${this.traderName}_wallet.json`;
      let isExistedWallet = fs.existsSync(walletFilePath);
  
      if(isExistedWallet) {
        try {
          this.wallet = JSON.parse(fs.readFileSync(walletFilePath));
          console.log(`[${this.traderName}] Read my wallet`.yellow);
        } catch(e) {
          console.log(`[${this.traderName}] Wallet file loading failed.`.yellow);
        } finally {
          resolve();
        }
      } else {
        console.log(`[${this.traderName}] There is no wallet file.`.yellow);
        resolve();
      }
    })
  }

  /**
   * buy coin function
   * @param {Currency Object} currency 
   * @param {Number} requestedQuantity 
   */
  buyCoin(currency, requestedQuantity = 10){
    let key = currency.key;
    let name = currency.name;
    let buyPrice = currency.buyPrice;
    let krw = this.cacheKrw;//this.wallet.krw;
    let availableBuyCost = krw > this.wallet.default / requestedQuantity ? Math.floor(this.wallet.default / requestedQuantity) : krw;
    let buyQuantity = Util.parseDecimal(availableBuyCost / buyPrice);

    console.log('availableBuyCost: ' +  availableBuyCost);

    availableBuyCost *= 1 + TRACKING_ERROR;

    if(buyQuantity > currency.minTradeUnit && (krw - availableBuyCost) >= 0){
      let singleTradeAmount = availableBuyCost * buyQuantity

      this.wallet.tradeAmount += singleTradeAmount;
      this.wallet.totalTradeAmount += singleTradeAmount;
      this.wallet.krw -= availableBuyCost;

      currency.quantity += buyQuantity;
      currency.recentBoughtPrice = availableBuyCost;

      console.log(`[${this.traderName}] Buy ${buyQuantity} ${name} / Pay ₩ ${Math.floor(singleTradeAmount)}`.red);
    }
  }

  /**
   * sell coin function
   * @param {Currency Object} currency 
   */
  sellCoin(currency){
    let key = currency.key;
    let name = currency.name;
    let krw = this.wallet.krw;
    let sellPrice = currency.sellPrice;
    let sellQuantity = Util.parseDecimal(currency.quantity);
    
    sellPrice * (1 - TRACKING_ERROR);

    if(sellQuantity >= currency.minTradeUnit) {
      let singleTradeAmount = sellPrice * sellQuantity;
      let profit;

      this.wallet.tradeAmount += singleTradeAmount;
      this.wallet.totalTradeAmount += singleTradeAmount;
      this.wallet.krw += singleTradeAmount;

      currency.quantity -= sellQuantity;
      profit = currency.recentBoughtPrice - singleTradeAmount;
      console.log(`[${this.traderName}] Sell ${sellQuantity} ${name} / Earn ₩ ${Math.floor(profit)}`.red);
    }
  }
}

module.exports = Trader;
