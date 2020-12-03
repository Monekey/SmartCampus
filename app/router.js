'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.get('/parentLogin', controller.home.parentLogin);
  router.post('/decryptData', controller.home.decryptData);
  router.post('/validateStudent', controller.home.validateStudent);
  router.post('/register', controller.home.register);
  router.post('/getUserInfo', controller.home.getUserInfo);
};
