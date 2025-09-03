'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/documents/upload',
      handler: 'document.uploadDocument',
      config: {
        auth: {
          scope: ['authenticated']
        }
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
