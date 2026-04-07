import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerAllHandlers } from './ipc';
import { getDatabaseManager } from './database';

let mainWindow: BrowserWindow | null = null;

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 开发环境加载 Vite 开发服务器
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 初始化数据库
  const dbManager = getDatabaseManager();
  await dbManager.connect();
  
  // 注册所有 IPC 处理器
  registerAllHandlers();
  
  // 创建窗口
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
