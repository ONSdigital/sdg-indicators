echo "Desktop test"
pa11y ./_site/$pagePath/index.html
echo "Mobile test"
pa11y --config ./scripts/config/mobile.json ./_site/$pagePath/index.html
echo "High contrast test"
pa11y --config ./scripts/config/high-contrast.json ./_site/$pagePath/index.html