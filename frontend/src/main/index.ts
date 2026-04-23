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
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  let dbConnected = false;
  
  try {
    // 初始化数据库
    const dbManager = getDatabaseManager();
    await dbManager.connect();
    dbConnected = true;
    console.log('Database initialized successfully');
    
    // 注册所有 IPC 处理器（需要数据库的）
    registerAllHandlers();
    
    // 不在启动时自动生成向量，而是在用户下载模型后或手动触发时生成
    // 这样可以避免在模型未下载时尝试生成向量导致的错误
  } catch (error) {
    console.error('Failed to initialize database:', error);
    console.warn('Application will start without database functionality');
    console.warn('Please install Visual Studio Build Tools to compile better-sqlite3');
    
    // 即使数据库失败，也注册不依赖数据库的处理器
    const { registerSettingsHandlers } = require('./ipc/settingsHandlers');
    const { registerModelHandlers } = require('./ipc/modelHandlers');
    const { registerAuthHandlers } = require('./ipc/authHandlers');
    const { registerSyncHandlers } = require('./ipc/syncHandlers');
    const { registerShareHandlers } = require('./ipc/shareHandlers');
    registerSettingsHandlers();
    registerModelHandlers();
    registerAuthHandlers();
    registerSyncHandlers();
    registerShareHandlers();
  }
  
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
