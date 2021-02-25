'use strict';

const Controller = require('egg').Controller;

const ScheduleTable = 'form_class_schedule';
const TermBegin = '2021-02-19';
const TermEnd = '2021-07-11';
const OneWeekMillionSecond = 1000 * 60 * 60 * 24 * 7;
const RateTypeMap = {
  'classroom': '1',
  'homework': '2',
  'morning': '3',
  'evening': '4',
  'habit': '5'
}

/**
 * 课程
 */
class LessonController extends Controller {

  async testTodo() {
    const access_token = await this.ctx.service.dingding.getToken();
    const result = await this.ctx.service.dingding.notify(access_token);

    this.ctx.body = {
      result: result
    }
  }

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

  /**
   * 获取课堂评价待办列表
   */
  async getClassroomRateList() {
    this.ctx.validate({
      userId: {type: 'number'},
      beginDate: {type: 'string'},
      endDate: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.query(rateListSql(requestParams.beginDate, requestParams.endDate, requestParams.userId));
    this.ctx.body = result
  }

  /**
   * 根据条件返回单个排课
   */
  async getClassSchedule() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.get('v_form_class_schedule', {...requestParams});
    if (result) {
      const rated = await db.get('form_rate_classroom', {schedule_id: result.id});
      this.ctx.body = {
        data: result,
        rated: !!rated
      }
    } else {
      this.ctx.body = {
        data: result,
        rated: false
      }
    }

  }

  /**
   * 获取用户信息
   */
  async getLessonUserInfo() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = {
      data: await db.get('sys_user', {...requestParams})
    }
  }

  /**
   * 获取课堂评价待办列表
   */
  async getClassroomRateListCurriculum() {
    this.ctx.validate({
      userId: {type: 'number'},
      beginDate: {type: 'string'},
      endDate: {type: 'string'},
      type: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.query(rateListSqlCurriculum(requestParams.beginDate, requestParams.endDate, requestParams.userId, requestParams.type));
    this.ctx.body = result
  }

  /**
   * 根据排课id获取学生列表
   */
  async getRateStudentList() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    let classId;
    if (requestParams.scheduleId) {
      const schedule = await db.get(ScheduleTable, {id: requestParams.scheduleId});
      classId = schedule.class_id;
    } else if (requestParams.curriculumId) {
      const curriculum = await db.get('form_rate_curriculum', {id: requestParams.curriculumId});
      classId = curriculum.class_id;
    }
    const studentList = await db.query(stuSql(classId));
    this.ctx.body = studentList;
  }

  /**
   * 根据id获取学生评价列表
   */
  async searchRateStudentList() {
    this.ctx.validate({
      type: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    if (requestParams.scheduleId) {
      const rateList = await db.query(searchStudentSql({
        type: requestParams.type,
        idName: 'schedule_id',
        id: requestParams.scheduleId
      }));
      this.ctx.body = rateList;
    } else if (requestParams.curriculumId) {
      const rateList = await db.query(searchStudentSql({
        type: requestParams.type,
        idName: 'classCurriculumId',
        id: requestParams.curriculumId
      }));
      this.ctx.body = rateList;
    }
  }

  /**
   * 写入评价
   */
  async addClassroomRate() {
    this.ctx.validate({
      userId: {type: 'number'},
      studentList: {type: 'array'},
      type: {type: 'string'},
      operate: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const insertList = [];
    if (requestParams.scheduleId) {
      const schedule = await db.get(ScheduleTable, {id: requestParams.scheduleId});
      requestParams.studentList.forEach(item => {
        insertList.push({
          id: requestParams.operate === 'add' ? null : item.id,
          class_id: schedule.class_id,
          createUserId: requestParams.userId,
          lesson_id: schedule.lesson_id,
          student_id: requestParams.operate === 'add' ? item.id : item.student_id,
          classtimeid: schedule.classtime,
          classname: schedule.classname,
          createUserName: null,
          lessonname: null,
          studentname: item.name,
          classtimename: null,
          classdate: schedule.classdate,
          rateresult: item.rateresult,
          ratereason: item.ratereason.join(','),
          remarks: item.remarks,
          classCurriculumId: null,
          schedule_id: requestParams.scheduleId
        })
      })
    } else if (requestParams.curriculumId) {
      const curriculum = await db.get('form_rate_curriculum', {id: requestParams.curriculumId});
      requestParams.studentList.forEach(item => {
        insertList.push({
          id: requestParams.operate === 'add' ? null : item.id,
          class_id: curriculum.class_id,
          createUserId: requestParams.userId,
          lesson_id: curriculum.lesson_id,
          student_id: requestParams.operate === 'add' ? item.id : item.student_id,
          classtimeid: curriculum.classtimeid,
          classname: curriculum.classname,
          createUserName: null,
          lessonname: null,
          studentname: item.name,
          classtimename: null,
          classdate: curriculum.classdate,
          rateresult: item.rateresult,
          ratereason: item.ratereason.join(','),
          remarks: item.remarks,
          classCurriculumId: requestParams.curriculumId,
          // schedule_id: null
        })
      })
    }
    let count = 0;
    await db.beginTransactionScope(async conn => {
      if (requestParams.operate === 'add') {
        for (let i = 0; i < insertList.length; i++) {
          const result = await conn.insert(`form_rate_${requestParams.type}`, {
            ...insertList[i],
            createdate: conn.literals.now,
          });
          count += result.affectedRows;
        }
      } else {
        for (let i = 0; i < insertList.length; i++) {
          const result = await conn.update(`form_rate_${requestParams.type}`, {
            ...insertList[i],
            createdate: conn.literals.now,
          }, {where: {id: insertList[i].id}});
          count += result.affectedRows;
        }
      }

    });
    this.ctx.body = {
      error: false,
      count
    }
  }


  /**
   * 添加一个旧评价任务
   */
  async addRateCurriculum() {
    this.ctx.validate({
      userId: {type: 'number'},
      userName: {type: 'string'},
      type: {type: 'string'},
      classId: {type: 'string'},
      // classTime: {type: 'string'},
      // lessonId: {type: 'string'},
      className: {type: 'string'},
      // lessonName: {type: 'string'},
      // classTimeName: {type: 'string'},
      classDate: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const rateType = RateTypeMap[requestParams.type];
    let insertId = '';
    await db.beginTransactionScope(async conn => {
      const result = await conn.insert('form_rate_curriculum', {
        id: null,
        class_id: requestParams.classId,
        createUserId: requestParams.userId,
        classtimeid: requestParams.classTime,
        lesson_id: requestParams.lessonId,
        classname: requestParams.className,
        createUserName: requestParams.userName,
        lessonname: requestParams.lessonName,
        classtimename: requestParams.classTimeName,
        classdate: requestParams.classDate,
        ratetype: rateType,
        createdate: conn.literals.now,
        savetype: '0'
      });
      insertId = result.insertId;
    });
    this.ctx.body = {
      error: false,
      insertId
    }
  }

  /**
   * 根据排课删除一个班的评价
   */
  async deleteClassroomRate() {
    this.ctx.validate({
      // userId: {type: 'number'},
      type: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    if (requestParams.scheduleId) {
      const result = await db.delete(`form_rate_${requestParams.type}`, {
        schedule_id: requestParams.scheduleId,
      });
      this.ctx.body = {
        result
      };
    } else if (requestParams.curriculumId) {
      const result = await db.delete(`form_rate_${requestParams.type}`, {
        classCurriculumId: requestParams.curriculumId,
      });
      this.ctx.body = {
        result
      };
    }
  }


  /**
   * 根据班级码获取班级
   */
  async getDeptFormIdCode() {
    this.ctx.validate({
      idCode: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.query(deptSql(requestParams.idCode));
    if (!result || !result.length) {
      return this.ctx.setError('无效的班级码');
    }
    this.ctx.body = result[0];
  }

  /**
   * 添加代课
   */
  async substitute() {
    this.ctx.validate({
      lessonId: {type: 'string'},
      userId: {type: 'number'},
      scheduleId: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.update(ScheduleTable, {
      substitute_lesson_id: requestParams.lessonId,
      substitute_teacher_id: requestParams.userId
    }, {where: {id: requestParams.scheduleId}});
    if (result.affectedRows === 1) {
      this.ctx.body = {
        result,
        error: false
      }
    } else {
      this.ctx.setError('添加代课失败，该课程可能已修改或删除，请重试')
    }

  }

  /**
   * 取消代课
   */
  async cancelSubstitute() {
    this.ctx.validate({
      userId: {type: 'number'},
      scheduleId: {type: 'string'},
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const result = await db.update(ScheduleTable, {
      substitute_lesson_id: null,
      substitute_teacher_id: null
    }, {where: {id: requestParams.scheduleId, substitute_teacher_id: requestParams.userId.toString()}});
    if (result.affectedRows === 1) {
      this.ctx.body = {
        result,
        error: false
      }
    } else {
      this.ctx.setError('取消代课失败，该代课信息可能已失效，请重试')
    }
  }
}

function listSql(beginDate, endDate, userId) {
  let sql = `SELECT
*,
( SELECT ${'`'}name${'`'} FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.lesson_id ) = lesson.id ) AS lessonName,
( SELECT ${'`'}name${'`'} FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.substitute_lesson_id ) = lesson.id ) AS substituteLessonName  
FROM
form_class_schedule a
where classdate >= '${beginDate}' and classdate <= '${endDate}' and 
(teacher_id = '${userId}' or substitute_teacher_id = '${userId}')
`;
  console.log(sql)
  return sql
}

function rateListSql(beginDate, endDate, teacherId) {
  let sql = `
  SELECT
  finalresult.* 
FROM
  (
  SELECT
    result.*,
    b.id AS rated 
  FROM
    ( SELECT a.*, ( SELECT NAME FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.lesson_id ) = lesson.id ) AS lessonName,
     ( SELECT NAME FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.substitute_lesson_id ) = lesson.id ) AS substituteLessonName  
    FROM form_class_schedule a WHERE 
    (a.teacher_id = '${teacherId}' or a.substitute_teacher_id = '${teacherId}') 
    AND a.classdate >= '${beginDate}' AND a.classdate <= '${endDate}' ) result
    LEFT JOIN form_rate_classroom b ON result.id = b.schedule_id 
  ) finalresult 
GROUP BY
  finalresult.id 
ORDER BY
  finalresult.classdate DESC,
  finalresult.classtime ASC
  `;
  return sql;
}

function rateListSqlCurriculum(beginDate, endDate, teacherId, type) {
  let sql = `
SELECT
	finalresult.* 
FROM
	(
	SELECT
		result.*,
		b.id AS rated 
	FROM
		(
		SELECT
			a.*,
			classtimeid AS classtime 
		FROM
			form_rate_curriculum a 
		WHERE
			a.createUserId = '${teacherId}' 
			AND a.classdate >= '${beginDate}' 
			AND a.classdate <= '${endDate}' 
			AND a.ratetype = '${RateTypeMap[type]}'
		) result
		LEFT JOIN form_rate_${type} b ON result.id = b.classCurriculumId 
	) finalresult 
GROUP BY
	finalresult.id 
ORDER BY
	finalresult.classdate DESC,
	finalresult.classtime ASC
  `;
  return sql;
}

function stuSql(classId) {
  let sql = `
  SELECT r.* FROM (SELECT * FROM base_stutocla_info a WHERE a.class_id = '${classId}') l
LEFT JOIN base_student_info r ON l.student_id = r.id 
ORDER BY r.sex ASC, r.name ASC`;
  return sql
}

function searchStudentSql({type, id, idName}) {
  let sql = `
  SELECT
  rateList.*,
  student.sex,
  student.NAME 
FROM
  ( SELECT rate.* FROM form_rate_${type} rate WHERE rate.${idName} = '${id}' ) rateList
  LEFT JOIN base_student_info student ON student.id = rateList.student_id 
ORDER BY
  student.sex ASC,
  student.NAME ASC
  `;
  return sql;
}

function deptSql(idcode) {
  let sql = `
  SELECT
d.dept_id,
d.parent_id,
d.ancestors,
d.dept_name,
d.order_num,
d.leader,
d.phone,
d.email,
d.STATUS,
d.del_flag,
d.create_by,
d.create_time,
d.grade,(
SELECT
dept_name 
FROM
sys_dept 
WHERE
dept_id = d.parent_id 
) parent_name,
idcode,
concat(( SELECT dept_name FROM sys_dept WHERE dept_id = d.parent_id ), d.dept_name ) fullname 
FROM
sys_dept d
WHERE
idcode = '${idcode}'
`
  return sql;
}

module.exports = LessonController;