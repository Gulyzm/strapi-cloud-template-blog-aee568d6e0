'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::setup.setup', ({ strapi }) => ({
  async createTestUsers(ctx) {
    try {
      // Vérifier si les utilisateurs existent déjà
      const existingAdmin = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'admin@test.com' }
      });
      
      const existingMember = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'member@test.com' }
      });

      if (existingAdmin && existingMember) {
        return ctx.send({ 
          message: 'Les utilisateurs de test existent déjà',
          users: ['admin@test.com', 'member@test.com']
        });
      }

      // Récupérer ou créer les rôles
      let adminRole = await strapi.query('plugin::users-permissions.role').findOne({
        where: { name: 'ADMIN' }
      });
      
      let memberRole = await strapi.query('plugin::users-permissions.role').findOne({
        where: { name: 'MEMBER' }
      });

      // Si les rôles n'existent pas, utiliser Authenticated par défaut
      const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });

      if (!adminRole) adminRole = authenticatedRole;
      if (!memberRole) memberRole = authenticatedRole;

      const bcrypt = require('bcryptjs');
      const results = [];

      // Créer utilisateur admin
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await strapi.query('plugin::users-permissions.user').create({
          data: {
            username: 'admin',
            email: 'admin@test.com',
            password: hashedPassword,
            confirmed: true,
            role: adminRole.id
          }
        });
        results.push('admin@test.com créé');
      }

      // Créer utilisateur member
      if (!existingMember) {
        const hashedPassword = await bcrypt.hash('member123', 10);
        await strapi.query('plugin::users-permissions.user').create({
          data: {
            username: 'member',
            email: 'member@test.com',
            password: hashedPassword,
            confirmed: true,
            role: memberRole.id
          }
        });
        results.push('member@test.com créé');
      }

      ctx.send({
        message: 'Utilisateurs de test créés avec succès',
        created: results,
        credentials: {
          admin: { email: 'admin@test.com', password: 'admin123' },
          member: { email: 'member@test.com', password: 'member123' }
        }
      });

    } catch (error) {
      console.error('Erreur création utilisateurs test:', error);
      ctx.badRequest('Erreur lors de la création des utilisateurs de test');
    }
  }
}));
