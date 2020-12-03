'use strict';


/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
  mysql: {
    enable: true,
    package: 'egg-mysql',
  },
  validate: {
    enable: true,
    package: 'egg-validate',
  },
  security: {
    // eslint-disable-next-line eggache/no-unexpected-plugin-keys
    xframe: {
      enable: false,
    },
    // eslint-disable-next-line eggache/no-unexpected-plugin-keys
    csrf: {
      enable: false,
    },
  },
};
