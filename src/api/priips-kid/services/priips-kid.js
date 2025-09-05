'use strict';

/**
 * priips-kid service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::priips-kid.priips-kid');
