const os = require('node:os');

// Some Windows/Node combinations can make libuv fail while resolving the
// current user before tsx starts. Preserve the native result whenever it is
// available and fall back only for this exact operating-system error.
try {
  os.userInfo();
} catch (error) {
  if (error?.syscall !== 'uv_os_get_passwd') throw error;

  os.userInfo = () => ({
    username: process.env.USERNAME || 'local-user',
    uid: -1,
    gid: -1,
    shell: null,
    homedir: process.env.USERPROFILE || process.cwd(),
  });
}
