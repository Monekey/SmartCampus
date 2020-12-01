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
    const result = await this.ctx.service.weixin.code2Session(query.code, 'parentApp')

    this.ctx.body = result;
  }
}

module.exports = HomeController;
