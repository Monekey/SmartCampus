'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx, app } = this;
    // this.logger.debug('current user: %j', this.app);
    const db = app.mysql.get('ry');
    console.log(db);
    // const result = await db.select('base_student_info', {})
    const result = app.config.miniApp;
    ctx.body = result;
  }

  /*
   * 家长登录
   * @returns {Promise<void>}
   */
  async parentLogin() {
    const query = this.ctx.query;
    // 调用 Service 进行业务处理
    const result = await this.ctx.service.weixin.code2Session(query.code, 'parentApp');

    this.ctx.cookies.set('sessionKey', result.sessionKey, { httpOnly: true });

    this.ctx.body = result;
  }

  /*
   * 微信解密报文(手机号)
   * @returns {Promise<void>}
   */
  async decryptData() {
    console.log(this.ctx.request.body);
    this.ctx.validate({
      encryptedData: { type: 'string' },
      iv: { type: 'string' },
      sessionKey: { type: 'string' },
    });
    this.ctx.body = await this.ctx.service.weixin.decryptData({ ...this.ctx.request.body, appType: 'parentApp' });
  }

  /**
   * 验证学生
   * @returns {Promise<void>}
   */
  async validateStudent() {
    const { ctx, app } = this;
    const db = app.mysql.get('ry');
    ctx.validate({
      studentName: { type: 'string' },
      idCard: { type: 'string' },
    });

    const result = await db.get('base_student_info', {
      idcard: this.ctx.request.body.idCard,
      name: this.ctx.request.body.studentName,
    });
    if (!result || !result.id) {
      this.ctx.body = { msg: '未找到绑定的学生信息', error: true };
      return;
    }
    const studentInfo = await db.get('v_form_student_info', {
      studentid: result.id,
    });
    this.ctx.body = studentInfo;
  }

  /**
   * 提交注册
   * @returns {Promise<void>}
   */
  async register() {
    const { ctx, app } = this;
    const db = app.mysql.get('app');
    ctx.validate({
      studentId: { type: 'string' },
      studentName: { type: 'string' },
      parentType: { type: 'string' },
      name: { type: 'string' },
      avatarUrl: { type: 'string' },
      openId: { type: 'string' },
    });

    const requestParams = ctx.request.body;

    const result = await db.beginTransactionScope(async conn => {
      // don't commit or rollback by yourself
      await conn.insert('user', {
        name: requestParams.name,
        parentType: requestParams.parentType,
        avatarUrl: requestParams.avatarUrl,
        roles: 'parent',
        wxid: requestParams.openId,
        createTime: conn.literals.now,
      });
      const r = await conn.query('SELECT LAST_INSERT_ID() as id');
      await conn.insert('user_to_student', {
        user_id: r[0].id,
        student_id: requestParams.studentId,
        student_name: requestParams.studentName,
        update_time: conn.literals.now
      });
      return { success: true };
    }, ctx);
    ctx.body = result;
  }

  /**
   * 获取用户信息
   * @returns {Promise<void>}
   */
  async getUserInfo() {
    const { ctx, app } = this;
    const db = app.mysql.get('app');

    ctx.validate({
      loginType: { type: 'string' },
      openId: { type: 'string' },
    });
    const requestParams = ctx.request.body;
    let userInfo = null;
    switch (ctx.request.body.loginType) {
      case 'wx':
        userInfo = await db.get('user', { wxid: requestParams.openId });
        if (userInfo) {
          const relation = await db.get('user_to_student', { user_id: userInfo.id });
          userInfo.studentInfo = relation;
        }
        break;
      case 'dd':
        break;
      default:
        ctx.body = { error: true };
        return;
    }

    ctx.body = userInfo;
  }
}

module.exports = HomeController;
