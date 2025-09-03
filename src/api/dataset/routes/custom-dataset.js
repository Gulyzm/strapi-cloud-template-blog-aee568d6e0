'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/datasets/import',
      handler: 'dataset.importCsv',
      config: {
        auth: {
          scope: ['authenticated']
        }
      },
    },
    {
      method: 'GET',
      path: '/datasets/my-datasets',
      handler: 'dataset.getMyDatasets',
      config: {
        auth: {
          scope: ['authenticated']
        }
      },
    },
    {
      method: 'GET',
      path: '/datasets/:id/preview',
      handler: 'dataset.previewDataset',
      config: {
        auth: {
          scope: ['authenticated']
        }
      },
    },
  ],
};


