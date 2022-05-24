const { app, tray, BrowserWindow, ipcMain, Tray, nativeImage } = require('electrino')
const path = require('path');
const fs = require('fs');
const assetsDir = path.join(__dirname, 'assets');

let window = undefined;
let settingWindow = undefined;
app.on('ready', () => {
  // Setup the menubar with an icon
  // let client = new WebSocket('wss://real.coinall.ltd:8443/ws/v3');

  let icon = nativeImage.createFromDataURL(base64Icon)
  //tray.setPosition(0,0);

  // Add a click handler so that when the user clicks on the menubar icon, it shows
  // our popup window
  ipcMain.on('message', function (data) {
    // tray.setTitle(data+'99');
  });

  tray.setIcon('icon@4x.png');
  tray.on('click', function (event) {
    // window.loadURL(`file://${path.join(__dirname, 'index.html')}`);
    tray.setIcon('icon@4x.png');
    // window.reload();
  });
  tray.on('setting', () => {
    showSetting();
  });
  tray.on('refresh', () => {
    window.reload();
  });
  tray.on('exit', () => {
    app.exit();
  });

  // let injectScript = app.readFile(`app/index`);
  // Make the popup window for the menubar
  window = new BrowserWindow({
    width: 500,
    height: 350,
    show: true,
    frame: true,
    resizable: true,
    injectScript: app.readFile(`app/index`)
  });

  // Tell the popup window to load our index.html file
  // window.loadURL(`file://${path.join(__dirname, 'index.html')}`);
  window.loadURL(`https://cn.tradingview.com/chart/Bz44ipwy/?symbol=OKEX%3ABTCUSDT`);
  window.on('blur', () => { });
  window.on('created', (ctx) => { });
})

const toggleWindow = () => {
  if (window.isVisible()) {
    //    window.hide()
    showWindow()
    window.focus()
  } else {
    showWindow()
  }
}

function showSetting () {
  if (settingWindow) {
    // settingWindow.setPosition(0, 0, false);
    settingWindow.show();
    settingWindow.focus();
  } else {
    settingWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: true,
      frame: true,
      resizable: false,
      closable: true,
      minimizable: false,
      maximizable: false
    });
    settingWindow.loadURL(`file://${path.join(__dirname, 'setting.html')}`);
    settingWindow.on('created', (ctx) => {
      ctx.evalScript(`console.log("eval js1");`);
    });
  }
}

const showWindow = () => {
  const trayPos = tray.getBounds()
  const windowPos = window.getBounds()
  let x, y = 0
  if (process.platform == 'darwin') {
    x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
    y = Math.round(trayPos.y + trayPos.height)
  } else {
    x = Math.round(trayPos.x + (trayPos.width / 2) - (windowPos.width / 2))
    y = Math.round(trayPos.y + trayPos.height * 10)
  }


  window.setPosition(x, y, false)
  window.show()
  window.focus()
}

ipcMain.on('show-window', () => {
  showWindow()
})

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Tray Icon as Base64 so tutorial has less overhead
let base64Icon = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAStJREFUOE9jTMgoa2BkYLRnYGBwYCANHPjP8P8gY2Jm+RWG/wzapOmFqmZkuMqYmFH+nyzNMDOINaC8IJVhy+adDFfvPkKxD6sLKvKTGTZv2Q1XrKGmxBDk4cCwcesehr/MLAw3bt2DG4JigJSkGIOpsR6DtpIcw/U7Dxj+MTEx3L5xh6GkOAPF1qTMCuwGBHvYM3j7e8Ilb1+/zbBp626G4pIs8gy4c/0W2NkDb0CAlzOKF1onzycuDEBeaJs0j4HjxzeGorIchi2bdjLcunGb4QcHF3YDFIX4GMwNdRiUtdQZ7l67yfCPmZlh1a7DYMVhbrYMV+8+JC4dVOUlgQMPPdFgS7FYE5KRrDjDTzZ2og3YT0ZOhDnmACM4OzMyhpCcIxkZrv7//38NAFQalpXe0T44AAAAAElFTkSuQmCC`;

