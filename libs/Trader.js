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
const Log = require('../../revmo/Log');
const Util = require('../../revmo/Util');
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
  constructor(traderName, defaultMoney, intervalPeriods, LongPeriods = 26, ShortPeriods = 12, SignalPeriods = 9){
    this.wallet = new Wallet(defaultMoney).makeWallet();
    this.traderName = traderName;
    this.tradeAmount = 0;
    this.macdOptions = {
      long : LongPeriods * intervalPeriods,
      short : ShortPeriods * intervalPeriods,
      signal : SignalPeriods * intervalPeriods
    };
    this.collectDataCount = 0;
    this.coinCount = Object.keys(this.wallet.currency).length;
  }

  start(){
    let me = this;

    this.readData().then(() => {
      Util.setIntervalMsg(this.traderName, () => {
        me.checkStatus().then(() => {
          let currencyObj = me.wallet.currency;
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
        this.collectDataCount = 0;
        this.executeTradeStrategy();
      }
    });
  }

  executeTradeStrategy(){
    console.log(Util.getTime().green);
  }

  checkStatus(){
    return new Promise((resolve) => {
      let totalMoney = this.wallet.totalMoney = this.getTotal();
      let fee = this.tradeAmount * FEE_RATE;
      let realMoney = totalMoney - fee;
      let profitRate = ((realMoney / this.wallet.defaultMoney) - 1) * 100;

      resolve();
    })
  }

  checkChartData(currency){
    const TYPE = ['timestamp', 'startPrice', 'endPrice', 'highPrice', 'lowPrice', 'strLength'];

    fs.readFile('../logs/' + currency.key + '.json', 'utf8', (err, body) => {
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
      currency.histogram = graph.histogram.slice(0);
      currency.signalGraph = graph.signal.slice(0);

      collectEvents.emit('collectChartData');
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

  buyCoin(currency, buyPrice, currentPrice){
    let key = currency.key;
    let krw = this.wallet.krw;
    let buyCost = krw > this.wallet.default / 10 ? Math(this.wallet.default / 10) : krw;
    let buyQuantity = Util.parseDecimal(buyCost / buyPrice);

    buyCost *= 1 + TRACKING_ERROR;

    
  }

  sellCoin(currency, sellPrice){

  }
}

module.exports = Trader;
