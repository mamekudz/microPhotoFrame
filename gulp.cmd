@echo off
rem Shims "gulp" for tools that run `gulp` from the project root without npx/PATH (z. B. Gulp-Tasks-Sidebar).
set "ROOT=%~dp0"
if not exist "%ROOT%node_modules\.bin\gulp.cmd" (
  echo gulp: node_modules\.bin\gulp.cmd fehlt. Fuehre "npm install" im Projektroot aus. 1>&2
  exit /b 1
)
call "%ROOT%node_modules\.bin\gulp.cmd" %*
