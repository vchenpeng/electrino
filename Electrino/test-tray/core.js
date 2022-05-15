import {
  search, getScreener, getTA, getIndicator, getUserToken
} from './miscRequests.js';

export default function (autoInit = true) {
  let onPacket = () => null;

  function parse (str) {
    const packets = str.replace(/~h~/g, '').split(/~m~[0-9]{1,}~m~/g).map((p) => {
      if (!p) return false;
      try {
        return JSON.parse(p);
      } catch (error) {
        console.warn('Cant parse', p);
        return false;
      }
    }).filter((p) => p);

    packets.forEach((packet) => {
      if (packet.m === 'protocol_error') {
        return onPacket({
          type: 'error',
          syntax: packet.p[0],
        });
      }

      if (packet.m && packet.p) {
        return onPacket({
          type: packet.m,
          session: packet.p[0],
          data: packet.p[1],
        });
      }

      if (typeof packet === 'number') return onPacket({ type: 'ping', ping: packet });

      return onPacket({ type: 'info', ...packet });
    });
  }

  function genSession () {
    let r = '';
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 12; i += 1) r += c.charAt(Math.floor(Math.random() * c.length));
    return `qs_${r}`;
  }
  function myWs (autoInit = true) {

    const callbacks = {
      connected: [],
      disconnected: [],
      logged: [],
      subscribed: [],
      ping: [],
      price: [],
      data: [],

      error: [],
      event: [],
    };

    const chartEventNames = [
      'du', 'timescale_update',
      'series_loading', 'series_completed', 'series_error',
      'symbol_resolved', 'symbol_error',
      'study_loading', 'study_error',
    ];
    const chartCBs = {};

    function handleEvent (ev, ...data) {
      callbacks[ev].forEach((e) => e(...data));
      callbacks.event.forEach((e) => e(ev, ...data));
    }

    function handleError (...msgs) {
      if (callbacks.error.length === 0) console.error(...msgs);
      else handleEvent('error', ...msgs);
    }

    var proxy = process.env.socks_proxy;
    console.log('socket代理', proxy);
    var agent = new SocksProxyAgent(proxy);

    const ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket?from=chart%2FBz44ipwy%2F&date=2022_04_22-14_59', {
      headers: {
        // 'Host': 'widgetdata.tradingview.com',
        'Origin': 'https://cn.tradingview.com',
        // 'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        // 'Sec-WebSocket-Accept': 'LDaGSPwDB8THq6MEdSvKeQ==',
        // 'Sec-WebSocket-Version': '13',
        // 'Upgrade': 'websocket',
        // 'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        // 'Connection': 'upgrade'
      },
      agent: agent
    });

    let logged = false;
    /** ID of the quote session */
    let sessionId = '';

    /** List of subscribed symbols */
    let subscribed = [];

    /**
     * Send a custom packet
     * @param {string} t Packet type
     * @param {string[]} p Packet data
     * @example
     * // Subscribe manualy to BTCEUR
     * send('quote_add_symbols', [sessionId, 'BTCEUR']);
    */
    function send (t, p = []) {
      if (!sessionId) return;
      const msg = JSON.stringify({ m: t, p });
      ws.send(`~m~${msg.length}~m~${msg}`);
    }

    ws.on('open', () => {
      sessionId = genSession();
      handleEvent('connected');
    });

    ws.on('close', () => {
      logged = false;
      sessionId = '';
      handleEvent('disconnected');
    });

    ws.on('message', parse);

    onPacket = (packet) => {
      if (packet.type === 'ping') {
        const pingStr = `~h~${packet.ping}`;
        ws.send(`~m~${pingStr.length}~m~${pingStr}`);
        handleEvent('ping', packet.ping);
        return;
      }

      if (packet.type === 'quote_completed' && packet.data) {
        handleEvent('subscribed', packet.data);
        return;
      }

      if (packet.type === 'qsd' && packet.data.n && packet.data.v.lp) {
        handleEvent('price', {
          symbol: packet.data.n,
          price: packet.data.v.lp,
        });

        return;
      }

      if (chartEventNames.includes(packet.type) && chartCBs[packet.session]) {
        chartCBs[packet.session](packet);
        return;
      }
      if (!logged && packet.type === 'info') {
        if (autoInit) {
          send('set_auth_token', ['unauthorized_user_token']);
          send('quote_create_session', [sessionId]);
          send('quote_set_fields', [sessionId, 'lp']);

          subscribed.forEach((symbol) => send('quote_add_symbols', [sessionId, symbol]));
        }
        handleEvent('logged', packet);
        return;
      }

      if (packet.type === 'error') {
        handleError(`Market API critical error: ${packet.syntax}`);
        ws.close();
        return;
      }

      handleEvent('data', packet);
    };

    return {
      /** Event listener
       * @param { 'connected' | 'disconnected' | 'logged'
       * | 'subscribed' | 'price' | 'data' | 'error' | 'ping' } event Event
       * @param {(...data: object) => null} cb Callback
       */
      on (event, cb) {
        if (!callbacks[event]) {
          console.log('Wrong event:', event);
          console.log('Available events:', Object.keys(callbacks));
          return;
        }

        callbacks[event].push(cb);
      },

      /**
       * Close the websocket connection
       * @param {string} symbol Market symbol (Example: BTCEUR or COINBASE:BTCEUR)
       */
      end () { ws.close(); },

      search,
      getScreener,
      getTA,
      subscribed,

      /**
       * Unsubscribe to a market
       * @param {string} symbol Market symbol (Example: BTCEUR or COINBASE:BTCEUR)
       */
      subscribe (symbol) {
        if (subscribed.includes(symbol)) return;
        send('quote_add_symbols', [sessionId, symbol]);
        subscribed.push(symbol);
      },

      /**
       * Unsubscribe from a market
       * @param {string} symbol Market symbol (Example: BTCEUR or COINBASE:BTCEUR)
       */
      unsubscribe (symbol) {
        if (!subscribed.includes(symbol)) return;
        send('quote_remove_symbols', [sessionId, symbol]);
        subscribed = subscribed.filter((s) => s !== symbol);
      },

      /**
       * @typedef {Object} IndicatorInfos Indicator infos
       * @property {string} id ID of the indicator (Like: XXX;XXXXXXXXXXXXXXXXXXXXX)
       * @property {string} version Wanted version of the indicator
       * @property {(string | number | boolean | null)[]} [settings] Indicator settings value
       *
       * @typedef {Object} ChartInfos
       * @property {string} [session] User 'sessionid' cookie
       * @property {string} symbol Market symbol (Example: BTCEUR or COINBASE:BTCEUR)
       * @property { '1' | '3' | '5' | '15' | '30' | '45'
       *  | '60' | '120' | '180' | '240'
       *  | '1D' | '1W' | '1M'
       * } [period] Period
       * @property {number} [range] Number of loaded periods
       * @property {string} [timezone] Timezone in 'Europe/Paris' format
       * @property {IndicatorInfos[]} [indicators] List of indicators
       */

      /**
       * @typedef {Object} Period List of prices / indicator values
       * @property {number} $time
       * @property {{
       *  time: number, open: number, close: number,
       *  max: number, min: number, change: number,
       * }} $prices
       */

      /**
       * Init a chart instance
       * @param {ChartInfos} chart
       * @param {{(prices: Period[]): null}} onUpdate List of periods starting from the lastest
       */
      async initChart (chart, onUpdate) {
        const chartSession = genSession();
        const periods = [];
        const indicators = await Promise.all(
          (chart.indicators || []).map((i) => getIndicator(i.id, i.version, i.settings)),
        );
        function updatePeriods (packet) {
          const newData = packet.data;
          let returnObj = {};
          Object.keys(newData).forEach((type) => {
            (newData[type].s || newData[type].st || []).forEach((p) => {
              if (!periods[p.i]) periods[p.i] = {};

              periods[p.i].timestamp = +new Date();
              if (newData[type].s) {
                [periods[p.i].$time] = p.v;

                periods[p.i][type] = {
                  open: p.v[1],
                  close: p.v[4],
                  max: p.v[2],
                  min: p.v[3],
                  change: Math.round(p.v[5] * 100) / 100,
                };
              }

              if (newData[type].st) {
                const period = {
                  timestamp: +new Date()
                };
                const indicator = indicators[parseInt(type, 10)];

                p.v.forEach((val, i) => {
                  if (i === 0) return;
                  if (indicator.plots[`plot_${i - 1}`]) period[indicator.plots[`plot_${i - 1}`]] = val;
                  else period[`_plot_${i - 1}`] = val;
                });
                periods[p.i][chart.indicators[parseInt(type, 10)].name || `st${type}`] = period;
              }

              returnObj = periods[p.i];
            });
          });
          return returnObj;
        }
        chartCBs[chartSession] = (packet) => {
          if (['timescale_update', 'du'].includes(packet.type)) {
            let current = updatePeriods(packet);
            let list = [...periods].reverse();
            onUpdate(list, current);
            return;
          }

          if (packet.type.endsWith('_error')) {
            handleError(`Error on '${chart.symbol}' (${chartSession}) chart: "${packet.type}"`);
          }
        };
        if (chart.session) {
          let userToken = await getUserToken(chart.session);

          send('set_auth_token', [userToken]);
        }
        send('chart_create_session', [chartSession, '']);
        if (chart.timezone) send('switch_timezone', [chartSession, chart.timezone]);
        send('resolve_symbol', [chartSession, 'sds_sym_1', `={"symbol":"${chart.symbol || 'BTCEUR'}","adjustment":"splits"}`]);
        send('create_series', [chartSession, '$prices', 's1', 'sds_sym_1', (chart.period || '240'), (chart.range || 100), '']);

        // send('create_study', [chartSession, `st1`, 'st1', 'sds_1', 'Dividends@tv-basicstudies-135', {}]);
        // send('create_study', [chartSession, `st2`, 'st1', 'sds_1', 'Splits@tv-basicstudies-135', {}]);
        // send('create_study', [chartSession, `st3`, 'st1', 'sds_1', 'Earnings@tv-basicstudies-135', {}]);
        // send('create_study', [chartSession, "st4", "st1", "sds_1", "Script@tv-scripting-101!", {"text":"ePiKu0oZDKsXVOch3Mux6A==_ofMCOBvLLa7LDeC9w7UzgponfDsW6wHeezF7bD9Pk1Wl65FVSm/YEbZsJToBF1NU7O8cfb8qJwDUXLjucDOfFhLii2NJpDTbPguvWmpaysXL5bMtJLx33oIoLh2SxI6anR2hDu9TnVZlDOnRu2BZBhb9C4P1d8x1EwWP6tHPF0OtSv3kVtGqkTpvtHCq6XHXY+nrkR+twzAsP4/sGwW4TqXAXIHDl6QpPJ3OzsWWBshwj55cQWjqHAaenl02LWkvJVdy7fb5zksMEn93LOedb1A3HxqY4l/t7G+adsvRn/vScIZSN7Y2077rqTNNahCAEI/E27I0gBiT3cmdu9o1LAsl4gc91A2hESQDPbdMgxTB+i6A7a0FbcT1BETF7h2sz4a7CHST9AYK8/NbptVFFQZ5XwyjGxCBrIX+/dRIZqaWdFoBZukiwC+G6Tf5mBkKmjXSE9T1iIL+KEpz8hJfIDGjfnpu5Ov79xCE54I8pBYBXyrY17aWbF83+69PZW5cHZx3SN1OBK0Omto+GqqGmJspLwyh1u1NSpFEO0RxgaZlEyxXraGDGJw2th4Pw6layJ0L/LQAeFJpjC4saZZoc8bJKXoSIIOCCkqzayeR9bR2CfPIQjMfsn2kUGh/oOugKsdKX0tJGTNmCsNxgrNBHnirBkiOjc5/Olsc74zrAqXudGHHF4kooFXacEJumXH3UBo6+hIZqKVxDeASTCooUUP3HxaeyfJv0VdDHB3y6+Vkf5bb6O3J30fTAxvGG1w/gcKg4Pu86bIE6Hq776e8OHQFt04XAy2+ib8SrrdrpS1G4RNm0xd4ZCGaJYfAgNv67t/NedfqVYW5UuOAoNFprJs4aUQ8GIoBQ5SB/ia+nfiExa836RHdmZ4g45KKfuH1dWiLx6hD1g/z3R8z1Nck2dC56GaUFzcBM9cg/b3KWYzxOqYqcz30iAYZdU0E90v37XEnWD683w/0wzaLUhAxw/eIuzfenRXq/tqn4J5oBn7Ld/Oo5iKl","pineId":"PUB;9LwimB6B6cmMSAw0cpsIQrbr15mHzREO","pineVersion":"2.0","in_0":{"v":55,"f":true,"t":"integer"}}]);

        indicators.forEach(async (indicator, i) => {
          const pineInfos = {
            pineId: indicator.pineId,
            pineVersion: indicator.pineVersion,
            text: indicator.script,
          };

          Object.keys(indicator.inputs).forEach((inputID, inp) => {
            const input = indicator.inputs[inputID];
            if (input.type === 'bool' && typeof input.value !== 'boolean') handleError(`Input '${input.name}' (${inp}) must be a boolean !`);
            if (input.type === 'integer' && typeof input.value !== 'number') handleError(`Input '${input.name}' (${inp}) must be a number !`);
            if (input.type === 'float' && typeof input.value !== 'number') handleError(`Input '${input.name}' (${inp}) must be a number !`);
            if (input.type === 'text' && typeof input.value !== 'string') handleError(`Input '${input.name}' (${inp}) must be a string !`);
            if (input.options && !input.options.includes(input.value)) {
              handleError(`Input '${input.name}' (${inp}) must be one of these values:`, input.options);
            }

            pineInfos[inputID] = {
              v: input.value,
              f: input.isFake,
              t: input.type,
            };
          });
          // console.log('haha~', pineInfos);
          send('create_study', [chartSession, `${i}`, 'st1', '$prices', 'Script@tv-scripting-101!', pineInfos]);
        });
      },

      send,
      sessionId,
    };
  };
  return myWs(autoInit);
}
