'use strict';

const Controller = require('egg').Controller;

/**
 * 学生
 */
class StudentController extends Controller {

  /**
   * 根据id获取学生信息
   * @returns {Promise<void>}
   */
  async getStudentInfo() {
    this.ctx.validate({
      id: { type: 'string' },
    });
    const requestParams = this.ctx.request.body;
    const studentInfo = await this.ctx.service.student.getStudentById(requestParams.id);
    this.ctx.body = studentInfo;
  }

  /**
   * 获取班级学生列表
   * @returns {Promise<void>}
   */
  async getStudentList() {
    this.ctx.validate({
      // userId: { type: 'number' },
      classId: { type: 'string' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.query(studentByClassId(requestParams.classId, requestParams.status));
  }

  /**
   *添加学生
   * @returns {Promise<void>}
   */
  async addStudent() {
    this.ctx.validate({
      userId: { type: 'number' },
      classId: { type: 'string' },
      name: { type: 'string' },
      scode: { type: 'string' },
      sex: { type: 'string' },
      idcard: { type: 'string' },
      urgentphone: { type: 'string' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    try {
      await db.beginTransactionScope(async conn => {
        const id = uuid();
        const result = await conn.insert('base_student_info', {
          id,
          name: requestParams.name,
          sex: requestParams.sex,
          idcard: requestParams.idcard,
          scode: requestParams.scode,
          BIRTHDAY: null,
          STATUS: '0',
          loginCard: null,
          urgentphone: requestParams.urgentphone
        });
        const result2 = await conn.insert('base_stutocla_info', {
          id: null,
          student_id: id,
          class_id: requestParams.classId,
          status: null
        });
      });
    } catch (e) {
      this.logger.error(JSON.stringify(e));
      return this.ctx.setError('保存失败，请联系管理员');
    }
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 禁用/启用学生
   * @returns {Promise<void>}
   */
  async disableStudent() {
    this.ctx.validate({
      userId: { type: 'number' },
      studentId: { type: 'string' },
      disable: { type: 'boolean' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    let rows = 0;
    try {
      const result = await db.update('base_student_info', {
        STATUS: requestParams.disable ? 1 : 0,
      }, { where: { id: requestParams.studentId } });
      rows += result.affectedRows;
    } catch (e) {
      this.logger.error(JSON.stringify(e));
      this.ctx.setError('操作失败，请联系管理员');
    }

    this.ctx.body = {
      error: false,
      rows
    };
  }

  /**
   * 保存学生列表(序号)
   * @returns {Promise<void>}
   */
  async saveStudentList() {
    this.ctx.validate({
      userId: { type: 'number' },
      studentList: { type: 'array' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;

    let rows = 0;
    try {
      await db.beginTransactionScope(async conn => {
        for (let i = 0; i < requestParams.studentList.length; i++) {
          const student = requestParams.studentList[i];
          const result = await conn.update('base_student_info', {
            scode: student.scode,
          }, { where: { id: student.id } });
          rows += result.affectedRows;
        }
      });
    } catch (e) {
      this.logger.error(JSON.stringify(e));
      return this.ctx.setError('保存失败，请联系管理员');
    }
    this.ctx.body = {
      error: false,
      rows
    };
  }
}

function studentByClassId(classId, status) {
  let extendSql = '';
  if (status) {
    extendSql += `AND student.\`STATUS\` = '${status}'`;
  }
  return `
  SELECT student.* from base_student_info student LEFT JOIN base_stutocla_info b ON student.id = b.student_id
WHERE 1=1 AND b.class_id = '${classId}' ${extendSql}
order by student.\`STATUS\`,student.scode+0
`;
}

function uuid() {
  var s = [];
  var hexDigits = '0123456789abcdef';
  for (var i = 0; i < 16; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-';

  var uuid = s.join('');
  return uuid;
}

module.exports = StudentController;
