const gulp = require('gulp')
const plumber = require('gulp-plumber')
const resize = require('gulp-image-resize')
const gulpWebp = require('gulp-webp').default
const del = require('del')
const path = require('path')

const paths = {
  src: 'src/images/**/*.{jpg,png}',
  dest: 'assets/img/temp/' // безопасно оставить всё здесь
}

// Очистка только папки main
function clean() {
  return del([paths.dest])
}

// Масштабирование
function resizeImages() {
  const sizes = [240, 320, 480, 640]

  const tasks = sizes.map((size) => {
    return function resizeTask() {
      return gulp
        .src(paths.src)
        .pipe(plumber())
        .pipe(
          resize({
            width: size,
            upscale: false
          })
        )
        .pipe(
          gulp.dest((file) => {
            const dirname = path.dirname(file.path)
            const extname = path.extname(file.path)
            const basename = path.basename(file.path, extname).toLowerCase()
            const ext = extname.toLowerCase()
            file.path = path.join(dirname, `${basename}-${size}${ext}`)
            return paths.dest
          })
        )
    }
  })

  return gulp.parallel(...tasks)
}

// Конвертация в WebP
function convertWebp() {
  return gulp
    .src(paths.dest + '**/*.{jpg,png}')
    .pipe(gulpWebp({ quality: 75 }))
    .pipe(gulp.dest(paths.dest))
}

// Сборка
const build = gulp.series(clean, resizeImages(), convertWebp)

exports.build = build
exports.default = build
