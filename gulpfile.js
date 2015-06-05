var gulp = require('gulp'),
    mainBowerFiles = require('main-bower-files'),
    concat = require('gulp-concat'),
    gulpif = require('gulp-if'),
    sass = require('gulp-ruby-sass'),
    jade = require('gulp-jade'),
    babel = require('gulp-babel'),
    del = require('del');

var vendor_components_dir = "./app/vendor_components";
var styles_dir = "./app/styles";
var scripts_dir = "./app/scripts";
var regJsfile = /\.js/;

gulp.task("clean:styles", function(cb){
  del([styles_dir], cb);
});

gulp.task("styles", ["clean:styles"], function(){
  return sass('src/', {bundleExec: true})
    .on('error', function(err){console.error('Error!', err.message);})
    .pipe(gulp.dest(styles_dir));
});

gulp.task("clean:vendor-files", function(cb){
  del([vendor_components_dir], cb);
});

gulp.task("vendor-files", ["clean:vendor-files"], function(){
    return gulp.src(mainBowerFiles(), {base: "bower_components"})
    .pipe(gulpif(function(file){return regJsfile.exec(file.path);}, concat('vendor.js')))
    .pipe(gulp.dest(vendor_components_dir));
});

gulp.task("clean:html", function(cb){
  del(["./app/*.html"], cb);
});
gulp.task("html", ["clean:html"], function(){
  return gulp.src("src/*.jade").pipe(jade({locals: {}})).pipe(gulp.dest("./app"))
});

gulp.task("clean:scripts", function(cb){
  del([scripts_dir], cb);
});
gulp.task("scripts", ["clean:scripts"], function(){
  return gulp.src("src/*.js").pipe(babel()).pipe(gulp.dest(scripts_dir));
});
