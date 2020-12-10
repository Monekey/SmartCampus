'use strict';

const Controller = require('egg').Controller;

/**
 * 用户相关
 */
class UserController extends Controller {
  /**
   * 获取用户信息
   * @returns {Promise<void>}
   */
  async getUserInfo() {
    this.ctx.validate({
      loginType: { type: 'string' },
      openId: { type: 'string' },
    });
    const requestParams = this.ctx.request.body;
    const userInfo = await this.ctx.service.user.find(requestParams.loginType, requestParams.openId);
    if (userInfo && userInfo.ry_id) {
      const roles = await this.ctx.service.teacher.getRYUserRoles(userInfo.ry_id);
      userInfo.roles = roles ? roles.join(',') : '';
    }
    this.ctx.body = userInfo;
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
   * 教师登录
   * @returns {Promise<void>}
   */
  async teacherLogin() {
    const query = this.ctx.query;
    // 调用 Service 进行业务处理
    const result = await this.ctx.service.weixin.code2Session(query.code, 'teacherApp');

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
    this.ctx.validate({
      studentName: { type: 'string' },
      idCard: { type: 'string' },
    });

    const result = await this.ctx.service.student.query(this.ctx.request.body);
    if (!result || !result.id) {
      this.ctx.body = { msg: '未找到绑定的学生信息', error: true };
      return;
    }
    const studentInfo = await this.ctx.service.student.getInfoById(result.id);
    this.ctx.body = studentInfo;
  }

  /**
   * 验证教师
   * @returns {Promise<void>}
   */
  async validateTeacher() {
    this.ctx.validate({
      teacherName: { type: 'string' },
      mobile: { type: 'string' },
    });

    const result = await this.ctx.service.teacher.query(this.ctx.request.body);
    if (!result || !result.user_id) {
      this.ctx.body = { msg: '未找到该人员信息', error: true };
      return;
    }
    this.ctx.body = result;
  }

  /**
   * 提交注册
   * @returns {Promise<void>}
   */
  async register() {
    const { ctx, app } = this;
    ctx.validate({
      studentId: { type: 'string' },
      studentName: { type: 'string' },
      parentType: { type: 'string' },
      name: { type: 'string' },
      avatarUrl: { type: 'string' },
      openId: { type: 'string' },
    });
    const requestParams = ctx.request.body;

    const db = app.mysql.get('app');

    //todo service封装
    const result = await db.beginTransactionScope(async conn => {
      // don't commit or rollback by yourself
      await conn.insert('user', {
        name: requestParams.name,
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
        relation: requestParams.parentType,
        update_time: conn.literals.now
      });
      return { success: true };
    }, ctx);
    ctx.body = result;
  }

  /**
   * 提交注册教师端
   * @returns {Promise<void>}
   */
  async registerTeacher() {
    const { ctx, app } = this;
    ctx.validate({
      teacherId: { type: 'number' },
      name: { type: 'string' },
      avatarUrl: { type: 'string' },
      openId: { type: 'string' },
    });
    const requestParams = ctx.request.body;

    const db = app.mysql.get('app');

    //todo service封装
    const result = await db.beginTransactionScope(async conn => {
      await conn.insert('user', {
        name: requestParams.name,
        ry_id: requestParams.teacherId,
        avatarUrl: requestParams.avatarUrl,
        roles: 'teacher',
        wxid: requestParams.openId,
        createTime: conn.literals.now,
      });
      return { success: true };
    }, ctx);
    ctx.body = result;
  }
}

module.exports = UserController;
