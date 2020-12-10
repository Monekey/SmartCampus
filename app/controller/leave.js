'use strict';

const Controller = require('egg').Controller;

/**
 * 请假
 */
class LeaveController extends Controller {

  BusType = 'leave'

  /**
   * 发起请假
   * @returns {Promise<void>}
   */
  async addLeave() {
    this.ctx.validate({
      userId: {type: 'number'},
      studentId: {type: 'string'},
      studentName: {type: 'string'},
      startTime: {type: 'string'},
      endTime: {type: 'string'},
      reason: {type: 'string'},
      type: {type: 'string'},
      time: {type: 'number'},
    });
    const requestParams = this.ctx.request.body;

    const db = this.app.mysql.get('app');
    const ry = this.app.mysql.get('ry');
    let result;

    const flowId = `${this.ctx.helper.FormatDate()}-${this.ctx.helper.S4()}`
    switch (requestParams.type) {
      case '事假':
        const classId = await this.ctx.service.student.getClassIdByStuId(requestParams.studentId);
        if (!classId) {
          this.ctx.setError('该学生没有关联的班级');
          return;
        }
        const leader = await this.ctx.service.student.getLeaderByClassId(classId);
        if (!leader) {
          this.ctx.setError('该学生没有的班级没有设置班主任!');
          return;
        }
        const leaderId = leader.user_id;
        //todo service封装
        result = await db.beginTransactionScope(async conn => {
          await conn.insert('audit_flow', {
            flowId,
            title: `${requestParams.studentName}的事假申请`,
            busType: this.BusType,
            addUserId: requestParams.userId,
            addTime: conn.literals.now,
            approStatus: 1
          });
          await conn.insert('audit_flow_detail', {
            flowId,
            auditUserId: leaderId,
            auditRemark: null,
            auditTime: null,
            auditStatus: 2
          });
          await conn.insert('leave_ask', {
            flowId,
            addUserId: requestParams.userId,
            studentId: requestParams.studentId,
            addTime: conn.literals.now,
            leaveType: 1,
            remark: requestParams.reason,
            leaveTimeFrom: new Date(requestParams.startTime),
            leaveTimeTo: new Date(requestParams.endTime),
            overTimeDays: requestParams.time
          });
          return {success: true};
        }, this.ctx);
        //发送通知
        break;
      case '病假':
        //todo service封装
        result = await db.beginTransactionScope(async conn => {
          await conn.insert('audit_flow', {
            flowId,
            title: `${requestParams.studentName}的病假申请`,
            busType: this.BusType,
            addUserId: requestParams.userId,
            addTime: conn.literals.now,
            approStatus: 1
          });
          await conn.insert('audit_flow_detail', {
            flowId,
            auditUserId: null,
            auditRemark: null,
            auditTime: null,
            auditStatus: 2
          });
          await conn.insert('leave_ask', {
            flowId,
            addUserId: requestParams.userId,
            studentId: requestParams.studentId,
            addTime: conn.literals.now,
            leaveType: 2,
            remark: requestParams.reason,
            leaveTimeFrom: new Date(requestParams.startTime),
            leaveTimeTo: new Date(requestParams.endTime),
            overTimeDays: requestParams.time
          });
          return {success: true};
        }, this.ctx);
        break;
      default:
        this.ctx.setError('参数错误')
        return;
    }

    console.log('发起请假成功')
    this.ctx.body = result;
  }

  async getLeaveListByStudentId() {
    this.ctx.validate({
      studentId: {type: 'string'},
    });
    const requestParams = this.ctx.request.body;

    const db = this.app.mysql.get('app');

    const leaveList = await db.query(`SELECT ask.*, flow.approStatus, userInfo.${'`'}name${'`'} parentName, userInfo.avatarUrl, userToStu.relation, userToStu.student_name studentName FROM leave_ask ask
INNER JOIN audit_flow flow
ON ask.flowId = flow.flowId AND ask.studentId =  '${requestParams.studentId}'
LEFT JOIN \`user\` userInfo
ON userInfo.id = ask.addUserId
LEFT JOIN user_to_student userToStu
ON userInfo.id = userToStu.user_id AND userToStu.student_id = ask.studentId
ORDER BY ask.addTime desc`)

    this.ctx.body = leaveList;
  }

}

module.exports = LeaveController;
