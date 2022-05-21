
const { app, BrowserWindow, ipcMain, tray, nativeImage } = jsModules.electrino;

// const token = `eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJleDExMDE1OTkwMTMwNzc0MTI0MURGOTFDMkUxOEExQkNFS0lYeSIsInVpZCI6ImVoYzlBZXlmNmVlekVmY0crMWNsYWc9PSIsInN0YSI6MCwibWlkIjoiZWhjOUFleWY2ZWV6RWZjRysxY2xhZz09IiwiaWF0IjoxNTk5MDEzMDc3LCJleHAiOjE1OTk2MTc4NzcsImJpZCI6MCwiZG9tIjoib2tleC5tZSIsImlzcyI6Im9rY29pbiIsInN1YiI6IjY1MUQ5NzMzM0NCNzI0NTEwNjNCRThDOTM1M0JDRjk1In0.8liuxq8P3Tb0S2ZqVNZOcgmRFKuga8KhEOc7twWGuSsGX-j5pd9FkUfblE3DEBeghhRpOzOvAk1PLFaE-mL5mw`;
const opConfig = {
  op: 'subscribe',
  args: [
    { channel: 'tickers', instId: 'BTC-USDT-SWAP' }
  ],
};

tray.setIcon('icon@4x.png');
// okex socket
initWebsocket();
var client;
var lastTimestamp = +new Date();
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
    // app.notify('通知', 'Websocket断开了连接');
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
  }
}

function reConnection () {
  setTimeout(() => {
    initWebsocket();
  }, 1000);
}

// document.addEventListener('DOMContentLoaded', () => {
//   console.log("index.js dom loaded");
//   let n = new Notification('You did it!', {
//     body: 'Nice work.'
//   })
//   n.onclick = () => {
//     ipcRenderer.send('show-window');
//   };
// });
tray.on('click', function () {
  // tray.setIcon('icon-up@4x.png');
  // app.notify('通知', '重新连接 websocket');
  // initWebsocket();
  window.location.reload();
});

window.addEventListener('offline', () => {
  closeClient();
});
window.addEventListener('online', () => {
  initWebsocket();
});

setInterval(() => {
  let now = +new Date();
  if (now - lastTimestamp > 15 * 1000) {
    initWebsocket();
  }
  // app.runCmd(`open -a wechat`);
}, 10 * 1000);
