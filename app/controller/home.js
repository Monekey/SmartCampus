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

}

module.exports = HomeController;
