'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx, app } = this;
    const db = app.mysql.get('ry');
    console.log(db);
    const result = await db.select('base_student_info', {})
    ctx.body = result;
  }
}

module.exports = HomeController;
