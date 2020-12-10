'use strict';

const Controller = require('egg').Controller;

/**
 * 请假
 */
class LeaveController extends Controller {

  /**
   * 发起请假
   * @returns {Promise<void>}
   */
  async addLeave(){
    this.ctx.validate({
      userId: {type: 'number'},
      studentId: {type: 'string'},
      startTime: {type: 'string'},
      endTime: {type: 'string'},
      type: {type: 'string'},
      time: {type: 'string'},
    });
    const requestParams = this.ctx.request.body;



  }
}

module.exports = LeaveController;
