'use strict';

const Controller = require('egg').Controller;

/**
 * 统计
 */
class StatisticController extends Controller {

  /**
   * 获取班级平均分
   * @returns {Promise<void>}
   */
  async getScoreStatist() {
    this.ctx.validate({
      classIdList: { type: 'array' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    if (!requestParams.classIdList.length) {
      this.ctx.body = {};
      return;
    }
    const TableTypes = [ 'classroom', 'morning', 'evening', 'homework', 'habit' ];
    const countMap = {};
    for (let i = 0; i < requestParams.classIdList.length; i++) {
      const r = await db.query(`SELECT COUNT(*) as count from base_stutocla_info WHERE class_id = ${requestParams.classIdList[i]}`);
      countMap[requestParams.classIdList[i]] = r[0].count;
    }
    const result = {};
    for (let i = 0; i < TableTypes.length; i++) {
      const type = TableTypes[i];
      result[type] = await db.query(clazzScore(requestParams.classIdList, type));
      result[type].forEach(item => {
        item.scoreF = Math.floor(item.score / countMap[item.class_id]);
      });
    }
    this.ctx.body = result;
  }

  /**
   * 班级所有学生总分
   * @returns {Promise<void>}
   */
  async getClassStudentStat() {
    this.ctx.validate({
      classId: { type: 'string' },
      beginDate: { type: 'string' },
      endDate: { type: 'string' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.query(studentSql(requestParams));
  }


}

function clazzScore(classIdList = [], type = 'morning', countList = []) {
  let sql = `
  SELECT
  classname,
  SUM( a.score ) AS score,
  class_id 
FROM
  (
  SELECT
    *,
  CASE
      rateresult 
      WHEN 'A' THEN 5 
      WHEN 'C' THEN -5 
      ELSE 0 END AS score 
  FROM
    form_rate_${type} 
  WHERE
  class_id IN ( ${classIdList.join(',')} ) AND classdate > '2021-02-01' ) a 
GROUP BY
  class_id
  `;
  return sql;
}

function studentSql({ classId, beginDate, endDate }) {
  let sql = `SELECT
  rate.*,
  SUM( rate.score ) AS total,
  AVG( rate.score ) AS avg 
FROM
  base_stutocla_info stu
  INNER JOIN ( SELECT *, CASE rateresult WHEN 'A' THEN 5 WHEN 'C' THEN - 5 ELSE 0 END AS score FROM form_rate_homework ) rate ON stu.class_id = ${classId} 
  AND rate.student_id = stu.student_id 
  AND  classdate >= '${beginDate}' and classdate <= '${endDate}' 
GROUP BY
  rate.classdate, rate.student_id`;
  return sql;
}

module.exports = StatisticController;
