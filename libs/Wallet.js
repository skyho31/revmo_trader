/**
 * Wallet Class
 * 
 * @author Revine Kim
 * @version 1.0.0
 * @since 2018.02.12
 * 
 */

// npm modules
const fs = require('fs');

// custom modules
const Currency = require('./Currency');

class Wallet {
  constructor(defaultMoney){
    this.default = defaultMoney;
    this.totalMoney = 0;
    this.krw = defaultMoney;
    this.totalTradeAmount = 0;
  }

  makeWallet(){
    let walletObj = {};

    try {
      let data = fs.readFileSync('../libs/currency.json')
      let currencyKeyObj = JSON.parse(decodeURIComponent(data))[0];
      
      for(let key in currencyKeyObj){
        let name = currencyKeyObj[key];
        walletObj[key] = new Currency(key, name);
      }

      return {
        default : this.default,
        totalMoney : this.totalMoney,
        krw : this.krw,
        totalTradeAmount : this.totalTradeAmount,
        currency : walletObj
      };
    } catch(e){
      console.log('[Wallet] Make Wallet Failed. ' + e);
      return false;
    }
  }
}

module.exports = Wallet;
