const electrino = require("electrino");
const { app, BrowserWindow, ipcMain, Tray, nativeImage } = require('electrino')
const path = require('path');
const assetsDir = path.join(__dirname, 'assets')

let window = undefined

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
  // electrino.tray.on('click', function (event) {
  //   toggleWindow();
  //   ipcMain.send('message', 'aaa');
  //   let icon = nativeImage.createFromDataURL(base64Icon);
  //   let random = Math.floor(Math.random() * 10);
  //   let iconName = 'icon@4x.png';
  //   if (random < 3) {
  //     iconName = 'icon-down-down@4x.png';
  //   } else if (random > 7) {
  //     iconName = 'icon-up-up@4x.png';
  //   }
  //   // tray.setIcon(iconName);
  //   // tray.setTitle(new Date().toTimeString());
  //   notify('测试', '内容XXX');
  //   // Show devtools when command clicked
  //   if (window.isVisible() && process.defaultApp && event.metaKey) {
  //     window.openDevTools({ mode: 'detach' })
  //   }
  // })

  // Make the popup window for the menubar
  window = new BrowserWindow({
    width: 300,
    height: 350,
    show: true,
    frame: true,
    resizable: false
  });

  // Tell the popup window to load our index.html file
  window.loadURL(`file://${path.join(__dirname, 'index.html')}`);
  // window.loadURL(`https://mp.weixin.qq.com`);

  // Only close the window on blur if dev tools isn't opened
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide()
    }
  })
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

