'use strict';

const Controller = require('egg').Controller;

const ScheduleTable = 'form_class_schedule';
const TermBegin = '2021-02-19';
const TermEnd = '2021-07-11';
const OneWeekMillionSecond = 1000 * 60 * 60 * 24 * 7;

/**
 * 课程
 */
class LessonController extends Controller {

  /**
   * 查询列表
   */
  async getClassScheduleList() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    console.log(requestParams)
    const result = await db.query(listSql(requestParams.beginDate, requestParams.endDate, requestParams.userId))
    this.ctx.body = result
  }

  /**
   * 添加课程
   */
  async addClassSchedule() {
    this.ctx.validate({
      userId: {type: 'number'},
      teacherId: {type: 'number'},
      classTime: {type: 'string'},
      className: {type: 'string'},
      classDate: {type: 'string'},
      lessonId: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    if (requestParams.id) {
      await db.update(ScheduleTable, {
        classdate: requestParams.classDate,
        classtime: requestParams.classTime,
        class_id: requestParams.classId,
        update_time: conn.literals.now,
        teacher_id: requestParams.teacherId,
        classname: requestParams.className,
        lesson_id: requestParams.lessonId,
      })
    } else {
      //验证当天课程的占用情况
      const result = await db.select(ScheduleTable, {
        where: {
          classdate: requestParams.classDate,
          classtime: requestParams.classTime,
          class_id: requestParams.classId,
        }
      });
      console.log(result);
      if (result.length) {
        const teacher = await db.get('sys_user', {user_id: result[0].teacher_id})
        return this.ctx.setError(`该课次被${teacher.user_name}占用`)
      }
      let insertId;
      try {
        await db.beginTransactionScope(async conn => {
          const result = await conn.insert(ScheduleTable, {
            classdate: requestParams.classDate,
            classtime: requestParams.classTime,
            class_id: requestParams.classId,
            update_time: conn.literals.now,
            teacher_id: requestParams.teacherId,
            classname: requestParams.className,
            lesson_id: requestParams.lessonId,
          });
          insertId = result.insertId;
        })
      } catch (e) {
        return this.ctx.setError(JSON.stringify(e))
      }

      this.ctx.body = {error: false, id: insertId}
    }
  }

  /**
   * 填充
   */
  async fillClassSchedule() {
    this.ctx.validate({
      id: {type: 'number'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const fillObj = await db.get(ScheduleTable, {
      id: requestParams.id
    });
    let currTime = new Date(fillObj.classdate).getTime() + OneWeekMillionSecond;
    const endTime = new Date(TermEnd).getTime();

    const errorList = [];
    fillObj.id = null;
    while (currTime <= endTime) {
      try {
        await db.beginTransactionScope(async conn => {
          await conn.insert(ScheduleTable, {
            ...fillObj,
            classdate: new Date(currTime),
            update_time: conn.literals.now,
          });
        })
      } catch (e) {
        errorList.push({date: new Date(currTime)})
      }
      currTime += OneWeekMillionSecond;
    }
    this.ctx.body = {errorList}
  }

  /**
   * 删除
   */
  async deleteClassSchedule() {
    this.ctx.validate({
      id: {type: 'number'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const fillObj = await db.get(ScheduleTable, {
      id: requestParams.id
    });
    await db.delete(ScheduleTable, {id: requestParams.id});
    this.ctx.body = {
      error: false,
    }
    //删除之前的
    let currTime = new Date(fillObj.classdate).getTime() + OneWeekMillionSecond;
    const endTime = new Date(TermEnd).getTime();

    const errorList = []
    while (currTime <= endTime) {
      try {
        await db.beginTransactionScope(async conn => {
          await conn.delete(ScheduleTable, {
            classdate: this.ctx.helper.FormatDate('yyyy-MM-dd', new Date(currTime)),
            class_id: fillObj.class_id,
            classtime: fillObj.classtime,
            teacher_id: fillObj.teacher_id,
            lesson_id: fillObj.lesson_id
          });
        })
      } catch (e) {
        errorList.push({date: new Date(currTime)})
      }
      currTime += OneWeekMillionSecond;
    }
  }
}

function listSql(beginDate, endDate, userId) {
  let sql = `SELECT
*,
( SELECT ${'`'}name${'`'} FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.lesson_id ) = lesson.id ) AS lessonName 
FROM
form_class_schedule a
where classdate >= '${beginDate}' and classdate <= '${endDate}' and teacher_id = '${userId}'
`;
  return sql
}

module.exports = LessonController;