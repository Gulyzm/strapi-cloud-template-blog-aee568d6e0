'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/datasets/import',
      handler: 'dataset.importCsv',
      config: {
        policies: ['global::is-admin'],
      },
    },
  ],
};


