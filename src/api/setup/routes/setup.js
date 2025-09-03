'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/setup/create-test-users',
      handler: 'setup.createTestUsers',
      config: {
        auth: false, // Accessible sans auth pour le setup initial
      },
    },
  ],
};
