/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1606582157224_8464';

  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  const mysql = {
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
      school: {
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
    default: {

    },

    // load into app, default is open
    app: true,
    // load into agent, default is close
    agent: false,
  };

  return {
    ...config,
    ...userConfig,
    mysql
  };
};
