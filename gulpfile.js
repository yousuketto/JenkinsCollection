var gulp = require('gulp'),
    mainBowerFiles = require('main-bower-files'),
    concat = require('gulp-concat'),
    gulpif = require('gulp-if'),
    sass = require('gulp-ruby-sass'),
    del = require('del');

var vendor_components_dir = "./app/vendor_components";
var styles_dir = "./app/styles";
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
