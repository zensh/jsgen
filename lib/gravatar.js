/*
	根据传递的参数name，生成gr头像url，并执行回调
*/
var http = require('http'),
	md5 = require('./stools').md5,//md5加密方法
	get_id = require('./stools').get_id,//mongodb的_id生成方法
	checkemail = require('./stools').checkemail,
	gr = {};//gr对象
gr.sendurl = 'http://www.gravatar.com/avatar/$hex?s=200';
gr.create = function(name){
	var url = gr.genstr(name);
	if(checkemail(name)) return url;
	return 'Invalid username!';
}

gr.genstr = function(name){
	var name = md5(name.trim().toLowerCase());
	return gr.sendurl.replace('$hex', name);
}
module.exports = gr.create; 


