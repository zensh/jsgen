/*
	根据传递的参数name，生成gr头像url，并执行回调
*/
var md5 = require('./tools.js').md5,
	check = require('validator').check,
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

try {check('adminbzensh.com').len(6, 64).isEmail();}
catch (e) {console.log(e)}


