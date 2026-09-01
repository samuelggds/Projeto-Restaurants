const os = require('node:os');

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
