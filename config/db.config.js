// eslint-disable-next-line strict
exports.mysql = {
  clients: {
    // clientId, access the client instance by app.mysql.get('clientId')
    ry: {
      // host
      host: '101.201.153.14',
      // port
      port: '3306',
      // username
      user: 'tongsheng',
      // password
      password: 'tongsheng',
      // database
      database: 'ry',
    },
    // ...
  },
  // default configuration for all databases
  default: {},

  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
