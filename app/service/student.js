'use strict';

const Service = require('egg').Service;

class StudentService extends Service {
  /**
   * 根据Id获取学生
   * @param idCard
   * @param studentName
   * @returns {Promise<*>}
   */
  async query({idCard, studentName}) {
    const db = this.app.mysql.get('ry');

    return await db.get('base_student_info', {
      idcard: idCard,
      name: studentName
    });
  }

  /**
   * 根据学生id获取学生信息
   * @param id
   * @returns {Promise<*>}
   */
  async getInfoById(id) {
    const db = this.app.mysql.get('ry');

    return await db.get('v_form_student_info', {
      studentid: id,
    });
  }
}

module.exports = StudentService;
