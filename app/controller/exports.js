'use strict';

const Controller = require('egg').Controller;
const fs = require('fs')
const xlsx = require('xlsx')
const path = require('path')

class ExportsController extends Controller {

  async index() {
    const db = this.app.mysql.get('ry');

    const results = await db.query(clazz())

    const classList = results.filter(clazz => clazz.ancestors.split(',').length >= 3).map(clazz => ({
      id: clazz.dept_id,
      grade: clazz.dept_name,
      className: clazz.parent_name
    }));

    // const classList = await db.query(`SELECT * FROM v_form_student_info a WHERE a.classname LIKE '%${'八年级'}%' GROUP BY classname`)
    console.log(classList)
    this.ctx.body = {ok: true}
    const list = classList.filter(clazz => {
      return clazz.className === '2013级（八年级）' && clazz.grade === '一班'
    })
    // const className = "2013级（八年级）一班";
    // const list = ["2013级（八年级）二班", "2013级（八年级）三班", "2013级（八年级）四班", "2013级（八年级）五班", "2013级（八年级）六班",
    //   "2014级（七年级）一班", "2014级（七年级）二班", "2014级（七年级）三班", "2014级（七年级）四班", "2014级（七年级）五班", "2014级（七年级）六班"];
    // const list = ["2013级（八年级）六班"];
    for (let i = 0; i < classList.length; i++) {
      // await this.exportByClassName(list[i]);
      await this.exportByClassId(classList[i].className + classList[i].grade, classList[i].id);
    }
  }

  async exportByClassName(className) {

    // const className = "2013级（八年级）一班";
    console.log('当前班级:', className);
    const startDate = '2020-09-20';
    const db = this.app.mysql.get('ry');
    const studentList = await db.query(`SELECT * FROM v_form_student_info a WHERE a.classname LIKE '%${className}%' GROUP BY studentname`)
    console.log(studentList);
    const classroomTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_classroom a WHERE	a.classname = '${className}'`)
    const homeworkTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_homework a WHERE	a.classname = '${className}'`)
    const eveningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_evening a WHERE	a.classname = '${className}'`)
    const morningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_morning a WHERE	a.classname = '${className}'`)
    // const habitTeacherIds = await db.query(`SELECT DISTINCT	a.teacher_id FROM	form_habit_info a WHERE	a.classname = '${className}'`)

    let teacherIds = [...classroomTeacherIds.map(item => item.createUserId), ...homeworkTeacherIds.map(item => item.createUserId), ...eveningTeacherIds.map(item => item.createUserId), ...morningTeacherIds.map(item => item.createUserId)]
    teacherIds = Array.from(new Set(teacherIds));
    const Sheets = {'综合': []};

    const teacherList = [];
    for (let i = 0; i < teacherIds.length; i++) {
      let teacher = await db.query(`SELECT user_id as teacherId, user_name as teacherName from sys_user WHERE user_id = '${teacherIds[i]}'`);

      teacherList.push(teacher[0]);
      Sheets[teacher[0].teacherName] = [];
    }
    console.log(teacherList);
    //studentList.length
    let all = [];
    for (let i = 0; i < studentList.length; i++) {
      // for (let i = 0; i < 2; i++) {
      console.log('当前进度:', `${i + 1}/${studentList.length}`);
      let student = studentList[i];
      //综合
      const classroom = await db.query(makeSQL('form_rate_classroom', student.studentid));
      const homework = await db.query(makeSQL('form_rate_homework', student.studentid));
      const evening = await db.query(makeSQL('form_rate_evening', student.studentid));
      const morning = await db.query(makeSQL('form_rate_morning', student.studentid));
      const habit = await db.query(makeSQL('form_habit_info', student.studentid));
      classroom[0].score = calcScore(classroom[0]);
      homework[0].score = calcScore(homework[0]);
      evening[0].score = calcScore(evening[0]);
      morning[0].score = calcScore(morning[0]);
      habit[0].score = calcScore(habit[0]);

      const score = (classroom[0].score + homework[0].score + evening[0].score + morning[0].score + habit[0].score) / 5;

      all.push({
        学生姓名: student.studentname,
        班级: student.classname,
        'A(课堂)': classroom[0].A,
        'B(课堂)': classroom[0].B,
        'C(课堂)': classroom[0].C,
        '分数(课堂)': classroom[0].score,

        'A(作业)': homework[0].A,
        'B(作业)': homework[0].B,
        'C(作业)': homework[0].C,
        '分数(作业)': homework[0].score,

        'A(晚自习)': evening[0].A,
        'B(晚自习)': evening[0].B,
        'C(晚自习)': evening[0].C,
        '分数(晚自习)': evening[0].score,

        'A(早自习': morning[0].A,
        'B(早自习)': morning[0].B,
        'C(早自习)': morning[0].C,
        '分数(早自习)': morning[0].score,

        'A(行为)': habit[0].A,
        'B(行为)': habit[0].B,
        'C(行为)': habit[0].C,
        '分数(行为)': habit[0].score,

        综合得分: score
      });

      for (let j = 0; j < teacherList.length; j++) {
        // for (let j = 0; j < 3; j++) {
        const currTeacher = teacherList[j];
        const classroom1 = await db.query(makeSQL('form_rate_classroom', student.studentid, currTeacher.teacherId));
        const homework1 = await db.query(makeSQL('form_rate_homework', student.studentid, currTeacher.teacherId));
        const evening1 = await db.query(makeSQL('form_rate_evening', student.studentid, currTeacher.teacherId));
        const morning1 = await db.query(makeSQL('form_rate_morning', student.studentid, currTeacher.teacherId));
        const habit1 = await db.query(makeSQL('form_habit_info', student.studentid, currTeacher.teacherId));
        classroom1[0].score = calcScore(classroom1[0]);
        homework1[0].score = calcScore(homework1[0]);
        evening1[0].score = calcScore(evening1[0]);
        morning1[0].score = calcScore(morning1[0]);
        habit1[0].score = calcScore(habit1[0]);
        const score1 = (classroom1[0].score + homework1[0].score + evening1[0].score + morning1[0].score + habit1[0].score) / 5;
        Sheets[currTeacher.teacherName].push({
          学生姓名: student.studentname,
          班级: student.classname,
          'A(课堂)': classroom1[0].A,
          'B(课堂)': classroom1[0].B,
          'C(课堂)': classroom1[0].C,
          '分数(课堂)': classroom1[0].score,

          'A(作业)': homework1[0].A,
          'B(作业)': homework1[0].B,
          'C(作业)': homework1[0].C,
          '分数(作业)': homework1[0].score,

          'A(晚自习)': evening1[0].A,
          'B(晚自习)': evening1[0].B,
          'C(晚自习)': evening1[0].C,
          '分数(晚自习)': evening1[0].score,

          'A(早自习': morning1[0].A,
          'B(早自习)': morning1[0].B,
          'C(早自习)': morning1[0].C,
          '分数(早自习)': morning1[0].score,

          'A(行为)': habit1[0].A,
          'B(行为)': habit1[0].B,
          'C(行为)': habit1[0].C,
          '分数(行为)': habit1[0].score,

          综合得分: score1
        });
      }
    }
    // console.log(all);
    // all.sort((a, b) => b.score - a.score);
    console.log('sql查询完毕，正在生成Excel')
    const data = [{'测试1': 'hello', age: 1}, {name: 'world', age: 2}]
    const jsonWorkSheet = xlsx.utils.json_to_sheet(data);
    Object.keys(Sheets).forEach(key => {
      Sheets[key].sort((a, b) => b.综合得分 - a.综合得分);
      Sheets[key] = xlsx.utils.json_to_sheet(Sheets[key]);
    })
    Sheets['综合'] = xlsx.utils.json_to_sheet(all);
    const workBook = {
      SheetNames: Object.keys(Sheets),
      Sheets: Sheets
    };
    const filename = `${className}.xlsx`;
    const filePath = path.resolve(this.app.config.baseDir, filename);
    await xlsx.writeFile(workBook, filePath);
    console.log('Excel已生成')
    // this.ctx.attachment(filename);
    // this.ctx.body = fs.createReadStream(filePath);
    // fs.unlink(filePath, err => {
    //   if (err) throw err;
    //   console.log('excel文件已被删除');
    // });
  }

  async exportByClassId(className, classId) {

    // const className = "2013级（八年级）一班";
    console.log('当前班级:', className);
    const startDate = '2020-09-20';
    const db = this.app.mysql.get('ry');
    // const studentList = await db.query(`SELECT student_id as studentid, studentname FROM form_classroom_rate WHERE class_id = '${classId}' GROUP BY studentname`)
    // console.log(studentList);
    const studentList = await db.query(`SELECT * FROM v_form_student_info a WHERE a.classname LIKE '%${className}%' GROUP BY studentname`)

    const classroomTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_classroom a WHERE	a.class_id = '${classId}'`)
    const homeworkTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_homework a WHERE	a.class_id = '${classId}'`)
    const eveningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_evening a WHERE	a.class_id = '${classId}'`)
    const morningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_morning a WHERE	a.class_id = '${classId}'`)
    // const habitTeacherIds = await db.query(`SELECT DISTINCT	a.teacher_id FROM	form_habit_info a WHERE	a.classname = '${className}'`)

    let teacherIds = [...classroomTeacherIds.map(item => item.createUserId), ...homeworkTeacherIds.map(item => item.createUserId), ...eveningTeacherIds.map(item => item.createUserId), ...morningTeacherIds.map(item => item.createUserId)]
    teacherIds = Array.from(new Set(teacherIds));
    const Sheets = {'综合': []};

    const teacherList = [];
    for (let i = 0; i < teacherIds.length; i++) {
      let teacher = await db.query(`SELECT user_id as teacherId, user_name as teacherName from sys_user WHERE user_id = '${teacherIds[i]}'`);

      teacherList.push(teacher[0]);
      Sheets[teacher[0].teacherName] = [];
    }
    console.log(teacherList);
    //studentList.length
    let all = [];
    for (let i = 0; i < studentList.length; i++) {
      // for (let i = 0; i < 2; i++) {
      console.log('当前进度:', `${i + 1}/${studentList.length}`);
      let student = studentList[i];
      //综合
      const classroom = await db.query(makeSQL('form_rate_classroom', student.studentid));
      const homework = await db.query(makeSQL('form_rate_homework', student.studentid));
      const evening = await db.query(makeSQL('form_rate_evening', student.studentid));
      const morning = await db.query(makeSQL('form_rate_morning', student.studentid));
      const habit = await db.query(makeSQL('form_habit_info', student.studentid));
      classroom[0].score = calcScore(classroom[0]);
      homework[0].score = calcScore(homework[0]);
      evening[0].score = calcScore(evening[0]);
      morning[0].score = calcScore(morning[0]);
      habit[0].score = calcScore(habit[0]);

      const score = (classroom[0].score + homework[0].score + evening[0].score + morning[0].score + habit[0].score) / 5;

      all.push({
        学生姓名: student.studentname,
        班级: className,
        'A(课堂)': classroom[0].A,
        'B(课堂)': classroom[0].B,
        'C(课堂)': classroom[0].C,
        '分数(课堂)': classroom[0].score,

        'A(作业)': homework[0].A,
        'B(作业)': homework[0].B,
        'C(作业)': homework[0].C,
        '分数(作业)': homework[0].score,

        'A(晚自习)': evening[0].A,
        'B(晚自习)': evening[0].B,
        'C(晚自习)': evening[0].C,
        '分数(晚自习)': evening[0].score,

        'A(早自习': morning[0].A,
        'B(早自习)': morning[0].B,
        'C(早自习)': morning[0].C,
        '分数(早自习)': morning[0].score,

        'A(行为)': habit[0].A,
        'B(行为)': habit[0].B,
        'C(行为)': habit[0].C,
        '分数(行为)': habit[0].score,

        综合得分: score
      });

      for (let j = 0; j < teacherList.length; j++) {
        // for (let j = 0; j < 3; j++) {
        const currTeacher = teacherList[j];
        const classroom1 = await db.query(makeSQL('form_rate_classroom', student.studentid, currTeacher.teacherId));
        const homework1 = await db.query(makeSQL('form_rate_homework', student.studentid, currTeacher.teacherId));
        const evening1 = await db.query(makeSQL('form_rate_evening', student.studentid, currTeacher.teacherId));
        const morning1 = await db.query(makeSQL('form_rate_morning', student.studentid, currTeacher.teacherId));
        const habit1 = await db.query(makeSQL('form_habit_info', student.studentid, currTeacher.teacherId));
        classroom1[0].score = calcScore(classroom1[0]);
        homework1[0].score = calcScore(homework1[0]);
        evening1[0].score = calcScore(evening1[0]);
        morning1[0].score = calcScore(morning1[0]);
        habit1[0].score = calcScore(habit1[0]);
        const score1 = (classroom1[0].score + homework1[0].score + evening1[0].score + morning1[0].score + habit1[0].score) / 5;
        Sheets[currTeacher.teacherName].push({
          学生姓名: student.studentname,
          班级: className,
          'A(课堂)': classroom1[0].A,
          'B(课堂)': classroom1[0].B,
          'C(课堂)': classroom1[0].C,
          '分数(课堂)': classroom1[0].score,

          'A(作业)': homework1[0].A,
          'B(作业)': homework1[0].B,
          'C(作业)': homework1[0].C,
          '分数(作业)': homework1[0].score,

          'A(晚自习)': evening1[0].A,
          'B(晚自习)': evening1[0].B,
          'C(晚自习)': evening1[0].C,
          '分数(晚自习)': evening1[0].score,

          'A(早自习': morning1[0].A,
          'B(早自习)': morning1[0].B,
          'C(早自习)': morning1[0].C,
          '分数(早自习)': morning1[0].score,

          'A(行为)': habit1[0].A,
          'B(行为)': habit1[0].B,
          'C(行为)': habit1[0].C,
          '分数(行为)': habit1[0].score,

          综合得分: score1
        });
      }
    }
    // console.log(all);
    all.sort((a, b) => b.综合得分 - a.综合得分);
    console.log('sql查询完毕，正在生成Excel')
    const data = [{'测试1': 'hello', age: 1}, {name: 'world', age: 2}]
    const jsonWorkSheet = xlsx.utils.json_to_sheet(data);
    Object.keys(Sheets).forEach(key => {
      Sheets[key].sort((a, b) => b.综合得分 - a.综合得分);
      Sheets[key] = xlsx.utils.json_to_sheet(Sheets[key]);
    })
    Sheets['综合'] = xlsx.utils.json_to_sheet(all);
    const workBook = {
      SheetNames: Object.keys(Sheets),
      Sheets: Sheets
    };
    const filename = `${className}.xlsx`;
    const filePath = path.resolve(this.app.config.baseDir, filename);
    await xlsx.writeFile(workBook, filePath);
    console.log('Excel已生成')
    // this.ctx.attachment(filename);
    // this.ctx.body = fs.createReadStream(filePath);
    // fs.unlink(filePath, err => {
    //   if (err) throw err;
    //   console.log('excel文件已被删除');
    // });
  }

}

function makeSQL(tableName, studentid, teacherId) {
  const beginDate = '2020-09-20'
  if (tableName === 'form_habit_info') {
    let sql = `SELECT
count( CASE WHEN a.rateresult = 'excellent' THEN 1 ELSE NULL END ) AS 'A',
count( CASE WHEN a.rateresult = 'good' THEN 1 ELSE NULL END ) AS 'B',
count( CASE WHEN a.rateresult = 'bad' THEN 1 ELSE NULL END ) AS 'C'
FROM
${tableName} a 
WHERE
a.student_id = '${studentid}' AND ratedate >= '${beginDate}'`;
    if (teacherId) {
      sql += ` AND teacher_id = '${teacherId}'`
    }
    return sql;
  }
  let sql = `SELECT
count( CASE WHEN a.rateresult = 'A' THEN 1 ELSE NULL END ) AS 'A',
count( CASE WHEN a.rateresult = 'B' THEN 1 ELSE NULL END ) AS 'B',
count( CASE WHEN a.rateresult = 'C' THEN 1 ELSE NULL END ) AS 'C'
FROM
${tableName} a 
WHERE
a.student_id = '${studentid}' AND createdate >= '${beginDate}'`;
  if (teacherId) {
    sql += ` AND createUserId = '${teacherId}'`
  }
  return sql;
}

function calcScore(item) {
  return item.A * 5 + item.B * 0 + item.C * (-5) + 1000;
}

const clazz = () => {
  return `SELECT
    d.dept_id,
    d.parent_id,
    d.ancestors,
    d.dept_name,
    d.order_num,
    d.leader,
    d.phone,
    d.email,
    d.STATUS,
    d.del_flag,
    d.create_by,
    d.create_time,
    ( SELECT dept_name FROM sys_dept WHERE dept_id = d.parent_id ) parent_name
FROM
    sys_dept d`
}

module.exports = ExportsController;
