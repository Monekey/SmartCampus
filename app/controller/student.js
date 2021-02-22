'use strict';

const Controller = require('egg').Controller;

/**
 * 学生
 */
class StudentController extends Controller {
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
    this.ctx.body = await db.query(studentByClassId(requestParams.classId));
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
          scode: null,
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
      return this.ctx.setError(JSON.stringify(e));
    }
    this.ctx.body = {
      error: false
    };
  }
}

function studentByClassId(classId) {
  return `
  SELECT student.* from base_student_info student LEFT JOIN base_stutocla_info b ON student.id = b.student_id
WHERE 1=1 AND b.class_id = '${classId}'
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
