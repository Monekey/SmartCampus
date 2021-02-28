'use strict';

const BaseService = require('./base');

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
    const {ctx} = this;

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
    console.log(access_token)
    const {ctx} = this;
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
  async notify(access_token, appName = 'cloudLink') {
    console.log(access_token)
    const {ctx} = this;
    const url = `https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2?access_token=${access_token}`;
    const ddApp = this.config.miniApp[appName];

    const res = await ctx.curl(url, {
      method: 'POST',
      dataType: 'json',
      data: {
        agent_id: ddApp.AgentId,
        userid_list: '090236686223600734,022633566625201448,manager1741',
        msg: JSON.stringify({
          "msgtype": "action_card",
          "action_card": {
            "title": "截止今天您有3个待评价的课程",
            "markdown": "### 您有3个待评价任务即将过期  \n  - 三年三班 第六节 语文  \n  - 三年二班 第二节 数学  \n  - 三年二班 第三节 英语",
            "btn_orientation": "0",
            "btn_json_list": [
              {
                "title": "去评价",
                "action_url": "eapp://pages/yunlian/common?type=classroom"
              },
            ],
            // "single_title": "去评价",
            // "single_url": "eapp://pages/yunlian/common?type=classroom"
          }
        }),
      }
    });
    return res;
  }
}

module.exports = ddService;
