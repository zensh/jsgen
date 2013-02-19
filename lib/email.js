var nodemailer = require('nodemailer'),
    callbackFn = jsGen.tools.callbackFn;

function sendMail(emailObj, callback) {
    var callback = callback || callbackFn;
    var smtp = jsGen.globalConfig.smtp;
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
        smtpTransport = nodemailer.createTransport('SMTP', smtp),
        mailOptions = {
            from: smtp.senderName + '<' + smtp.senderEmail + '>',
            to: emailObj.to,
            subject: emailObj.subject,
            html: emailObj.html
        };

    smtpTransport.sendMail(mailOptions, function(error, response) {
        smtpTransport.close();
        callback(error, response);
    });
};

function localeDate() {
    var d = new Date();
    return d.getFullYear() + '年' + d.getMonth() + '月' + d.getDate() + '日 ' + d.getHours() + ':' + d.getMinutes();
};

function sendRole(websiteName, userName, userEmail, resetUrl, callback) {
    var date = new Date,
        emailObj = {
            to: userEmail,
            subject: userName + '，请您验证用户Email —— ' + websiteName,
            html: '<p>您好！' + userName + '</p>\n<p>请点击链接验证Email：<a href="' + resetUrl + '">' + resetUrl + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！</p>\n<p>' + websiteName + '<br />' + localeDate() + '</p>'
        };
    sendMail(emailObj, callback);
};

function sendLocked(websiteName, userName, userEmail, resetUrl, callback) {
    var date = new Date,
        emailObj = {
            to: userEmail,
            subject: userName + '，您的帐号被锁定了，请点击Email内链接解锁 —— ' + websiteName,
            html: '<p>您好！' + userName + '</p>\n<p>您的帐号被锁定了，请点击链接解锁：<a href="' + resetUrl + '">' + resetUrl + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！</p>\n<p>' + websiteName + '<br />' + localeDate() + '</p>'
        };
    sendMail(emailObj, callback);
};

function sendEmail(websiteName, userName, userEmail, resetUrl, callback) {
    var date = new Date,
        emailObj = {
            to: userEmail,
            subject: userName + '，您申请修改Email，请确认 —— ' + websiteName,
            html: '<p>您好！' + userName + '</p>\n<p>您申请修改Email为：' + userEmail +
            '，请点击链接确认修改Email：<a href="' + resetUrl + '">' + resetUrl + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！若放弃修改Email请不要点击链接!</p>\n<p>' + websiteName + '<br />' + localeDate() + '</p>'
        };
    sendMail(emailObj, callback);
};

function sendPasswd(websiteName, userName, userEmail, resetUrl, callback) {
    var date = new Date,
        emailObj = {
            to: userEmail,
            subject: userName + '，您申请重置密码 —— ' + websiteName,
            html: '<p>您好！' + userName + '</p>\n<p>您申请重置密码，请点击链接确认：<a href="' + resetUrl + '">' + resetUrl + '</a></p>\n' +
            '<p>注意：本链接3日内点击有效！点击确认后密码将重置为您的Email：<strong>' + userEmail +'</strong></p>\n<p>' + websiteName + '<br />' + localeDate() + '</p>'
        };
    sendMail(emailObj, callback);
};

module.exports = {
    sendMail: sendMail,
    sendRole: sendRole,
    sendLocked: sendLocked,
    sendEmail: sendEmail,
    sendPasswd: sendPasswd
};
