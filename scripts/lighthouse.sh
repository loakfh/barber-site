#!/bin/sh
# Lighthouse на мобильном: три прогона, в отчёт идёт медиана.
# Запуск: npm run build && npm run serve (в другом окне), затем npm run lighthouse
# или sh scripts/lighthouse.sh https://ваш-домен.ru/
URL="${1:-http://localhost:4330/}"
mkdir -p work/lh
for RUN in 1 2 3; do
  npx --yes lighthouse "$URL" --quiet --only-categories=performance,accessibility,seo,best-practices \
    --chrome-flags="--headless=new" --output=json --output-path="work/lh/run-$RUN.json" >/dev/null 2>&1
done
node -e '
  const runs = [1, 2, 3].map((n) => JSON.parse(require("fs").readFileSync(`work/lh/run-${n}.json`, "utf8")).categories);
  const median = (k) => runs.map((r) => Math.round(r[k].score * 100)).sort((a, b) => a - b)[1];
  console.log(`performance ${median("performance")} · accessibility ${median("accessibility")} · seo ${median("seo")} · best-practices ${median("best-practices")}`);
'
