'use strict';

const Controller = require('egg').Controller;

const FieldList = [ 'bloodtype', 'nation', 'nativePlace', 'specialty', 'health', 'physiological', 'special', 'siblings', 'ranked', 'accommodation', 'relationship', 'atmosphere', 'education' ];

const FamilyFieldList = [ 'relativesRelationship', 'relativesName', 'relativesAge', 'relativesOccupation', 'relativesEducation', 'relativesPhone', ];

/**
 * 青苗关爱
 */
class QingmiaoController extends Controller {

  /**
   * 保存/更新
   * @returns {Promise<void>}
   */
  async update() {
    this.ctx.validate({
      // studentname: { type: 'string' },
      // gender: { type: 'string' }, // 性别
      // birthday: { type: 'string' }, // 出生日期
      // bloodtype: { type: 'string' }, // 血型
      // nation: { type: 'string' }, // 民族
      // nativePlace: { type: 'string' }, // 籍贯
      // specialty: { type: 'string' }, // 爱好特长
      // health: { type: 'string' }, // 健康状况
      // physiological: { type: 'string' }, // 生理缺陷
      // special: { type: 'string' }, // 曾患特殊疫病
      // siblings: { type: 'string' }, // 同胞数
      // ranked: { type: 'string' }, // 本人排行
      // accommodation: { type: 'string' }, // 住宿情况
      // relationship: { type: 'string' }, // 父母关系
      // atmosphere: { type: 'string' }, //家庭气氛
      // education: { type: 'string' }, // 教育方式
      studentid: { type: 'string' }, // id
      memberList: { type: 'array' }
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    //todo 事务
    const base = await db.get('form_psychology_base', { studentid: requestParams.studentid });
    let result;
    const isUpdate = !!base;
    const newBase = { ...requestParams };
    const memberList = requestParams.memberList;
    delete newBase.memberList;
    if (isUpdate) { //更新
      result = await db.update('form_psychology_base', {
        ...newBase,
        createdate: new Date(),
        status: 1
      }, {
        where: {
          studentid: requestParams.studentid
        }
      });
    } else { // 新增
      result = await db.insert('form_psychology_base', {
        ...newBase,
        createdate: new Date(),
        status: 1
      });
    }
    //家庭成元信息
    const family = await db.select('form_psychology_family', { studentid: requestParams.studentid });
    // await db.delete('form_psychology_family', { studentid: requestParams.studentid });
    const deleteList = family.filter(item => !memberList.find(newItem => newItem.id === item.id));
    const memberHistory = [];
    for (let i = 0; i < deleteList.length; i++) {
      const item = deleteList[i];
      await db.delete('form_psychology_family', { id: item.id });
      memberHistory.push({ type: 2, relation: item.relativesRelationship });
    }
    for (let i = 0; i < memberList.length; i++) {
      const item = memberList[i];
      const row = {
        relativesRelationship: item.relativesRelationship,
        relativesName: item.relativesName,
        relativesAge: item.relativesAge,
        relativesOccupation: item.relativesOccupation,
        relativesEducation: item.relativesEducation,
        relativesPhone: item.relativesPhone,
        studentid: requestParams.studentid,
        createdate: new Date(),
        status: 1
      };
      if (!item.id) { // 新增
        await db.insert('form_psychology_family', row);
        memberHistory.push({ type: 0, relation: item.relativesRelationship });
        continue;
      }
      const old = family.find(oldItem => oldItem.id === item.id);
      if (!old) { //删除
        this.logger.error('青苗关爱工程：学生信息发生错误');
      } else { //修改
        await db.update('form_psychology_family', row, { where: { id: old.id } });
        const changed = FamilyFieldList.find(field => old[field] !== item[field]);
        if (changed) {
          memberHistory.push({ type: 1, relation: item.relativesRelationship });
        }
      }
    }

    if (!result || !result.affectedRows) {
      this.ctx.setError('保存基本信息失败');
      return;
    }
    // 历史记录
    const oldBase = base || {};
    const historyDetail = [];
    FieldList.forEach(field => {
      if (oldBase[field] !== requestParams[field]) {
        historyDetail.push({
          field,
          new_value: requestParams[field],
          old_value: oldBase[field],
          student_id: requestParams.studentid,
        });
      }
    });
    if (historyDetail.length || memberHistory.length) {
      const history = {
        student_id: requestParams.studentid,
        type: isUpdate ? 1 : 0,
        count: historyDetail.length,
        family_count: memberHistory.length,
        family_add: memberHistory.filter(item => item.type === 0).length,
        family_delete: memberHistory.filter(item => item.type === 2).length,
        family_edit: memberHistory.filter(item => item.type === 1).length,
        create_time: new Date()
      };
      await db.beginTransactionScope(async conn => {
        const historyResult = await conn.insert('form_psychology_base_history', history);
        const mainId = historyResult.insertId;
        for (let i = 0; i < historyDetail.length; i++) {
          await conn.insert('form_psychology_base_history_detail', {
            ...historyDetail[i],
            main_id: mainId
          });
        }
        for (let i = 0; i < memberHistory.length; i++) {
          await conn.insert('form_psychology_base_history_detail_family', {
            ...memberHistory[i],
            main_id: mainId
          });
        }
      });
    }
    this.ctx.body = {
      error: false,
      result
    };
  }

  /**
   * 获取学生基本信息
   * @returns {Promise<void>}
   */
  async getBase() {
    this.ctx.validate({
      studentid: { type: 'string' }, // id
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const base = await db.get('form_psychology_base', { studentid: requestParams.studentid });
    const memberList = await db.select('form_psychology_family', { where: { studentid: requestParams.studentid } });
    this.ctx.body = {
      base: base,
      memberList: memberList || [],
      error: false
    };
  }

  /**
   * 更新沟通过程
   * @returns {Promise<void>}
   */
  async updateCommunicate() {
    this.ctx.validate({
      studentid: { type: 'string' }, // id
      createuserid: { type: 'number' },
      fileList: { type: 'array' }, // 文件列表
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const obj = {
      studentid: requestParams.studentid,
      communobject: requestParams.communobject,
      communprocess: requestParams.communprocess,
      communeffect: requestParams.communeffect,
      createdate: requestParams.createdate,
      createuserid: requestParams.createuserid,
      createusername: requestParams.createusername,
      changedate: new Date(),
      status: 1,
    };
    let id = requestParams.id;
    if (requestParams.id) { //更新
      await db.update('form_psychology_communicate', obj, {
        where: {
          id: requestParams.id
        }
      });
    } else {
      const result = await db.insert('form_psychology_communicate', obj);
      id = result.insertId;
    }
    //更新文件列表
    await db.beginTransactionScope(async conn => {
      await conn.delete('form_psychology_communicate_file', { parentid: id });
      for (let i = 0; i < requestParams.fileList.length; i++) {
        await conn.insert('form_psychology_communicate_file', {
          url: requestParams.fileList[i],
          parentid: id,
          studentid: requestParams.studentid,
          createtime: new Date()
        });
      }
    });
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 获取沟通过程/结果
   * @returns {Promise<void>}
   */
  async getCommunicate() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const communicate = await db.get('form_psychology_communicate', { id: requestParams.id });
    const fileList = await db.select('form_psychology_communicate_file', { where: { parentid: communicate.id } });
    this.ctx.body = {
      communicate,
      fileList
    };
  }


  /**
   * 更新学习情况
   * @returns {Promise<void>}
   */
  async updateStudy() {
    this.ctx.validate({
      studentid: { type: 'string' }, // id
      createuserid: { type: 'number' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const obj = {
      studentid: requestParams.studentid,
      achievement: requestParams.achievement,
      habit: requestParams.habit,
      ideological: requestParams.ideological,
      interpersonal: requestParams.interpersonal,
      createdate: requestParams.createdate,
      createuserid: requestParams.createuserid,
      createusername: requestParams.createusername,
      changedate: new Date(),
      status: 1,
    };
    let id = requestParams.id;
    if (requestParams.id) { //更新
      await db.update('form_psychology_study', obj, {
        where: {
          id: requestParams.id
        }
      });
    } else {
      const result = await db.insert('form_psychology_study', obj);
      id = result.insertId;
    }
    this.ctx.body = {
      error: false,
      id
    };
  }


  /**
   * 获取沟通过程/结果
   * @returns {Promise<void>}
   */
  async getStudy() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.get('form_psychology_study', { id: requestParams.id });
  }

  /**
   * 更新重大事件
   * @returns {Promise<void>}
   */
  async updateEvent() {
    this.ctx.validate({
      studentid: { type: 'string' }, // id
      createuserid: { type: 'number' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const obj = {
      studentid: requestParams.studentid,
      members: requestParams.members,
      memberschange: requestParams.memberschange,
      living: requestParams.living,
      educational: requestParams.educational,
      other: requestParams.other,
      createdate: requestParams.createdate,
      createuserid: requestParams.createuserid,
      createusername: requestParams.createusername,
      changedate: new Date(),
      status: 1,
    };
    let id = requestParams.id;
    if (requestParams.id) { //更新
      await db.update('form_psychology_event', obj, {
        where: {
          id: requestParams.id
        }
      });
    } else {
      const result = await db.insert('form_psychology_event', obj);
      id = result.insertId;
    }
    this.ctx.body = {
      error: false,
      id
    };
  }

  /**
   * 获取沟通过程/结果
   * @returns {Promise<void>}
   */
  async getEvent() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.get('form_psychology_event', { id: requestParams.id });
  }

  /**
   * 更新重大事件
   * @returns {Promise<void>}
   */
  async updateProblem() {
    this.ctx.validate({
      studentid: { type: 'string' }, // id
      createuserid: { type: 'number' },
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const obj = {
      studentid: requestParams.studentid,
      bullying: requestParams.bullying,
      behavior: requestParams.behavior,
      disorder: requestParams.disorder,
      intercourse: requestParams.intercourse,
      affectorder: requestParams.affectorder,
      analysis: requestParams.analysis,
      createdate: requestParams.createdate,
      createuserid: requestParams.createuserid,
      createusername: requestParams.createusername,
      changedate: new Date(),
      status: 1,
    };
    let id = requestParams.id;
    if (requestParams.id) { //更新
      await db.update('form_psychology_problem', obj, {
        where: {
          id: requestParams.id
        }
      });
    } else {
      const result = await db.insert('form_psychology_problem', obj);
      id = result.insertId;
    }
    this.ctx.body = {
      error: false,
      id
    };
  }

  /**
   * 获取问题
   * @returns {Promise<void>}
   */
  async getProblem() {
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    this.ctx.body = await db.get('form_psychology_problem', { id: requestParams.id });
  }

  /**
   * 时间轴
   * @returns {Promise<void>}
   */
  async getHistory() {
    this.ctx.validate({
      studentid: { type: 'string' }, // id
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    const params = {
      where: {
        studentid: requestParams.studentid
      }
    };
    //沟通
    const communicate = await db.select('form_psychology_communicate', params);
    //学习
    const study = await db.select('form_psychology_study', params);
    //事件
    const event = await db.select('form_psychology_event', params);
    //问题
    const problem = await db.select('form_psychology_problem', params);
    //基础信息
    const base = await db.select('form_psychology_base_history', {
      where: {
        student_id: requestParams.studentid
      }
    });

    this.ctx.body = {
      error: false,
      communicate,
      study,
      event,
      problem,
      base
    };
  }

  /**
   * 删除沟通记录
   * @returns {Promise<void>}
   */
  async deleteCommunicate() {
    this.ctx.validate({
      id: { type: 'number' }, // id
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    await db.beginTransactionScope(async conn => {
      await conn.delete('form_psychology_communicate', { id: requestParams.id });
      await conn.delete('form_psychology_communicate_file', { parentid: requestParams.id });
    });
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 删除事件
   * @returns {Promise<void>}
   */
  async deleteEvent() {
    this.ctx.validate({
      id: { type: 'number' }, // id
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    await db.delete('form_psychology_event', { id: requestParams.id });
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 删除学习
   * @returns {Promise<void>}
   */
  async deleteStudy() {
    this.ctx.validate({
      id: { type: 'number' }, // id
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    await db.delete('form_psychology_study', { id: requestParams.id });
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 删除问题
   * @returns {Promise<void>}
   */
  async deleteProblem() {
    this.ctx.validate({
      id: { type: 'number' }, // id
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    await db.delete('form_psychology_problem', { id: requestParams.id });
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 设置/取消重点关注学生
   * @returns {Promise<void>}
   */
  async setKeyStudent() {
    this.ctx.validate({
      id: { type: 'string' }, // id
      value: { type: 'number' }, //0 取消 1 关注
    });
    const db = this.app.mysql.get('ry');
    const requestParams = this.ctx.request.body;
    await db.delete('form_psychology_key_student', { student_id: requestParams.id });
    if (requestParams.value === 1) {
      await db.insert('form_psychology_key_student', { student_id: requestParams.id, createtime: new Date() });
    }
    this.ctx.body = {
      error: false
    };
  }

  /**
   * 获取重点学生列表
   * @returns {Promise<void>}
   */
  async getKeyStudentList() {
    const db = this.app.mysql.get('ry');
    this.ctx.body = await db.query(keyStudentSql());
  }

  async getKey() {
    const db = this.app.mysql.get('ry');
    const keys = await db.select('form_psychology_key_student');
    this.ctx.body = keys ? keys.map(item => item.student_id) : [];
  }

}

function keyStudentSql() {
  return `SELECT b.*, c.class_id, d.dept_name as clazz, ( SELECT dept_name FROM sys_dept WHERE dept_id = d.parent_id ) grade FROM form_psychology_key_student a 
LEFT JOIN base_student_info b ON a.student_id = b.id
LEFT JOIN base_stutocla_info c ON c.student_id = a.student_id
LEFT JOIN sys_dept d ON d.dept_id = c.class_id`;
}

module.exports = QingmiaoController;
