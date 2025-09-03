'use strict';

/**
 * datapoint service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::datapoint.datapoint');
