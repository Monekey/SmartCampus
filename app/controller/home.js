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

  async parentLogin() {
    const query = this.ctx.query;
    // 调用 Service 进行业务处理
    const result = await this.ctx.service.weixin.code2Session(query.code, 'parentApp');

    this.ctx.cookies.set('sessionKey', result.sessionKey, { httpOnly: true });

    this.ctx.body = result;
  }

  /*
   * 解密
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
}

module.exports = HomeController;
