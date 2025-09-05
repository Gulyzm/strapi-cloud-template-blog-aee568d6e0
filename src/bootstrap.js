'use strict';

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
// Données de seed supprimées - projet nettoyé du template blog

async function seedExampleApp() {
  console.log('Template blog nettoyé - pas de données de seed à importer');
  console.log('Prêt pour vos propres content-types !');
}

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });
  const initHasRun = await pluginStore.get({ key: 'initHasRun' });
  
  // Force la création des utilisateurs en production
  const forceUserCreation = process.env.NODE_ENV === 'production' && !initHasRun;
  
  await pluginStore.set({ key: 'initHasRun', value: true });
  return !initHasRun || forceUserCreation;
}

// Fonction setPublicPermissions supprimée - plus de données de seed blog

// Toutes les fonctions de seed blog supprimées


async function setupUsersPermissionsRoles() {
  console.log('Setting up Users & Permissions roles...');
  
  try {
    // Récupérer le rôle Authenticated par défaut
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' }
    });

    if (!authenticatedRole) {
      console.log('❌ Rôle Authenticated non trouvé');
      return;
    }

    // Créer ou récupérer le rôle Admin personnalisé
    let adminRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { name: 'Admin' }
    });

    if (!adminRole) {
      adminRole = await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: 'Admin',
          description: 'Administrateurs avec accès complet et import CSV',
          type: 'admin'
        }
      });
      console.log('✅ Rôle Admin créé');
    }

    // Permissions pour Authenticated (utilisateurs normaux - lecture seule)
    const authenticatedPermissions = [
      { action: 'api::dataset.dataset.find', role: authenticatedRole.id },
      { action: 'api::dataset.dataset.findOne', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.find', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.findOne', role: authenticatedRole.id },
      { action: 'api::priips-kid.priips-kid.find', role: authenticatedRole.id },
      { action: 'api::priips-kid.priips-kid.findOne', role: authenticatedRole.id },
      { action: 'api::legal-document.legal-document.find', role: authenticatedRole.id },
      { action: 'api::legal-document.legal-document.findOne', role: authenticatedRole.id }
    ];

    // Permissions pour Admin (accès complet + import CSV)
    const adminPermissions = [
      { action: 'api::dataset.dataset.find', role: adminRole.id },
      { action: 'api::dataset.dataset.findOne', role: adminRole.id },
      { action: 'api::dataset.dataset.create', role: adminRole.id },
      { action: 'api::dataset.dataset.update', role: adminRole.id },
      { action: 'api::dataset.dataset.delete', role: adminRole.id },
      { action: 'api::datapoint.datapoint.find', role: adminRole.id },
      { action: 'api::datapoint.datapoint.findOne', role: adminRole.id },
      { action: 'api::datapoint.datapoint.create', role: adminRole.id },
      { action: 'api::datapoint.datapoint.update', role: adminRole.id },
      { action: 'api::datapoint.datapoint.delete', role: adminRole.id },
      { action: 'api::priips-kid.priips-kid.find', role: adminRole.id },
      { action: 'api::priips-kid.priips-kid.findOne', role: adminRole.id },
      { action: 'api::priips-kid.priips-kid.create', role: adminRole.id },
      { action: 'api::priips-kid.priips-kid.update', role: adminRole.id },
      { action: 'api::priips-kid.priips-kid.delete', role: adminRole.id },
      { action: 'api::legal-document.legal-document.find', role: adminRole.id },
      { action: 'api::legal-document.legal-document.findOne', role: adminRole.id },
      { action: 'api::legal-document.legal-document.create', role: adminRole.id },
      { action: 'api::legal-document.legal-document.update', role: adminRole.id },
      { action: 'api::legal-document.legal-document.delete', role: adminRole.id }
    ];

    // Configurer permissions pour Authenticated
    await strapi.query('plugin::users-permissions.permission').deleteMany({
      where: {
        role: authenticatedRole.id,
        action: { $in: authenticatedPermissions.map(p => p.action) }
      }
    });

    for (const permission of authenticatedPermissions) {
      try {
        await strapi.query('plugin::users-permissions.permission').create({
          data: permission
        });
      } catch (error) {
        console.log(`Permission ${permission.action} déjà existante pour Authenticated`);
      }
    }

    // Configurer permissions pour Admin
    await strapi.query('plugin::users-permissions.permission').deleteMany({
      where: {
        role: adminRole.id,
        action: { $in: adminPermissions.map(p => p.action) }
      }
    });

    for (const permission of adminPermissions) {
      try {
        await strapi.query('plugin::users-permissions.permission').create({
          data: permission
        });
      } catch (error) {
        console.log(`Permission ${permission.action} déjà existante pour Admin`);
      }
    }

    console.log('✅ Permissions configurées pour Authenticated (lecture seule) et Admin (tout + uploads)');
    console.log('ℹ️  Créez vos utilisateurs manuellement dans l\'admin Strapi');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration des rôles:', error);
  }
}

module.exports = async () => {
  await seedExampleApp();
  await setupUsersPermissionsRoles();
};
