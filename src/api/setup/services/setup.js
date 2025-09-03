'use strict';

/**
 * setup service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::setup.setup');
