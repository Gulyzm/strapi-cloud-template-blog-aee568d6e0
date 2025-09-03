'use strict';

const { parse } = require('csv-parse/sync');
const dayjs = require('dayjs');
const fs = require('fs');
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::dataset.dataset', ({ strapi }) => ({
  async importCsv(ctx) {
    const { files, request, state } = ctx;

    const file = files?.file || request?.files?.file;
    if (!file) return ctx.badRequest('file is required');

    const userId = state?.user?.id;
    if (!userId) return ctx.unauthorized();

    const datasetName = request.body?.datasetName || file.name;
    const xKeyParam = request.body?.xKey;
    const yKeyParam = request.body?.yKey;

    const raw = fs.readFileSync(file.path, 'utf8');

    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    if (!records.length) return ctx.badRequest('CSV is empty');

    const headers = Object.keys(records[0]).map((h) => h.trim());
    const toLower = (h) => h.toLowerCase();
    const xKey = (xKeyParam && headers.includes(xKeyParam))
      ? xKeyParam
      : headers.find((h) => ['date', 'datetime', 'timestamp', 'time', 'x'].includes(toLower(h))) || headers[0];
    const yKey = (yKeyParam && headers.includes(yKeyParam))
      ? yKeyParam
      : headers.find((h) => ['value', 'y', 'val', 'amount', 'nav in eur', 'nav in pln'].includes(toLower(h))) || headers[1];

    // Create dataset (v5 documents API)
    const dataset = await strapi.documents('api::dataset.dataset').create({
      data: {
        name: datasetName,
        visibility: 'private',
        owner: userId,
        meta: { xKey, yKey, rows: records.length },
      },
    });

    const toNumber = (v) => {
      if (v == null) return null;
      if (typeof v === 'number') return Number.isFinite(v) ? v : null;
      if (typeof v !== 'string') return null;
      let s = v.trim().replace(/\u00A0/g, ''); // enlever NBSP
      // Garder les chiffres et séparateurs
      s = s.replace(/'/g, '');
      if (s.includes('.') && s.includes(',')) {
        // Choisir la dernière occurrence comme séparateur décimal
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          s = s.replace(/,/g, '');
        }
      } else if (s.includes(',')) {
        s = s.replace(/\s/g, '').replace(',', '.');
      } else {
        s = s.replace(/\s/g, '');
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    const parseDate = (val) => {
      if (val == null) return null;
      // Essayez Date natif (gère "March 31, 2025")
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d;
      // Fallback dayjs (ISO ou formats connus)
      const dj = dayjs(val);
      return dj.isValid() ? dj.toDate() : null;
    };

    const datapoints = records.map((r) => {
      const rawX = r[xKey];
      const xVal = parseDate(rawX);
      return {
        dataset: dataset.id,
        x: xVal,
        y: toNumber(r[yKey]),
        extra: r,
      };
    });

    // Insert one by one (v5 documents API)
    const chunk = 400;
    let createdCount = 0;
    for (let i = 0; i < datapoints.length; i += chunk) {
      const slice = datapoints.slice(i, i + chunk);
      /* eslint no-await-in-loop: 0 */
      for (const d of slice) {
        await strapi.documents('api::datapoint.datapoint').create({ data: d });
        createdCount += 1;
      }
    }

    ctx.body = { ok: true, datasetId: dataset.id, xKey, yKey, count: createdCount };
  },
}));


