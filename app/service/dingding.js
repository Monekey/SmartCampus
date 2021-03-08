'use strict';

const BaseService = require('./base');

const classTimeMap = {
  1: '第一节',
  2: '第二节',
  3: '第三节',
  4: '第四节',
  5: '第五节',
  6: '第六节',
  7: '第七节',
  8: '第八节',
};

/**
 * 对接钉钉api
 */
class ddService extends BaseService {
  /**
   * 获取企业内部应用的access_token
   access_token的有效期为7200秒（2小时），有效期内重复获取会返回相同结果并自动续期，过期后获取会返回新的access_token。
   开发者需要缓存access_token，用于后续接口的调用。因为每个应用的access_token是彼此独立的，所以进行缓存时需要区分应用来进行存储。
   不能频繁调用gettoken接口，否则会受到频率拦截。
   */
  async getToken(appName = 'cloudLink') {
    const { ctx } = this;

    const ddApp = this.config.miniApp[appName];

    console.log(ddApp);
    const url = `https://oapi.dingtalk.com/gettoken?appkey=${ddApp.AppKey}&appsecret=${ddApp.AppSecret}`;

    const res = await ctx.curl(url, {
      dataType: 'json',
    });
    // console.log(res.data.access_token);
    return res.data.access_token;
  }

  /**
   * 发起待办
   */
  async addTodo(access_token) {
    console.log(access_token);
    const { ctx } = this;
    const url = `https://oapi.dingtalk.com/topapi/workrecord/add?access_token=${access_token}`;

    const res = await ctx.curl(url, {
      method: 'POST',
      dataType: 'json',
      data: {
        userid: '090236686223600734',
        create_time: new Date().getTime(),
        title: '测试待办',
        url: 'https://oa.dingtalk.com',
        formItemList: JSON.stringify([
          {
            title: '测试标题1',
            content: '测试内容1'
          },
          {
            title: '测试标题2',
            content: '测试内容2'
          }
        ]),
        source_name: '云链',
        // biz_id: 'yunlian'
      }
    });
    return res;
  }

  /**
   * 发送工作通知
   */
  async notify(access_token, date) {
    if (!date) {
      //昨天的时间
      const today = new Date();
      today.setTime(today.getTime() - 24 * 60 * 60 * 1000);
      date = this.ctx.helper.FormatDate('yyyy-MM-dd', today);
    }
    const { ctx } = this;
    const url = `https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2?access_token=${access_token}`;
    const ddApp = this.config.miniApp['cloudLink'];
    const db = this.app.mysql.get('ry');

    const allUser = await db.select('sys_user');
    const userDDIdMap = {};
    allUser.forEach(item => {
      userDDIdMap[item.user_id] = item.otherloginname;
    });

    const result = await db.query(rateListSql(date));
    const notRateList = result.filter(item => !item.rated);
    const teacherMap = {};
    notRateList.forEach(item => {
      const teacherId = item.substitute_teacher_id || item.teacher_id;
      const lessonName = item.substituteLessonName || item.lessonName;
      const ddId = userDDIdMap[teacherId];
      teacherMap[ddId] = teacherMap[ddId] || {
        teacherId,
        todoList: []
      };
      teacherMap[ddId].todoList.push({
        lessonName: lessonName,
        // classDate: this.ctx.helper.FormatDate('yyyy-MM-dd', item.classdate),
        className: item.classname,
        classTimeName: classTimeMap[item.classtime]
      });
    });
    const br = '  \n  ';
    for (const ddId of Object.keys(teacherMap)) {
      const item = teacherMap[ddId];
      let markdown = `### 您有${item.todoList.length}个待评价任务即将过期${br}`;
      item.todoList.forEach(todo => {
        markdown += `- ${todo.className} ${todo.classTimeName} ${todo.lessonName}${br}`;
      });
      const result = await ctx.curl(url, {
        method: 'POST',
        dataType: 'json',
        data: {
          agent_id: ddApp.AgentId,
          userid_list: ddId,
          msg: JSON.stringify({
            'msgtype': 'action_card',
            'action_card': {
              'title': '截止今天您有3个待评价的课程',
              'markdown': markdown,
              'btn_orientation': '0',
              'btn_json_list': [
                {
                  'title': '去评价',
                  'action_url': 'eapp://pages/yunlian/common?type=classroom'
                },
              ],
              // "single_title": "去评价",
              // "single_url": "eapp://pages/yunlian/common?type=classroom"
            }
          }),
        }
      });
      console.log(result);
      if (result.data.errcode === 0) {
        // this.logger.info('定时任务：课堂评价钉钉工作通知，执行完毕', result);
      } else {
        console.log('定时任务：课堂评价钉钉工作通知，执行失败', result, item.teacherId);
        this.logger.error('定时任务：课堂评价钉钉工作通知，执行失败', result, item.teacherId);
      }
    }
    return teacherMap;
  }
}

function rateListSql(date) {
  let sql = `
  SELECT
  finalresult.* 
FROM
  (
  SELECT
    result.*,
    b.id AS rated 
  FROM
    ( SELECT a.*, ( SELECT NAME FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.lesson_id ) = lesson.id ) AS lessonName,
     ( SELECT NAME FROM base_lesson_info lesson WHERE CONCAT( 'LE', a.substitute_lesson_id ) = lesson.id ) AS substituteLessonName  
    FROM form_class_schedule a WHERE  a.classdate = '${date}' ) result
    LEFT JOIN form_rate_classroom b ON result.id = b.schedule_id 
  ) finalresult 
GROUP BY
  finalresult.id 
ORDER BY
  finalresult.classdate DESC,
  finalresult.classtime ASC
  `;
  return sql;
}

module.exports = ddService;
