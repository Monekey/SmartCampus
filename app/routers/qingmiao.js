/**
 * 青苗关爱计划路由
 * @param app
 */
module.exports = app => {
  const { router, controller } = app;
  const {
    update,
    getBase,
    updateCommunicate,
    updateStudy,
    getHistory,
    getCommunicate,
    getStudy,
    updateEvent,
    getEvent,
    updateProblem,
    getProblem,
    deleteProblem,
    deleteStudy,
    deleteCommunicate,
    deleteEvent,
    setKeyStudent,
    getKey,
    getKeyStudentList,
    getStudentList
  } = controller.qingmiao;
  router.post('/qingmiao/update', update);
  router.post('/qingmiao/getBase', getBase);
  router.post('/qingmiao/updateCommunicate', updateCommunicate);
  router.post('/qingmiao/updateStudy', updateStudy);
  router.post('/qingmiao/getHistory', getHistory);
  router.post('/qingmiao/getCommunicate', getCommunicate);
  router.post('/qingmiao/getStudy', getStudy);
  router.post('/qingmiao/updateEvent', updateEvent);
  router.post('/qingmiao/getEvent', getEvent);
  router.post('/qingmiao/updateProblem', updateProblem);
  router.post('/qingmiao/getProblem', getProblem);
  router.post('/qingmiao/deleteProblem', deleteProblem);
  router.post('/qingmiao/deleteStudy', deleteStudy);
  router.post('/qingmiao/deleteCommunicate', deleteCommunicate);
  router.post('/qingmiao/deleteEvent', deleteEvent);
  router.post('/qingmiao/setKeyStudent', setKeyStudent);
  router.post('/qingmiao/getKey', getKey);
  router.post('/qingmiao/getKeyStudentList', getKeyStudentList);
  router.post('/qingmiao/getStudentList', getStudentList);
};
