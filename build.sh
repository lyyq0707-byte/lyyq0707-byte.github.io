#!/usr/bin/env bash
# 组装最终网站，输出到 _site/
#   home/wwwroot    -> /          （404 页面，同时作为首页）
# 本地预览和 GitHub Actions 部署都用这个脚本，保证两边结果一致。
set -euo pipefail
cd "$(dirname "$0")"

rm -rf _site
mkdir -p _site

cp -R home/wwwroot/. _site/
cp _site/404.html _site/index.html

find _site -name .gitkeep -delete
touch _site/.nojekyll

echo "Built _site:"
find _site -type f | sort
