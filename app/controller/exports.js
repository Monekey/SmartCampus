'use strict';

const Controller = require('egg').Controller;
const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const gradeMap = {
  1: '2020级(一年级)',
  2: '2019级（二年级）',
  3: '2018级（三年级）',
  4: '2017级（四年级）',
  5: '2016级（五年级）',
  6: '2015级（六年级）',
  7: '2014级（七年级）',
  8: '2013级（八年级）',
  9: '2012级（九年级）',
};

const classMap = {
  1: '一班',
  2: '二班',
  3: '三班',
  4: '四班',
  5: '五班',
  6: '六班',
  7: '七班',
  8: '八班',
};

const confirmLessonMap = {
  语文: 'language',
  数学: 'mathematics',
  英语: 'english',
  道法: 'taomethod',
  历史: 'history',
  物理: 'physics',
  生物: 'biology',
  地理: 'geography',
};

class ExportsController extends Controller {

  async index() {
    const db = this.app.mysql.get('ry');

    const results = await db.query(clazz());

    const classList = results.filter(clazz => clazz.ancestors.split(',').length >= 3)
      .map(clazz => ({
        id: clazz.dept_id,
        grade: clazz.dept_name,
        className: clazz.parent_name
      }));

    // const classList = await db.query(`SELECT * FROM v_form_student_info a WHERE a.classname LIKE '%${'八年级'}%' GROUP BY classname`)
    console.log(classList);
    this.ctx.body = { ok: true };
    const list = classList.filter(clazz => {
      return clazz.className === '2013级（八年级）' && clazz.grade === '一班';
    });
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
    const studentList = await db.query(`SELECT * FROM v_form_student_info a WHERE a.classname LIKE '%${className}%' GROUP BY studentname`);
    console.log(studentList);
    const classroomTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_classroom a WHERE	a.classname = '${className}'`);
    const homeworkTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_homework a WHERE	a.classname = '${className}'`);
    const eveningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_evening a WHERE	a.classname = '${className}'`);
    const morningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_morning a WHERE	a.classname = '${className}'`);
    // const habitTeacherIds = await db.query(`SELECT DISTINCT	a.teacher_id FROM	form_habit_info a WHERE	a.classname = '${className}'`)

    let teacherIds = [ ...classroomTeacherIds.map(item => item.createUserId), ...homeworkTeacherIds.map(item => item.createUserId), ...eveningTeacherIds.map(item => item.createUserId), ...morningTeacherIds.map(item => item.createUserId) ];
    teacherIds = Array.from(new Set(teacherIds));
    const Sheets = { '综合': [] };

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
    console.log('sql查询完毕，正在生成Excel');
    const data = [ { '测试1': 'hello', age: 1 }, { name: 'world', age: 2 } ];
    const jsonWorkSheet = xlsx.utils.json_to_sheet(data);
    Object.keys(Sheets)
      .forEach(key => {
        Sheets[key].sort((a, b) => b.综合得分 - a.综合得分);
        Sheets[key] = xlsx.utils.json_to_sheet(Sheets[key]);
      });
    Sheets['综合'] = xlsx.utils.json_to_sheet(all);
    const workBook = {
      SheetNames: Object.keys(Sheets),
      Sheets: Sheets
    };
    const filename = `${className}.xlsx`;
    const filePath = path.resolve(this.app.config.baseDir, filename);
    await xlsx.writeFile(workBook, filePath);
    console.log('Excel已生成');
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
    const studentList = await db.query(`SELECT * FROM v_form_student_info a WHERE a.classname LIKE '%${className}%' GROUP BY studentname`);

    const classroomTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_classroom a WHERE	a.class_id = '${classId}'`);
    const homeworkTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_homework a WHERE	a.class_id = '${classId}'`);
    const eveningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_evening a WHERE	a.class_id = '${classId}'`);
    const morningTeacherIds = await db.query(`SELECT DISTINCT	a.createUserId FROM	form_rate_morning a WHERE	a.class_id = '${classId}'`);
    // const habitTeacherIds = await db.query(`SELECT DISTINCT	a.teacher_id FROM	form_habit_info a WHERE	a.classname = '${className}'`)

    let teacherIds = [ ...classroomTeacherIds.map(item => item.createUserId), ...homeworkTeacherIds.map(item => item.createUserId), ...eveningTeacherIds.map(item => item.createUserId), ...morningTeacherIds.map(item => item.createUserId) ];
    teacherIds = Array.from(new Set(teacherIds));
    const Sheets = { '综合': [] };

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
    console.log('sql查询完毕，正在生成Excel');
    const data = [ { '测试1': 'hello', age: 1 }, { name: 'world', age: 2 } ];
    const jsonWorkSheet = xlsx.utils.json_to_sheet(data);
    Object.keys(Sheets)
      .forEach(key => {
        Sheets[key].sort((a, b) => b.综合得分 - a.综合得分);
        Sheets[key] = xlsx.utils.json_to_sheet(Sheets[key]);
      });
    Sheets['综合'] = xlsx.utils.json_to_sheet(all);
    const workBook = {
      SheetNames: Object.keys(Sheets),
      Sheets: Sheets
    };
    const filename = `${className}.xlsx`;
    const filePath = path.resolve(this.app.config.baseDir, filename);
    await xlsx.writeFile(workBook, filePath);
    console.log('Excel已生成');
    // this.ctx.attachment(filename);
    // this.ctx.body = fs.createReadStream(filePath);
    // fs.unlink(filePath, err => {
    //   if (err) throw err;
    //   console.log('excel文件已被删除');
    // });
  }


  async importClazzToLesson() {
    const workSheetsFromFile = xlsx.readFile(path.resolve(this.app.config.baseDir, '班级授课老师汇总.xlsx'), {
      type: 'file'
    }); //读取文件目录
    let json = xlsx.utils.sheet_to_json(workSheetsFromFile.Sheets[workSheetsFromFile.SheetNames[0]]);
    const db = this.app.mysql.get('ry');

    const results = await db.query(clazz());
    const classMapList = results.filter(clazz => clazz.ancestors.split(',').length >= 3)
      .map(clazz => ({
        id: clazz.dept_id,
        className: clazz.dept_name,
        grade: clazz.parent_name
      }));

    const userList = await db.select('sys_user');
    const userIdMap = {};
    userList.forEach(item => {
      userIdMap[item.user_name] = item.user_id;
    });
    this.ctx.body = classMapList;

    const classIdMap = {};
    classMapList.forEach(item => {
      classIdMap[item.grade + item.className] = item.id;
    });

    const lessonList = await db.select('sys_dict_data', {
      where: { dict_type: 'form_lesson' },
    });
    const lessonMap = {};
    lessonList.forEach(item => {
      lessonMap[item.dict_label] = item.dict_value;
    });

    let classList = [];
    const errTeacherNameList = [];
    json.forEach((row) => {
      const obj = {
        className: '',
        teacherList: []
      };
      Object.keys(row)
        .forEach((key, index) => {
          let item = row[key];
          if (index < 2) {
            return;
          }
          if (index === 2) {
            item = item.toString();
            const gradeName = gradeMap[item.split('.')[0]];
            const clazz = classMap[item.split('.')[1]];
            obj.className = gradeName + clazz;
            obj.classId = classIdMap[obj.className];
            if (!obj.classId) {
              console.log('error', obj.className);
            }
            return;
          }
          item = item.trim();
          if ([ '无', '外聘', '否', '外聘老师', '代课', '不知道' ].includes(item)) {
            return;
          }
          if (!userIdMap[item]) {
            // console.log('用户id查找失败:', item);
            errTeacherNameList.push(item);
            return;
          }
          if (!lessonMap[key]) {
            console.log(key);
          }
          obj.teacherList.push({
            lessonId: lessonMap[key],
            teacherName: item,
            teacherId: userIdMap[item]
          });

        });
      classList.push(obj);
    });
    console.log(Array.from(new Set(errTeacherNameList)));
    // console.log(classList);
    for (let i = 0; i < classList.length; i++) {
      const item = classList[i];
      const row = {
        teacher_id: '',
        class_id: item.classId,
        lesson_id: ''
      };
      for (let j = 0; j < item.teacherList.length; j++) {
        const teacherObj = item.teacherList[j];
        row.teacher_id = teacherObj.teacherId;
        row.lesson_id = teacherObj.lessonId;
        const count = await db.insert('base_teatocla_info', row);
        console.log(count);
      }
    }
  }

  async exportTeacherRate() {
    const db = this.app.mysql.get('ry');

    const rateResultMap = {
      1: '优秀',
      2: '良好',
      3: '一般',
      4: '差'
    };
    // const results = await db.query(clazz())
    // const classMapList = results.filter(clazz => clazz.ancestors.split(',').length >= 3).map(clazz => ({
    //   id: clazz.dept_id,
    //   className: clazz.dept_name,
    //   grade: clazz.parent_name
    // }));
    // const classIdMap = {};
    // classMapList.forEach(item => {
    //   classIdMap[item.id] = item.grade + item.className;
    // });
    const rateList = await db.query(`SELECT (select user_name from sys_user WHERE user_id = teacher_id) as teacherName, teacher_id, class_id, rateResult, position FROM form_virtotea_rate`);

    const rateMap = {};
    const rateMapParent = {};
    const rateMapStudent = {};

    rateList.forEach(item => {
      rateMap[item.teacherName] = rateMap[item.teacherName] || {
        优秀: 0,
        良好: 0,
        一般: 0,
        差: 0
      };
      rateMapParent[item.teacherName] = rateMapParent[item.teacherName] || {
        优秀: 0,
        良好: 0,
        一般: 0,
        差: 0
      };
      rateMapStudent[item.teacherName] = rateMapStudent[item.teacherName] || {
        优秀: 0,
        良好: 0,
        一般: 0,
        差: 0
      };
      rateMap[item.teacherName][rateResultMap[item.rateResult]]++;
      if (item.position == '1') { // 家长
        rateMapParent[item.teacherName][rateResultMap[item.rateResult]]++;
      } else if (item.position == '2') { //学生
        rateMapStudent[item.teacherName][rateResultMap[item.rateResult]]++;
      }
    });

    this.ctx.body = rateMapParent;
    const result = [];
    const resultParent = [];
    const resultStudent = [];
    Object.keys(rateMap)
      .forEach(teacherName => {
        const rateObj = rateMap[teacherName];
        const all = rateObj.优秀 + rateObj.良好 + rateObj.一般 + rateObj.差;

        const percentObj = {
          '优秀占比(%)': Math.floor((rateObj.优秀 / all) * 10000) / 100, //+ '%',
          '良好占比(%)': Math.floor((rateObj.良好 / all) * 10000) / 100, //+ '%',
          '一般占比(%)': Math.floor((rateObj.一般 / all) * 10000) / 100, //+ '%',
          '差占比(%)': Math.floor((rateObj.良好 / all) * 10000) / 100, //+ '%',
        };

        result.push({
          教师: teacherName,
          ...rateObj,
          ...percentObj
        });
      });
    Object.keys(rateMapParent)
      .forEach(teacherName => {
        const rateObj = rateMapParent[teacherName];
        const all = rateObj.优秀 + rateObj.良好 + rateObj.一般 + rateObj.差;

        const percentObj = {
          '优秀占比(%)': Math.floor((rateObj.优秀 / all) * 10000) / 100, //+ '%',
          '良好占比(%)': Math.floor((rateObj.良好 / all) * 10000) / 100, //+ '%',
          '一般占比(%)': Math.floor((rateObj.一般 / all) * 10000) / 100, //+ '%',
          '差占比(%)': Math.floor((rateObj.良好 / all) * 10000) / 100, //+ '%',
        };

        resultParent.push({
          教师: teacherName,
          ...rateObj,
          ...percentObj
        });
      });
    Object.keys(rateMapStudent)
      .forEach(teacherName => {
        const rateObj = rateMapStudent[teacherName];
        const all = rateObj.优秀 + rateObj.良好 + rateObj.一般 + rateObj.差;

        const percentObj = {
          '优秀占比(%)': Math.floor((rateObj.优秀 / all) * 10000) / 100, //+ '%',
          '良好占比(%)': Math.floor((rateObj.良好 / all) * 10000) / 100, //+ '%',
          '一般占比(%)': Math.floor((rateObj.一般 / all) * 10000) / 100, //+ '%',
          '差占比(%)': Math.floor((rateObj.良好 / all) * 10000) / 100, //+ '%',
        };

        resultStudent.push({
          教师: teacherName,
          ...rateObj,
          ...percentObj
        });
      });
    const Sheets = { '全部': [], '家长': [], '学生': '' };
    Sheets['全部'] = xlsx.utils.json_to_sheet(result);
    Sheets['家长'] = xlsx.utils.json_to_sheet(resultParent);
    Sheets['学生'] = xlsx.utils.json_to_sheet(resultStudent);
    const workBook = {
      SheetNames: Object.keys(Sheets),
      Sheets: Sheets
    };
    const filename = `教师评价汇总.xlsx`;
    const filePath = path.resolve(this.app.config.baseDir, filename);
    await xlsx.writeFile(workBook, filePath);
    console.log('Excel已生成');
  }


  async importScoreConfirm() {
    const grade7 = xlsx.readFile(path.resolve(this.app.config.baseDir, '成绩确认/八年级期末成绩登统（等级）.xls'), {
      type: 'file'
    }); //读取文件目录
    // const grade8 = xlsx.readFile(path.resolve(this.app.config.baseDir, '成绩确认/八年级期末成绩登统（等级）.xls'), {
    //   type: 'file'
    // }); //读取文件目录
    const db = this.app.mysql.get('ry');

    const results = await db.query(clazz());
    const classMapList = results.filter(clazz => clazz.ancestors.split(',').length >= 3)
      .map(clazz => ({
        id: clazz.dept_id,
        className: clazz.dept_name,
        grade: clazz.parent_name
      }));
    const classIdMap = {};
    classMapList.forEach(item => {
      classIdMap[item.grade + item.className] = item.id;
    });

    const base_stutocla_info = await db.select('base_stutocla_info');
    const stuToClassIdMap = {};
    base_stutocla_info.forEach(item => {
      stuToClassIdMap[item.student_id] = item.class_id;
    });

    const base_student_info = await db.select('base_student_info');


    const result = [];
    Object.keys(grade7.Sheets)
      .forEach(className => {
        let json = xlsx.utils.sheet_to_json(grade7.Sheets[className]);
        const classNameWord = gradeMap[className.split('.')[0]] + classMap[className.split('.')[1]];
        const classId = classIdMap[classNameWord];
        console.log(classNameWord, classId);
        // result[classNameWord] = json;
        json.forEach(row => {
          const insertObj = { class_id: classId, student_name: '', student_id: '' };
          Object.keys(row)
            .forEach(header => {
              if (header === '序号' || header === '班级') {
                return;
              }
              if (header === '姓名') {
                const studentName = row[header];
                insertObj.student_name = studentName;
                const stuList = base_student_info.filter(stu => stu.name === studentName);
                if (!stuList.length) {
                  console.log('error!!', studentName);
                  return;
                }
                if (stuList.length === 1) {
                  insertObj.student_id = stuList[0].idcard;
                } else {
                  const student = stuList.find(stu => stuToClassIdMap[stu.id] == classId);
                  if (!student) {
                    console.log('error!!同名学生没找到班级', studentName, stuList.map(stu => stuToClassIdMap[stu.id]));
                    return;
                  }
                  insertObj.student_id = student.idcard;
                }
                return;
              }
              if (!confirmLessonMap[header]) {
                return;
              }
              insertObj[confirmLessonMap[header]] = row[header];
            });
          result.push(insertObj);
        });
      });
    for (let j = 0; j < result.length; j++) {
      const count = await db.insert('form_parents_confirm', result[j]);
      console.log(count);
    }
    this.ctx.body = result;
  }

  /**
   * 导出体育成绩
   * @returns {Promise<void>}
   */
  async exportSportScore() {
    const db = this.app.mysql.get('ry');
    //清空导出文件夹
    const dirName = path.resolve(this.app.config.baseDir, '体育成绩导出');
    delDir(dirName);
    fs.mkdirSync(dirName);
    //获取所有任务
    const taskList = await db.select('form_sport_task');
    console.log(taskList);
    const teacherNameMap = {};
    taskList.forEach(item => {
      teacherNameMap[item.teacher_name] = teacherNameMap[item.teacher_name] || [];
      teacherNameMap[item.teacher_name].push(item);
    });
    const teacherNameList = Object.keys(teacherNameMap);

    for (let i = 0; i < teacherNameList.length; i++) {
      const list = teacherNameMap[teacherNameList[i]];
      const projectNameMap = {};
      const teacherNameDir = path.resolve(dirName, teacherNameList[i]);
      fs.mkdirSync(teacherNameDir);
      for (let j = 0; j < list.length; j++) {
        const task = list[j];
        const studentList = await db.query(getStudentListByClassId(task.class_id));
        const scoreList = await db.select('form_sport_score', {
          where: {
            score_task_id: task.id
          }
        });
        if (!scoreList.length) continue;
        const projectName = scoreList[0].project_name;
        const projectUnit = scoreList[0].project_unit;
        projectNameMap[projectName] = projectNameMap[projectName] || [];
        const studentListScored = studentList.map(student => {
          const result = {
            学号: student.scode,
            姓名: student.name,
            性别: student.sex,
            项目: projectName,
            成绩: '',
            单位: projectUnit,
            录入时间: ''
          };
          const score = scoreList.find(item => item.student_id === student.id);
          if (score) {
            result.录入时间 = score.update_time;
            if(projectUnit === '秒'){
              score.score = formatUnit(score.score)
            }
            result.成绩 = score.score;
          }
          return result;
        });
        projectNameMap[projectName].push({
          className: task.class_name,
          list: studentListScored
        });
      }
      const projectNameList = Object.keys(projectNameMap);
      for (let index = 0; index < projectNameList.length; index++) {
        const classList = projectNameMap[projectNameList[index]];
        const Sheets = {};
        for (let index1 = 0; index1 < classList.length; index1++) {
          const item = classList[index1];
          Sheets[item.className] = xlsx.utils.json_to_sheet(item.list);
        }
        const workBook = {
          SheetNames: Object.keys(Sheets),
          Sheets: Sheets
        };
        const filePath = path.resolve(teacherNameDir, `${projectNameList[index]}.xlsx`);
        await xlsx.writeFile(workBook, filePath);
      }
    }

    this.ctx.body = {
      error: false,
    };
  }
}

function makeSQL(tableName, studentid, teacherId) {
  const beginDate = '2020-09-20';
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
      sql += ` AND teacher_id = '${teacherId}'`;
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
    sql += ` AND createUserId = '${teacherId}'`;
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
    sys_dept d`;
};

//todo 放到student Service中
function getStudentListByClassId(classId) {
  return `
  SELECT b.id, b.scode, b.name, CASE b.sex
WHEN '0' THEN '男'
WHEN '1' THEN '女'
ELSE '其他' END AS sex  FROM base_stutocla_info a 
INNER JOIN base_student_info b 
ON a.class_id = ${classId} AND b.id = a.student_id AND b.STATUS = 0
ORDER BY b.scode + 0 ASC
`;
}

function delDir(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach((file, index) => {
      let curPath = path + '/' + file;
      if (fs.statSync(curPath)
        .isDirectory()) {
        delDir(curPath); //递归删除文件夹
      } else {
        fs.unlinkSync(curPath); //删除文件
      }
    });
    fs.rmdirSync(path);
  }
}

function formatUnit(num) {
  var result = '', counter = 0;
  num = (num || 0).toString();
  for (var i = num.length - 1; i >= 0; i--) {
    counter++;
    result = num.charAt(i) + result;
    if (!(counter % 2) && i != 0) {
      result = ':' + result;
    }
  }
  return result;
}

module.exports = ExportsController;
