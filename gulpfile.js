'use strict';

var gulp = require('gulp'),
  gutil = require('gulp-util'),
  clean = require('gulp-clean'),
  gulpSequence = require('gulp-sequence'),
  jshint = require('gulp-jshint'),
  concat = require('gulp-concat'),
  imagemin = require('gulp-imagemin'),
  minifyCss = require('gulp-minify-css'),
  minifyHtml = require('gulp-minify-html'),
  ngTemplate = require('gulp-ng-template'),
  uglify = require('gulp-uglify'),
  rev = require('gulp-rev'),
  replace = require('gulp-replace'),
  usemin = require('gulp-usemin'),
  merge2 = require('merge2'),
  version = 'v' + require('./package.json').version,
  cdnHost = require('./package.json').cdnHost;

gulp.task('clean', function () {
  return gulp.src(['static/dist/*', 'static/cdn/*', 'static/src/js/templates.js'])
    .pipe(clean({force: true}));
});

gulp.task('jshint', function () {
  return gulp.src(['*.js', 'api/*.js', 'dao/*.js', 'lib/*.js', 'patch/*.js', 'static/src/js/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter());
});

gulp.task('css', function () {
  return gulp.src([
      'static/bower_components/pure/pure.css',
      'static/bower_components/toastr/toastr.css',
      'static/bower_components/font-awesome/css/font-awesome.css',
      'static/src/css/prettify.css',
      'static/src/css/main.css'
    ])
    .pipe(concat('app.css'))
    .pipe(replace('VERSION', version))
    .pipe(gulp.dest('static/dist/css/'));
});

gulp.task('js-lib', function () {
  return gulp.src([
    'static/bower_components/jquery/dist/jquery.js',
    'static/bower_components/angular/angular.js',
    'static/bower_components/angular-animate/angular-animate.js',
    'static/bower_components/angular-cookies/angular-cookies.js',
    'static/bower_components/angular-resource/angular-resource.js',
    'static/bower_components/angular-route/angular-route.js',
    'static/bower_components/angular-i18n/angular-locale_zh-cn.js',
    'static/bower_components/angular-ui-utils/validate.js',
    'static/bower_components/angular-file-upload/angular-file-upload.js',
    'static/bower_components/google-code-prettify/src/prettify.js',
    'static/bower_components/marked/lib/marked.js',
    'static/bower_components/toastr/toastr.js',
    'static/bower_components/crypto-js/build/rollups/hmac-sha256.js',
    'static/bower_components/utf8/utf8.js',
    'static/bower_components/store2/dist/store2.js',
    'static/bower_components/jsonkit/jsonkit.js',
    'static/src/js/lib/bootstrap.js',
    'static/src/js/lib/Markdown.Editor.js',
    'static/src/js/lib/sanitize.js'
    ])
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('static/dist/js/'));
});

gulp.task('js-app', function () {
  return merge2(
      gulp.src([
        'static/src/js/app.js',
        'static/src/js/locale_zh-cn.js',
        'static/src/js/router.js',
        'static/src/js/tools.js',
        'static/src/js/services.js',
        'static/src/js/filters.js',
        'static/src/js/directives.js',
        'static/src/js/controllers.js'
      ]),
      gulp.src('static/src/tpl/*.html')
        .pipe(minifyHtml({empty: true, quotes: true}))
        .pipe(ngTemplate({
          moduleName: 'genTemplates',
          standalone: true,
          filePath: 'templates.js'
        })
      )
    )
    .pipe(concat('app.js'))
    .pipe(gulp.dest('static/dist/js/'));
});

gulp.task('files', function () {
  return gulp.src(['static/src/{md,img}/*', 'static/src/*.*'])
    .pipe(gulp.dest('static/dist'));
});

gulp.task('font', function () {
  return gulp.src('static/bower_components/font-awesome/fonts/*')
    .pipe(gulp.dest('static/dist/fonts/'));
});

gulp.task('cdn', function () {
  return gulp.src(['static/dist/**/*', '!static/dist/js/*', '!static/dist/css/*'])
    .pipe(gulp.dest('static/cdn/'));
});

gulp.task('usemin', function () {
  return gulp.src('static/dist/index.html')
    .pipe(replace('VERSION', version))
    .pipe(replace(/\/static\/(js|css)/g, '$1'))
    .pipe(usemin({
      css: [minifyCss({keepSpecialComments: 0}), rev()],
      // html: [minifyHtml({empty: true})],
      js: [uglify(), rev()]
    }))
    .pipe(replace('../cdn', cdnHost))
    .pipe(gulp.dest('static/cdn/'));
});

gulp.task('default', gulpSequence('clean', 'jshint', ['css', 'font', 'js-lib', 'js-app', 'files']));

gulp.task('build', gulpSequence('default', 'cdn', 'usemin'));
