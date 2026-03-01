/**
 * Code signing script for AdvanceSafe Windows installer.
 * Uses CSC_LINK (PFX path) and CSC_KEY_PASSWORD from environment.
 * Graceful no-op if no certificate configured (unsigned build for internal use).
 */

const path = require('path');
const fs = require('fs');

exports.default = async function (configuration) {
  const certPath = process.env.CSC_LINK;
  const password = process.env.CSC_KEY_PASSWORD;
  if (!certPath || !password) {
    return;
  }
  const pfx = path.resolve(certPath);
  if (!fs.existsSync(pfx)) {
    return;
  }
  const signToolPath = process.env.SIGNTOOL_PATH || path.join(
    process.env.ProgramFiles || 'C:\\Program Files',
    'Windows Kits',
    '10',
    'bin',
    process.arch === 'x64' ? 'x64' : 'x86',
    'signtool.exe'
  );
  if (!fs.existsSync(signToolPath)) {
    return;
  }
  const { spawnSync } = require('child_process');
  const args = [
    'sign',
    '/f', pfx,
    '/p', password,
    '/tr', 'http://timestamp.digicert.com',
    '/td', 'sha256',
    '/fd', 'sha256',
    configuration.path
  ];
  const result = spawnSync(signToolPath, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Sign failed: ${result.status}`);
  }
};
