module.exports = function(issuc, data){
	var code = issuc?1:0;
	return {"status":code, data:data||{}};
}