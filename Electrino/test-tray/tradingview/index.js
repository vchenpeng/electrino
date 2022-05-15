const _ = require('lodash');
const moment = require('moment');
const WebSocket = require('ws');
const zlib = require('zlib');
const marketAPI = require('./core');

module.exports = {
  init (options) {
    let client = null;
    let tvInfo = {
      periods: []
    };
    const session = options?.session || 'berx0fj203jj1wbnt6k1u5p1b24zmtdy';
    const symbol = options?.symbol || 'OKEX:BTCUSDT';
    const period = options?.period || '5';
    const range = options?.range || '5';
    const indicators = options?.indicators || [
      {
        name: 'XMB',
        id: 'USER;muCkNRKEaqiuwWh8gaxA6VWF8AlvQ5YN',
        version: '188.0',
        settings: {
          "0": 12
        }
      }
    ];
    const callback = options?.callback || (() => { });
    // tv
    const market = marketAPI(false);
    market.on('logged', () => {
      market.initChart({
        session: session,
        symbol: symbol,
        // 单位分，60代表1h线，240代表4h线
        period: period,
        range: range,
        indicators: indicators,
      }, (periods, current) => {
        tvInfo.periods = periods;
      });
    });
    // okex
    client = new WebSocket('wss://wspri.okx.com:8443/ws/v5/ipublic', {
      perMessageDeflate: false
    });
    client.on('open', function () {
      client.send(JSON.stringify({
        "op": "subscribe",
        "args": [
          // "swap/ticker:BTC-USDT-SWAP"
          { channel: 'tickers', instId: 'BTC-USDT-SWAP' }
          // { channel: "mark-price", instId: "BTC-USD-SWAP" }
        ]
      }));
    });
    client.on('close', function () {
      // TODO 断开了ok的socket时告警
    });
    client.onmessage = function (e) {
      /* 转二进制
      let buffer = zlib.inflateRawSync(e.data);
      let json = JSON.parse(buffer.toString());
      if (json.table === 'swap/ticker') {
        let okexInfo = json.data[0];
        _.attempt(callback, okexInfo, tvInfo);
      }*/
      // 直接处理
      let json = JSON.parse(e.data);
      let okexInfo = json.data?.[0];
      if (json.arg.channel === 'tickers' && !!okexInfo) {
        _.attempt(callback, okexInfo, tvInfo);
      }
    }
  }
}