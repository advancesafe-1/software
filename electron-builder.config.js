/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.advancesosmax.advancesafe',
  productName: 'AdvanceSafe',
  directories: {
    output: 'release',
  },
  files: ['dist/**/*', 'dist-electron/**/*'],
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
