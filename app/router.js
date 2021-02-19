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
  const {index: exports, importClazzToLesson, exportTeacherRate, importScoreConfirm} = controller.exports;
  router.get('/exports', exports);
  router.get('/importClazzToLesson', importClazzToLesson);
  router.get('/exportTeacherRate', exportTeacherRate);
  router.get('/importScoreConfirm', importScoreConfirm);
  const {addClassSchedule, getClassScheduleList, deleteClassSchedule, fillClassSchedule} = controller.lesson;
  router.post('/addClassSchedule', addClassSchedule);
  router.post('/getClassScheduleList', getClassScheduleList);
  router.post('/deleteClassSchedule', deleteClassSchedule);
  router.post('/fillClassSchedule', fillClassSchedule);
};
