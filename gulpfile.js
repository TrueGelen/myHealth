var gulp = require('gulp'),
    sass = require('gulp-sass'),
    browserSync = require('browser-sync'),
    notify = require('gulp-notify'),
    smartgrid = require('smart-grid'),
    gcmq = require('gulp-group-css-media-queries'),
    autoprefixer = require('gulp-autoprefixer'),
    cleanCSS = require('gulp-clean-css'),
    del = require('del'),
    gulpif = require('gulp-if'),
    sourcemaps = require('gulp-sourcemaps'),
    webpack = require('webpack-stream'),
    svgSprite = require('gulp-svg-sprite'),
    svgmin = require('gulp-svgmin'),
    cheerio = require('gulp-cheerio'),
    replace = require('gulp-replace');

let isDev = false
let isProd = !isDev
let isSync = false

/* It's principal settings in smart grid project */
var settings = {
    outputStyle: 'sass', /* less || scss || sass || styl */
    columns: 12, /* number of grid columns */
    offset: '30px', /* gutter width px || % || rem */
    mobileFirst: false, /* mobileFirst ? 'min-width' : 'max-width' */
    container: {
        maxWidth: '1560px', /* max-width оn very large screen */
        fields: '30px' /* side fields */
    },
    breakPoints: {
        lg1360: {
            width: '1360px'
        },
        lg: {
            width: '1100px', /* -> @media (max-width: 1100px) */
        },
        md: {
            width: '960px'
        },
        sm: {
            width: '768px',
            fields: '15px' /* set fields only if you want to change container.fields */
        },
        xs: {
            width: '560px',
            fields: '15px'
        },
        xxs: {
            width: '420px',
            fields: '15px'
        }
    }
};
//needed breackpoints
//1360px
// size of containers
//571
//288

smartgrid('./source/sass', settings);

//for getting an actual flag isDev
function getWebpackConfig(isDev) {
    let webpackConfig = {
        output: {
            filename: 'build.js'
        },
        module: {
            rules: [
                {
                    test: /\.m?js$/,
                    loader: 'babel-loader',
                    exclude: /(node_modules|bower_components)/
                }
            ]
        },
        mode: isDev ? 'development' : 'production',
        devtool: isDev ? 'cheap-module-eval-source-map' : false,
    }

    return webpackConfig
}

gulp.task('js', function () {
    return gulp.src('./source/js/main.js')
        .pipe(webpack(getWebpackConfig(isDev)))
        .pipe(gulp.dest('./dist/js'))
        .pipe(gulpif(isSync, browserSync.stream()))
});

gulp.task('styles', function () {
    //return gulp.src('app/sass/*.+(sass|scss)')
    return gulp.src('source/sass/main.scss')
        .pipe(gulpif(isDev, sourcemaps.init()))
        .pipe(sass({ outputStyle: 'expanded' }).on("error", notify.onError()))
        .pipe(gcmq())
        .pipe(gulpif(isProd, autoprefixer({
            overrideBrowserslist: ["last 2 versions"],
            cascade: false
        })))
        .pipe(gulpif(isProd, cleanCSS({ level: 2 })))
        .pipe(gulpif(isDev, sourcemaps.write()))
        .pipe(gulp.dest('dist/css'))
        .pipe(gulpif(isSync, browserSync.reload({ stream: true })))
});

gulp.task('makeSvgSprite', function () {
    return gulp.src('./source/svg/*.svg')
        /*.pipe(svgmin())
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill');
                $('[stroke]').removeAttr('stroke');
                $('[style]').removeAttr('style');
            },
            parserOptions: { xmlMode: true }
        }))
        .pipe(replace('&gt;', '>')) */
        .pipe(svgSprite({
            mode: {
                symbol: {
                    dest: '',
                    sprite: 'sprite.svg'
                }
            },
            svg: {
                namespaceClassnames: ''
            }
        }))
        .pipe(gulp.dest('./dist/svgSprite/'))
})

gulp.task('browser-sync', function () {
    browserSync({
        server: {
            baseDir: './dist/'
        },
        notify: false
    });
});

gulp.task('cleanDist', async function () {
    const notToDel = [
        'dist/**',
        '!dist/img',
        '!dist/fonts',
        '!dist/svgSprite/headerWaves.svg',
        '!dist/svgSprite/headerWavesSM.svg',
    ]
    const deletedPaths = await del(notToDel);
    console.log('Deleted files and directories:\n', deletedPaths.join('\n'));
})

gulp.task('html', function () {
    return gulp.src('./source/*.html')
        .pipe(gulp.dest('./dist/'))
        .pipe(gulpif(isSync, browserSync.stream()))
})

function devFlags(done) {
    isSync = true
    isDev = true
    done()
}

function prodFlags(done) {
    isSync = true
    isDev = false
    done()
}

function smallProd(done) {
    isSync = false
    isDev = false
    done()
}

function watcher() {
    gulp.watch('source/sass/**/*.+(sass|scss)', gulp.parallel('styles'))
    gulp.watch('./source/*.html', gulp.parallel('html'))
    gulp.watch('source/js/*.js', gulp.parallel('js'))
}

gulp.task('dev', gulp.series(devFlags, 'makeSvgSprite', 'html', 'styles', 'js', gulp.parallel('browser-sync', watcher)))
gulp.task('build', gulp.series('cleanDist', prodFlags, 'makeSvgSprite', 'html', 'styles', 'js', gulp.parallel('browser-sync', watcher)))
gulp.task('fast', gulp.series('cleanDist', smallProd, 'makeSvgSprite', 'html', 'styles', 'js'))
