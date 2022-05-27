const { app, BrowserWindow, ipcMain, tray, nativeImage } = jsModules.electrino;

const isInTvPage = window.location.host === 'cn.tradingview.com';
document.addEventListener('DOMContentLoaded', () => {
  console.log("index.js dom loaded");
  let n = new Notification('You did it!', {
    body: 'Nice work.'
  })
  // Tell the notification to show the menubar popup window on click
  n.onclick = () => { ipcRenderer.send('show-window') };
  // https://pine-facade.tradingview.com/pine-facade/translate/USER;muCkNRKEaqiuwWh8gaxA6VWF8AlvQ5YN/302.0
  if (isInTvPage) {
    initTv();
  }
});
// const token = `eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJleDExMDE1OTkwMTMwNzc0MTI0MURGOTFDMkUxOEExQkNFS0lYeSIsInVpZCI6ImVoYzlBZXlmNmVlekVmY0crMWNsYWc9PSIsInN0YSI6MCwibWlkIjoiZWhjOUFleWY2ZWV6RWZjRysxY2xhZz09IiwiaWF0IjoxNTk5MDEzMDc3LCJleHAiOjE1OTk2MTc4NzcsImJpZCI6MCwiZG9tIjoib2tleC5tZSIsImlzcyI6Im9rY29pbiIsInN1YiI6IjY1MUQ5NzMzM0NCNzI0NTEwNjNCRThDOTM1M0JDRjk1In0.8liuxq8P3Tb0S2ZqVNZOcgmRFKuga8KhEOc7twWGuSsGX-j5pd9FkUfblE3DEBeghhRpOzOvAk1PLFaE-mL5mw`;
const opConfig = {
  op: 'subscribe',
  args: [
    { channel: 'tickers', instId: 'BTC-USDT-SWAP' }
  ],
};
// okex socket
initWebsocket();
var client;
var lastTimestamp = +new Date();
var tvTimestamp = +new Date();
function initWebsocket () {
  closeClient();
  console.log('init ws');
  client = new WebSocket('wss://wspri.okx.com:8443/ws/v5/ipublic');
  client.binaryType = "arraybuffer";
  // client.on('error', function (e) {
  //   console.log('error', e);
  // });
  // client.on('unexpected-response', function (e) {
  //   console.log('unexpected-response', e);
  // });
  // client.on('ping', function (e) {
  //   console.log('ping', e);
  // });
  // client.on('pong', function (e) {
  //   console.log('pong', e);
  // });
  client.onclose = function () {
    console.log('event close');
    initWebsocket();
    // app.notify('通知', 'Websocket断开了链接');
  };
  client.onopen = function () {
    client.send(JSON.stringify(opConfig));
  };
  client.onmessage = function (e) {
    try {
      let json = JSON.parse(e.data);
      let okexInfo = json.data?.[0];
      if (json.arg.channel === 'tickers' && !!okexInfo) {
        lastTimestamp = +new Date();
        let price = Number(okexInfo.last);
        let title = price.toFixed(1);
        tray.setTitle(title);
      }
    } catch (error) {

    }
  };
}

function uint8ArrayToString (fileData) {
  var dataString = "";
  for (var i = 0; i < fileData.length; i++) {
    dataString += String.fromCharCode(fileData[i]);
  }
  return dataString
}

function closeClient () {
  if (client) {
    client.close();
    client = null;
  }
}

function getCookie (name) {
  var prefix = name + "="
  var start = document.cookie.indexOf(prefix)
  if (start == -1) {
    return null;
  }
  var end = document.cookie.indexOf(";", start + prefix.length)
  if (end == -1) {
    end = document.cookie.length;
  }
  var value = document.cookie.substring(start + prefix.length, end)
  return unescape(value);
}

function initTv () {
  Promise.resolve().then(() => {
    let pine = window.initData.content.charts[0].panes[0].sources.find(x => x.id === 'tWvGxk');
    if (pine) {
      return pine;
    } else {
      throw new Error('pine error');
    }
  }).then(pine => {
    let metaInfo = pine.metaInfo.styles;
    var plots = {};
    Object.keys(metaInfo).forEach((plotId) => {
      plots[plotId] = metaInfo[plotId].title.replace(/ /g, '_');//.replace(/[^a-zA-Z0-9]/g, '');
    });
    console.log('page plots', plots);
    return plots;
  }).then(plots => {
    WSBackendConnection._socket._events.message.push(function (info) {
      try {
        tvTimestamp = +new Date();
        let json = JSON.parse(info);
        // tray.setTitle(document.title);
        if (json.m === 'du' && typeof json.p[1]['st4'] === 'object' && json.p[1]['st4']['t'] === 's1_st1') {
          let st = json.p[1]['st4']['st'][0].v;
          let timestamp = st.shift();
          let result = {
            timestamp: timestamp
          };
          st.forEach((value, i) => {
            let key = plots[`plot_${i}`];
            key = ['Plot', '', undefined].includes(key) ? `plot_${i}` : key;
            result[`${key}`] = value;
          });
          let dir = result.dir;
          let hasMarket = result.has_market;
          console.log('json2', result);
          if (dir === 1) {
            if (hasMarket === 1) {
              tray.setIcon('icon-up@4x.png');
            } else {
              tray.setIcon('icon1@4x.png');
            }
          } else if (dir === -1) {
            if (hasMarket === 1) {
              tray.setIcon('icon-down@4x.png');
            } else {
              tray.setIcon('icon-1@4x.png');
            }
          } else {
            tray.setIcon('icon@4x.png');
          }
        }
      } catch (error) {

      }
    });
  });
}

window.addEventListener('offline', () => {
  closeClient();
});
window.addEventListener('online', () => {
  initWebsocket();
});

setInterval(() => {
  let now = +new Date();
  if (now - lastTimestamp > 15 * 1000 || (isInTvPage && now - tvTimestamp > 15 * 1000)) {
    window.location.reload();
  }
  // app.runCmd(`open -a wechat`);
}, 5 * 1000);