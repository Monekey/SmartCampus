const Subscription = require('egg').Subscription;

class ClassroomRate extends Subscription {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  static get schedule() {
    return {
      // interval: '999s', // 1 分钟间隔
      cron: '0 30 12 * * *', // cron表达式
      type: 'all', // 指定所有的 worker 都需要执行
      // env：数组，仅在指定的环境下才启动该定时任务
    };
  }

  // subscribe 是真正定时任务执行时被运行的函数
  async subscribe() {
    console.log('定时任务开始', new Date());
    const access_token = await this.ctx.service.dingding.getToken();
    const result = await this.ctx.service.dingding.notify(access_token);
    this.logger.info('定时任务：课堂评价钉钉工作通知，执行完毕', result);

  }
}

module.exports = ClassroomRate;
