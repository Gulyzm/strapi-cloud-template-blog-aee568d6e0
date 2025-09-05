'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/documents/upload',
      handler: 'document.uploadDocument',
      config: {
        policies: ['global::is-admin'],
      },
    },
    {
      method: 'GET',
      path: '/documents/my-documents',
      handler: 'document.getMyDocuments',
      config: {
        auth: {
          scope: ['authenticated']
        }
      },
    },
  ],
};
