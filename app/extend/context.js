// app/extend/context.js
module.exports = {
  /**
   * 通用前台错误处理
   * 使用方法: controller中通过this.ctx.setError调用
   * @param msg
   */
  setError(msg){
    this.body = {
      error: true,
      msg: msg || '请求失败，请重试'
    }
  }
};