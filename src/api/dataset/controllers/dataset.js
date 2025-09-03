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

    // Validation du type de fichier
    if (!file.mimetype.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      return ctx.badRequest('Seuls les fichiers CSV sont acceptés');
    }

    // Validation de la taille (5MB max pour CSV)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return ctx.badRequest('Le fichier CSV est trop volumineux. Taille maximale : 5MB');
    }

    const datasetName = request.body?.datasetName || file.name.replace('.csv', '');
    const xKeyParam = request.body?.xKey;
    const yKeyParam = request.body?.yKey;
    const description = request.body?.description || '';
    const category = request.body?.category || 'general';

    let raw;
    try {
      raw = fs.readFileSync(file.path, 'utf8');
    } catch (error) {
      return ctx.badRequest('Impossible de lire le fichier CSV');
    }

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

    // Upload du fichier CSV pour sauvegarde
    let uploadedFile = null;
    try {
      const uploadedFiles = await strapi
        .plugin('upload')
        .service('upload')
        .upload({
          files: file,
          data: {
            fileInfo: {
              alternativeText: `CSV dataset: ${datasetName}`,
              caption: description,
              name: datasetName,
            },
          },
        });
      uploadedFile = uploadedFiles[0];
    } catch (error) {
      console.warn('Erreur upload fichier CSV:', error);
    }

    // Create dataset (v5 documents API)
    const dataset = await strapi.documents('api::dataset.dataset').create({
      data: {
        name: datasetName,
        visibility: 'private',
        owner: userId,
        source_file: uploadedFile?.id,
        meta: { 
          xKey, 
          yKey, 
          rows: records.length,
          description,
          category,
          originalFileName: file.name,
          fileSize: file.size
        },
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

    ctx.body = { 
      ok: true, 
      datasetId: dataset.id, 
      xKey, 
      yKey, 
      count: createdCount,
      fileName: file.name,
      fileSize: file.size,
      uploadedFileUrl: uploadedFile?.url
    };
  },

  async getMyDatasets(ctx) {
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    try {
      const datasets = await strapi.documents('api::dataset.dataset').findMany({
        filters: { owner: userId },
        populate: ['source_file', 'owner'],
        sort: { createdAt: 'desc' }
      });

      ctx.body = { datasets };
    } catch (error) {
      console.error('Erreur récupération datasets:', error);
      return ctx.internalServerError('Erreur lors de la récupération des datasets');
    }
  },

  async previewDataset(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    try {
      const dataset = await strapi.documents('api::dataset.dataset').findOne({
        documentId: id,
        populate: ['source_file', 'owner']
      });

      if (!dataset) {
        return ctx.notFound('Dataset non trouvé');
      }

      // Vérifier les permissions (owner ou admin)
      const userRole = ctx.state.user.role?.name || ctx.state.user.role?.type;
      if (dataset.owner.id !== userId && userRole !== 'ADMIN') {
        return ctx.forbidden('Accès refusé à ce dataset');
      }

      // Récupérer un échantillon de datapoints (20 premiers)
      const datapoints = await strapi.documents('api::datapoint.datapoint').findMany({
        filters: { dataset: dataset.id },
        sort: { x: 'asc' },
        limit: 20
      });

      ctx.body = { 
        dataset,
        datapoints,
        totalDatapoints: dataset.meta?.rows || 0
      };
    } catch (error) {
      console.error('Erreur preview dataset:', error);
      return ctx.internalServerError('Erreur lors de la récupération du dataset');
    }
  }
}));