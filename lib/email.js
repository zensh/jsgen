var nodemailer = require('nodemailer');

var email = {
    to: null,
    subject: null,
    html: null
};

email.send = function (callback) {
    var callback = callback || jsGen.tools.callbackFn,
        smtp = jsGen.config.smtp,
        that = this;
    /*var smtp = {
        host: 'smtp.qq.com',
        secureConnection: true,
        port: 465,
        auth: {
            user: 'noreply@qq.com',
            pass: 'jsgen2013'
        },
        senderName: 'jsGen',
        senderEmail: 'noreply@qq.com'
    };*/
    if(!smtp) return callback('请配置SMTP', null);
    if(!this.to) return callback('请确定收件人', null);
    if(!this.subject) return callback('请确定填写邮件标题', null);
    var smtpTransport = nodemailer.createTransport('SMTP', smtp),
        mailOptions = {
            from: smtp.senderName + '<' + smtp.senderEmail + '>',
            to: this.to,
            subject: this.subject,
            html: this.html
        };
    this.to = null;
    this.subject = null;
    this.html = null;
    smtpTransport.sendMail(mailOptions, function(error, response) {
        smtpTransport.close();
        callback(error, response);
    });
};

email.date = function() {
    var d = new Date();
    return d.getFullYear() + '年' + d.getMonth() + '月' + d.getDate() + '日 ' + d.getHours() + ':' + d.getMinutes();
};

email.tpl = function(websiteName, userName, userEmail, url, mailTpl) {
    this.to = userEmail;
    switch(mailTpl) {
        case 'role':
        this.subject = userName + '，请您验证用户Email —— ' + websiteName;
        this.html = '<p>您好！' + userName + '</p>\n<p>请点击链接验证Email：<a href="' + url + '">' + url + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！</p>\n<p>' + websiteName + '<br />' + this.date() + '</p>';
        break;
        case 'locked':
        this.subject = userName + '，您的帐号被锁定了，请点击Email内链接解锁 —— ' + websiteName,
        this.html = '<p>您好！' + userName + '</p>\n<p>您的帐号被锁定了，请点击链接解锁：<a href="' + url + '">' + url + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！</p>\n<p>' + websiteName + '<br />' + this.date() + '</p>';
        break;
        case 'email':
        this.subject = userName + '，您申请修改Email，请确认 —— ' + websiteName;
        this.html = '<p>您好！' + userName + '</p>\n<p>您申请修改Email为：' + userEmail +
            '，请点击链接确认修改Email：<a href="' + url + '">' + url + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！若放弃修改Email请不要点击链接!</p>\n<p>' + websiteName + '<br />' + this.date() + '</p>';
        break;
        case 'passwd':
        this.subject = userName + '，您申请重置密码 —— ' + websiteName;
        this.html = '<p>您好！' + userName + '</p>\n<p>您申请重置密码，请点击链接确认：<a href="' + url + '">' + url + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！点击确认后密码将重置为您的Email：<strong>' + userEmail +'</strong></p>\n<p>' + websiteName + '<br />' + this.date() + '</p>';
        break;
        case 'register':
        this.subject = '新用户注册：' + userName + ' —— ' + websiteName;
        this.html = '<p>您好！您的站点<strong>' + websiteName + '</strong>有新用户注册：</p>\n<p>用户名：' + userName + '</p>\n' +
            '<p>用户链接：<a href="' + url + '">' + url + '</a></p>\n<p>' + websiteName + '<br />' + this.date() + '</p>';
        break;
    }
    return this;
};

module.exports = email;
