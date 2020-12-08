'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const {router, controller} = app;
  const {index} = controller.home;
  router.get('/', index);
  const {validateStudent, decryptData, register, parentLogin, getUserInfo} = controller.user;
  router.get('/parentLogin', parentLogin);
  router.post('/decryptData', decryptData);
  router.post('/validateStudent', validateStudent);
  router.post('/register', register);
  router.post('/getUserInfo', getUserInfo);
};
