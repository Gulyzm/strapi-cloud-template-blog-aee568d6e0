'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::setup.setup', ({ strapi }) => ({
  async createTestUsers(ctx) {
    try {
      // Supprimer les anciens utilisateurs s'ils existent
      const existingAdmin = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'admin@test.com' }
      });
      
      const existingMember = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'member@test.com' }
      });

      // Supprimer les anciens utilisateurs
      if (existingAdmin) {
        await strapi.query('plugin::users-permissions.user').delete({
          where: { id: existingAdmin.id }
        });
        console.log('Ancien utilisateur admin supprimé');
      }

      if (existingMember) {
        await strapi.query('plugin::users-permissions.user').delete({
          where: { id: existingMember.id }
        });
        console.log('Ancien utilisateur member supprimé');
      }

      // Utiliser le rôle Authenticated par défaut
      const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });

      if (!authenticatedRole) {
        return ctx.badRequest('Rôle Authenticated non trouvé');
      }

      const bcrypt = require('bcryptjs');
      const results = [];

      // Créer utilisateur admin
      const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
      await strapi.query('plugin::users-permissions.user').create({
        data: {
          username: 'admin',
          email: 'admin@test.com',
          password: hashedPasswordAdmin,
          confirmed: true,
          blocked: false,
          role: authenticatedRole.id
        }
      });
      results.push('admin@test.com créé avec rôle Authenticated');

      // Créer utilisateur member
      const hashedPasswordMember = await bcrypt.hash('member123', 10);
      await strapi.query('plugin::users-permissions.user').create({
        data: {
          username: 'member',
          email: 'member@test.com',
          password: hashedPasswordMember,
          confirmed: true,
          blocked: false,
          role: authenticatedRole.id
        }
      });
      results.push('member@test.com créé avec rôle Authenticated');

      ctx.send({
        message: 'Utilisateurs de test recréés avec succès',
        created: results,
        credentials: {
          admin: { email: 'admin@test.com', password: 'admin123' },
          member: { email: 'member@test.com', password: 'member123' }
        },
        role: 'Authenticated'
      });

    } catch (error) {
      console.error('Erreur création utilisateurs test:', error);
      ctx.badRequest(`Erreur lors de la création des utilisateurs de test: ${error.message}`);
    }
  }
}));