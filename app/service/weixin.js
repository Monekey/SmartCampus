'use strict';

const BaseService = require('./base');

const WXBizDataCrypt = require('../utils/WXBizDataCrypt');

/**
 * 对接微信api
 */
class wxService extends BaseService {

  /**
   * 获取openid
   * @param {*} code 前端wx.login获取的code登录码
   * @param {*} appType config中配置的小程序的标识
   */
  async code2Session(code, appType = 'parentApp') {

    const { ctx } = this;

    const wxApp = this.config.miniApp[appType];

    console.log(wxApp);

    const url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + wxApp.AppID + '&secret=' + wxApp.AppSecret + '&js_code=' + code + '&grant_type=authorization_code';

    const res = await ctx.curl(url, {
      dataType: 'json',
    });

    if (res.data.openid) {
      return {
        openid: res.data.openid,
        sta: true,
        sessionKey: res.data.session_key,
      };
    }

    return { // 忽略网络请求失败
      msg: res.data.errmsg,
      sta: false,
    };

  }

  /**
   * 解密数据
   * @param encryptedData
   * @param iv
   * @param sessionKey 微信sessionKey
   * @param appType
   * @returns {Promise<*>}
   */
  async decryptData({ encryptedData, iv, sessionKey, appType = 'parentApp' }) {
    const wxApp = this.config.miniApp[appType];

    const pc = new WXBizDataCrypt(wxApp.AppID, sessionKey);

    const data = pc.decryptData(encryptedData, iv);
    // console.log(data);
    return data;
  }

}

module.exports = wxService;
