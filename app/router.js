'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const {router, controller} = app;
  const {index} = controller.home;
  router.get('/', index);
  const {validateStudent, validateTeacher, decryptData, register, registerTeacher, parentLogin, teacherLogin, getUserInfo} = controller.user;
  router.get('/parentLogin', parentLogin);
  router.get('/teacherLogin', teacherLogin);
  router.post('/decryptData', decryptData);
  router.post('/validateStudent', validateStudent);
  router.post('/validateTeacher', validateTeacher);
  router.post('/register', register);
  router.post('/registerTeacher', registerTeacher);
  router.post('/getUserInfo', getUserInfo);
  const {addLeave, getLeaveList, cancelAsk, leaveApproval, addCheckoutLeave} = controller.leave;
  router.post('/addLeave', addLeave);
  router.post('/getLeaveList', getLeaveList);
  router.post('/cancelAsk', cancelAsk);
  router.post('/leaveApproval', leaveApproval);
  router.post('/addCheckoutLeave', addCheckoutLeave);
  const {index: exports} = controller.exports;
  router.get('/exports', exports);
};
