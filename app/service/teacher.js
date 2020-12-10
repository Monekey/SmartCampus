'use strict';

const Service = require('egg').Service;
const { roleMap } = require('../utils/RYDict');

class TeacherService extends Service {
  /**
   * 根据条件获取教师
   * @param mobile
   * @param teacherName
   * @returns {Promise<*>}
   */
  async query({ teacherName, mobile }) {
    const db = this.app.mysql.get('ry');

    const user = await db.get('sys_user', {
      phonenumber: mobile,
      user_name: teacherName
    });
    return user;
  }

  /**
   * 获取旧系统用户角色
   * @param id 旧系统用户id
   * @returns {Promise<*|Uint8Array|BigInt64Array|*[]|Float64Array|Int8Array|Float32Array|Int32Array|Uint32Array|Uint8ClampedArray|BigUint64Array|Int16Array|Uint16Array>}
   */
  async getRYUserRoles(id) {
    const db = this.app.mysql.get('ry');

    const roles = await db.select('sys_user_role', {
      where: { user_id: id, }
    });
    return roles.map(item => roleMap[item.role_id].value);
  }
}

module.exports = TeacherService;
