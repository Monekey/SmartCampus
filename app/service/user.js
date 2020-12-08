'use strict';

const Service = require('egg').Service;

/**
 * 用户
 */
class UserService extends Service {
  // async find(uid) {
  //   const user = await this.ctx.db.query('select * from user where uid = ?', uid);
  //   return user;
  // }
  async find(loginType, openId) {
    const {app} = this;
    const db = app.mysql.get('app');

    let userInfo = null;
    switch (loginType) {
      case 'wx':
        userInfo = await db.get('user', {wxid: openId});
        if (userInfo) {
          const relation = await db.get('user_to_student', {user_id: userInfo.id});
          userInfo.studentInfo = relation;
        }
        break;
      case 'dd':
        break;
      default:
        return null
    }

    return userInfo;
  }

  async register() {

  }
}

module.exports = UserService;
