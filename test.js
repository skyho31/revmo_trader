//custom modules
const Trader = require('./libs/Trader');

class AMO extends Trader{
  constructor(traderName, defaultMoney, intervalPeriods, LongPeriods = 26, ShortPeriods = 12, SignalPeriods = 9){
    super(traderName, defaultMoney, intervalPeriods, LongPeriods = 26, ShortPeriods = 12, SignalPeriods = 9);
  }

  // executeTradeStrategy(){
  //   console.log('hello world');
  // }
}

let trader = new AMO('AMO', 1000000);
trader.start();
