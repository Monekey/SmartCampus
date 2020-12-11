'use strict';

const Controller = require('egg').Controller;

/**
 * 请假
 */
class LeaveController extends Controller {

  BusType = 'leave';

  /**
   * 发起请假
   * @returns {Promise<void>}
   */
  async addLeave() {
    this.ctx.validate({
      userId: { type: 'number' },
      studentId: { type: 'string' },
      studentName: { type: 'string' },
      startTime: { type: 'string' },
      endTime: { type: 'string' },
      reason: { type: 'string' },
      type: { type: 'string' },
      time: { type: 'number' },
    });
    const requestParams = this.ctx.request.body;

    const db = this.app.mysql.get('app');
    const ry = this.app.mysql.get('ry');
    let result;

    const flowId = `${this.ctx.helper.FormatDate()}-${this.ctx.helper.S4()}`;
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
          return { success: true };
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
          return { success: true };
        }, this.ctx);
        break;
      default:
        this.ctx.setError('参数错误');
        return;
    }

    console.log('发起请假成功');
    this.ctx.body = result;
  }

  async cancelAsk() {
    this.ctx.validate({
      flowId: { type: 'string' },
    });
    const requestParams = this.ctx.request.body;
    //验证改流程是否可撤回
    //todo 简单处理
    const db = this.app.mysql.get('app');

    const flow = await db.get('audit_flow', { flowId: requestParams.flowId });
    if (flow.approStatus !== 1) {
      this.ctx.setError('该流程状态已变更，无法撤回');
      return;
    }
    flow.approStatus = 4;
    const result = await db.update('audit_flow', flow, { where: { flowId: flow.flowId } });
    // 判断更新成功
    const updateSuccess = result.affectedRows === 1;
    this.ctx.body = {
      success: updateSuccess
    };
  }

  /**
   * 审批下一步
   * 根据表单提交操作来判断审核是否同意
   * 根据FlowId和AuditUserId以及AuditStatus为2(待我审批) 的条件去查询AuditFlowDetail表,如果数据为空,则此单已进行过审核操作,直接返回.
   * 如果上一条查询的数据不为空,则可以将当前审核明细单数据的审核状态设置为通过or驳回
   * 如果当前审核明细单的待审核数量大于一,则说明还需要向下一级传递审核,同时将下一级数据的审核状态设置为待我审核,并发送相关通知
   * 如果当前审核明细单数据全部为审核通过,则将AuditFlow表的审核状态设为通过
   * 如果当前审核明细单有一条审核不通过,则将AuditFlow表的审核状态设为不通过
   * @returns {Promise<void>}
   */
  async leaveApproval() {
    this.ctx.validate({
      flowId: { type: 'string' },
      result: { type: 'number' }, //1同意 2拒绝
      userId: { type: 'number' }
    });
    const requestParams = this.ctx.request.body;
    //验证该流程是否已被审批或被撤回
    const db = this.app.mysql.get('app');
    const flow = await db.get('audit_flow', { flowId: requestParams.flowId });
    if (flow.approStatus !== 1) {
      this.ctx.setError('该流程状态已变更，无法审批');
      return;
    }
    const flowDetail = await db.get('audit_flow_detail', {
      flowId: requestParams.flowId,
      auditStatus: 2
    });
    if (!flowDetail) {
      this.ctx.setError('该流程已被审批');
      return;
    }
    const flowId = flow.flowId;
    let auditStatus;
    let approStatus;
    if (requestParams.result === 1) { //同意
      approStatus = 2;
      auditStatus = 3;
    } else { //驳回
      approStatus = 3;
      auditStatus = 4;
    }
    const result = await db.beginTransactionScope(async conn => {
      await conn.update('audit_flow', {
        ...flow,
        updateTime: conn.literals.now,
        approStatus
      }, { where: { flowId } });

      await conn.update('audit_flow_detail', {
        ...flowDetail,
        auditTime: conn.literals.now,
        auditUserId: requestParams.userId,
        auditStatus
      }, { where: { flowId } });
      return { success: true };
    }, this.ctx);
    this.ctx.body = result;
  }

  async getLeaveListByStudentId() {
    this.ctx.validate({
      studentId: { type: 'string' },
    });
    const requestParams = this.ctx.request.body;

    const db = this.app.mysql.get('app');

    const leaveList = await db.select('v_leave_ask', {
      where: { studentId: requestParams.studentId },
      orders: [ [ 'addTime', 'desc' ] ]
    });

    this.ctx.body = leaveList;
  }

  async getLeaveList() {
    const requestParams = this.ctx.request.body;
    const db = this.app.mysql.get('app');
    const where = {};
    if (requestParams.studentId) {
      where.studentId = requestParams.studentId;
    }
    if (requestParams.approStatus) {
      where.approStatus = requestParams.approStatus;
    }
    if (requestParams.auditUserId) {
      where.auditUserId = requestParams.auditUserId;
    }
    if (requestParams.xiaoyi) {
      where.auditUserId = null;
    }

    const leaveList = await db.select('v_leave_ask', {
      where: where,
      orders: [ [ 'addTime', 'desc' ] ]
    });

    this.ctx.body = leaveList;
  }

}

module.exports = LeaveController;
