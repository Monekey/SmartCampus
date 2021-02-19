'use strict';

const Controller = require('egg').Controller;
const fs = require('fs')

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hello egg'
  }

  async index1() {
    const {ctx, app} = this;
    // this.logger.debug('current user: %j', this.app);
    // const db = app.mysql.get('ry');
    // console.log(db);
    // const result = await db.select('base_student_info', {})
    // const result = app.config.miniApp;
    const arr = [
      '赵跃',
      '景建梅',
      '扈少华',
      '张美明',
      '武金艳',
      '曹宇',
      '郭秀荣',
      '张丽萍',
      '辛娟',
      '朱雪',
      '朱玲',
      '胡莉萌',
      '康静',
      '孙俊杰',
      '张文趁',
      '那钰浩',
      '李丹萌',
      '史天啸',
      '张梅',
      '范玉艳',
      '秦婉',
      '姚静欣',
      '李淑红',
      '党虎',
      '李长治',
      '张桂海',
      '刘芊',
      '董心蕊',
      '李淑芝',
      '纪雪',
      '徐天琦',
      '巨文娟',
      '任瑞军',
      '易卫萍',
      '李国栋',
      '赵宝坤',
      '刘炜琪',
      '莫晓梅',
      '赵子楠',
      '靳长瑞',
      '游畅',
      '肖杰',
      '张旭',
      '王玉娟',
      '李慧敏',
      '王婷婷',
      '边文华',
      '强伟',
      '田函菲',
      '苟瑞琪',
      '刘晓婕',
      '李丽',
      '刘海鹏',
      '周晖',
      '张雪',
      '刘丹',
      '党香倩',
      '陈思',
      '李春燕',
      '徐秀娟',
      '潘文颖',
      '杜朋朋',
      '朱建峰',
      '张玲2',
      '陈玉姗',
      '刘晓丽',
      '左明霞',
      '游胜楠',
      '程依娜',
      '初雯琦',
      '王春红',
      '张宏',
      '李青',
      '孙丽',
      '白洁',
      '李长燕',
      '詹文盟',
      '孔红涛',
      '郑艳萍',
      '王钦',
      '刘国印',
      '孟宪男',
      '白桂玲',
      '荆菁',
      '李吉红',
      '高学茂',
      '于志洁',
      '常娟',
      '李云',
      '李秋寒',
      '杨俊兰',
      '郑安生',
      '刘艳芝',
      '马杰',
      '孟丽敏',
      '陈虎',
      '蒙健',
      '张智勇',
      '王霞',
      '孟祥娜',
      '张萌',
      '高宗鹏',
      '钟丽萍',
      '王皓晨',
      '刘芳微',
      '胡丽娟',
      '佟芳',
      '张君红',
      '李群荣',
      '袁津颖',
      '王克香',
      '冯生津',
      '张楠',
      '贾昕昱',
      '王威',
      '刘继还',
      '张陆春',
      '宗晨明',
      '武树峰',
      '张汝新',
      '蔡和荣',
      '李昕原',
      '杨瑞',
      '邓秋红',
      '苏春元',
      '邢福生',
      '郑山林',
      '高阳',
      '胡明明',
      '李素娴',
      '张帆',
      '郭晓娟',
      '赵秀昉',
      '田雪',
      '郑朝蕊',
      '张毅',
      '李华',
      '郭淑芳',
      '刘永晶',
      '高恒',
      '李晓博',
      '谢爱敏',
      '陈奕如',
      '李静',
      '梁杰',
      '刘浩',
      '邓敏娜',
      '张洪恩',
      '邸宏超',
      '侯勇',
      '唐晓蕾',
      '丁桂华',
      '乔晓萍',
      '潘雅雯',
      '刘畅',
      '王伦平',
      '付俊丽',
      '张玲1',
      '滑朋秀',
      '汪国兴',
      '张瑾',
      '王梅',
      '郭珺雅',
      '史少娥',
      '孙静',
      '赵金芬',
      '张光柯',
    ];
    const db = this.app.mysql.get('ry');
    const promiseArr = arr.map(teacherName => {
      return db.query(`SELECT '${teacherName}' as teacherName, count(1) as sum FROM \`form_award\`  WHERE create_user_name = '${teacherName}'`)
    })
    Promise.all(promiseArr).then(resultArr => {
      console.log(resultArr);
      let result = '';

      resultArr.map(item => {
        result += item[0].teacherName + ',' + item[0].sum + '\r\n'
      })

      fs.writeFile('./result.csv', result, function (error) {
        if (error) {
          console.log('写入失败')
        } else {
          console.log('写入成功了')
        }
      })
    })
    ctx.setError('哈啊')
  }

}

module.exports = HomeController;
