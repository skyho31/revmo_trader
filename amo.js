//custom modules
const Trader = require('./libs/Trader');


class AMO extends Trader{
  constructor(traderName, defaultMoney, intervalPeriods, LongPeriods = 26, ShortPeriods = 12, SignalPeriods = 9){
    super(traderName, defaultMoney, intervalPeriods, LongPeriods = 26, ShortPeriods = 12, SignalPeriods = 9);
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
    let curMacdPerMaxRate;

    if(curHisto * prevHisto < 0 && curHisto > 0 && prevHisto < 0){
      currency.isGoldenCross = true;
      console.log(`[${currency.name}] Meet golden cross.`)
    }

    // verify max macd point
    if(curHisto > currency.maxMacdPoint && currency.maxMacdPoint > 0){
      currency.maxMacdPoint = curHisto;
    }

    curMacdPerMaxRate = Util.getPercent(curMacd, maxMacdPoint);

    // check continuous stack
    if(macdDiffRate > 0){
      currency.stackPlus++;
      currency.stackCombo++;
    } else if(macdDiffRate < 0) {
      currency.stackMinus++;
      currency.stackCombo--;
    }

    // basic tradeLogic
    if(curHisto < 0){
      this.sellCoin(currency);
    } else if (currency.isGoldenCross && histoDiffRate > 0 && currency.quantity <= currency.minTradeUnit && curHisto === currency.maxMacdPoint){
      this.buyCoin(currency, curPrice);
    }

    console.log(`[${currency.traderName}] - ${currency.name} ${curMacdPerMaxRate}%`);
  }
}

let trader = new AMO('AMO', 1000000);
trader.start();
