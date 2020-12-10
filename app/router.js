'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  const { index } = controller.home;
  router.get('/', index);
  const { validateStudent, validateTeacher, decryptData, register, registerTeacher, parentLogin, teacherLogin, getUserInfo } = controller.user;
  router.get('/parentLogin', parentLogin);
  router.get('/teacherLogin', teacherLogin);
  router.post('/decryptData', decryptData);
  router.post('/validateStudent', validateStudent);
  router.post('/validateTeacher', validateTeacher);
  router.post('/register', register);
  router.post('/registerTeacher', registerTeacher);
  router.post('/getUserInfo', getUserInfo);
};
