'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  const { index } = controller.home;
  router.get('/', index);
  const {
    validateStudent,
    validateTeacher,
    decryptData,
    register,
    registerTeacher,
    parentLogin,
    teacherLogin,
    getUserInfo
  } = controller.user;
  router.get('/parentLogin', parentLogin);
  router.get('/teacherLogin', teacherLogin);
  router.post('/decryptData', decryptData);
  router.post('/validateStudent', validateStudent);
  router.post('/validateTeacher', validateTeacher);
  router.post('/register', register);
  router.post('/registerTeacher', registerTeacher);
  router.post('/getUserInfo', getUserInfo);
  const { addLeave, getLeaveList, cancelAsk, leaveApproval, addCheckoutLeave } = controller.leave;
  router.post('/addLeave', addLeave);
  router.post('/getLeaveList', getLeaveList);
  router.post('/cancelAsk', cancelAsk);
  router.post('/leaveApproval', leaveApproval);
  router.post('/addCheckoutLeave', addCheckoutLeave);
  const { index: exports, importClazzToLesson, exportTeacherRate, importScoreConfirm } = controller.exports;
  router.get('/exports', exports);
  router.get('/importClazzToLesson', importClazzToLesson);
  router.get('/exportTeacherRate', exportTeacherRate);
  router.get('/importScoreConfirm', importScoreConfirm);
  const {
    searchRateDetail,
    cancelSubstitute,
    substitute,
    testTodo,
    getClassSchedule,
    getDeptFormIdCode,
    deleteClassroomRate,
    searchRateStudentList,
    getClassroomRateListCurriculum,
    addClassSchedule,
    getClassScheduleList,
    deleteClassSchedule,
    fillClassSchedule,
    getClassroomRateList,
    getRateStudentList,
    addClassroomRate,
    addRateCurriculum
  } = controller.lesson;
  router.get('/testTodo', testTodo);
  router.post('/addClassSchedule', addClassSchedule);
  router.post('/getClassSchedule', getClassSchedule);
  router.post('/getClassScheduleList', getClassScheduleList);
  router.post('/deleteClassSchedule', deleteClassSchedule);
  router.post('/fillClassSchedule', fillClassSchedule);
  router.post('/getClassroomRateList', getClassroomRateList);
  router.post('/getRateStudentList', getRateStudentList);
  router.post('/addClassroomRate', addClassroomRate);
  router.post('/addRateCurriculum', addRateCurriculum);
  router.post('/getClassroomRateListCurriculum', getClassroomRateListCurriculum);
  router.post('/searchRateStudentList', searchRateStudentList);
  router.post('/deleteClassroomRate', deleteClassroomRate);
  router.post('/getDeptFormIdCode', getDeptFormIdCode);
  router.post('/substitute', substitute);
  router.post('/cancelSubstitute', cancelSubstitute);
  router.post('/searchRateDetail', searchRateDetail);
  const { getStudentList, addStudent, saveStudentList, disableStudent } = controller.student;
  router.post('/getStudentList', getStudentList);
  router.post('/addStudent', addStudent);
  router.post('/saveStudentList', saveStudentList);
  router.post('/disableStudent', disableStudent);
  const {
    getSportProject,
    addNewSportTask,
    getSportTask,
    getSportProjectById,
    saveSportScore,
    getSportTaskList,
    getSportScoreByTaskId,
    deleteSportTaskAndScore
  } = controller.sport;
  router.post('/getSportProject', getSportProject);
  router.post('/addNewSportTask', addNewSportTask);
  router.post('/getSportTask', getSportTask);
  router.post('/getSportProjectById', getSportProjectById);
  router.post('/saveSportScore', saveSportScore);
  router.post('/getSportTaskList', getSportTaskList);
  router.post('/getSportScoreByTaskId', getSportScoreByTaskId);
  router.post('/deleteSportTaskAndScore', deleteSportTaskAndScore);
  const {getScoreStatist, getClassStudentStat} = controller.statistic;
  router.post('/getScoreStatist', getScoreStatist);
  router.post('/getClassStudentStat', getClassStudentStat);
};
