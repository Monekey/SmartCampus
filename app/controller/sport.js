'use strict';

const Controller = require('egg').Controller;

/**
 * 体育成绩录入
 */
class SportController extends Controller {

  /**
   * 获取项目列表
   * @returns {Promise<void>}
   */
  async getSportProject() {
    const db = this.app.mysql.get('ry');
    // const requestParams = this.ctx.request.body;
    this.ctx.body = await db.select('base_sport_project', {
      where: {
        status: 1
      }
    });
  }

  /**
   * 获取项目列表
   * @returns {Promise<void>}
   */
  async getSportTask() {
    this.ctx.validate({
      taskId: { type: 'string' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.get('form_sport_task', {
      id: requestParams.taskId
    });
  }

  /**
   * 获取项目列表
   * @returns {Promise<void>}
   */
  async getSportProjectById() {
    this.ctx.validate({
      id: { type: 'number' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.get('base_sport_project', {
      id: requestParams.id,
      status: 1
    });
  }


  /**
   * 批量保存成绩
   */
  async saveSportScore() {
    this.ctx.validate({
      studentList: { type: 'array' },
      taskId: { type: 'string' },
      teacherName: { type: 'string' },
      teacherId: { type: 'number' },
      projectId: { type: 'number' },
      projectName: { type: 'string' },
      unit: { type: 'string' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const date = new Date();
    const addRows = [];
    let count = 0;
    let errors = 0;
    for (let index = 0; index < requestParams.studentList.length; index++) {
      const student = requestParams.studentList[index];
      const row = {
        score_task_id: requestParams.taskId,
        student_id: student.id,
        student_name: student.name,
        project_id: requestParams.projectId,
        project_name: requestParams.projectName,
        project_unit: requestParams.unit,
        score: student.score,
        teacher_id: requestParams.teacherId,
        teacher_name: requestParams.teacherName,
        update_time: date
      };
      if (student.scoreId) { //更新
        row.id = student.scoreId;
        const result = await db.update('form_sport_score', row, { where: { id: student.scoreId } });
        count += result.affectedRows;
      } else {//新增
        const result = await db.insert('form_sport_score', row);
        addRows.push({ scoreId: result.insertId, id: student.id });
        count++;
      }
    }

    this.ctx.body = {
      count: count,
      addRows: addRows,
      errors: errors
    };
  }

  /**
   * 根据任务id查询学生成绩列表
   */
  async getSportScoreByTaskId() {
    this.ctx.validate({
      taskId: { type: 'string' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.select('form_sport_score', {
      where: {
        score_task_id: requestParams.taskId
      }
    });
  }

  async deleteSportTaskAndScore() {
    this.ctx.validate({
      taskId: { type: 'number' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.beginTransactionScope(async conn => {
      await conn.delete('form_sport_score', {
        score_task_id: requestParams.taskId
      });
      await conn.delete('form_sport_task', {
        id: requestParams.taskId
      });
    });
    this.ctx.body = {
      result: result,
      error: false
    };
  }

  /**
   * 待办任务列表
   */
  async getSportTaskList() {
    this.ctx.validate({
      teacherId: { type: 'number' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.query(scoreTaskListSql(requestParams.teacherId));
  }

  /**
   * 新增一个体育成绩录入的任务
   */
  async addNewSportTask() {
    this.ctx.validate({
      projectId: { type: 'string' },
      classId: { type: 'string' },
      teacherId: { type: 'number' },
      teacherName: { type: 'string' },
      className: { type: 'string' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    //step1 检查是否重复
    const repeatItem = await db.get('form_sport_task', {
      class_id: requestParams.classId,
      project_id: requestParams.projectId,
    });
    if (repeatItem) {
      return this.ctx.body = {
        isRepeat: true,
        repeatItem
      };
    }
    //step2 添加任务
    const result = await db.insert('form_sport_task', {
      class_id: requestParams.classId,
      class_name: requestParams.className,
      project_id: requestParams.projectId,
      teacher_id: requestParams.teacherId,
      teacher_name: requestParams.teacherName,
      create_time: new Date(),
    });
    const insertId = result.insertId;
    this.ctx.body = {
      isRepeat: false,
      insertId
    };
  }
}

function scoreTaskListSql(teacherId) {
  return `SELECT
  finalresult.* 
FROM
  (
  SELECT
    result.*,
    b.state AS rated,
    student.total AS total
  FROM
    ( SELECT a.* , (SELECT projectName FROM base_sport_project WHERE a.project_id = id) AS projectName
    FROM form_sport_task a WHERE 
    a.teacher_id = '${teacherId}') result
    LEFT JOIN (SELECT class_id, SUM(state) as total FROM base_stutocla_info GROUP BY class_id) student
    ON student.class_id = result.class_id
    LEFT JOIN 
    (SELECT SUM(score.state) as state, score.score_task_id FROM form_sport_score score GROUP BY score.score_task_id) b 
    ON result.id = b.score_task_id
  ) finalresult 

`;
}

module.exports = SportController;
