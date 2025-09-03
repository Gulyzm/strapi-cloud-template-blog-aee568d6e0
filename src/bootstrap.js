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
    // Utiliser les rôles par défaut de Strapi au lieu de créer de nouveaux rôles
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' }
    });
    
    const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' }
    });

    if (!authenticatedRole) {
      console.log('❌ Rôle Authenticated non trouvé');
      return;
    }

    // Utiliser le rôle Authenticated pour tous les utilisateurs
    const memberRole = authenticatedRole;
    const adminRole = authenticatedRole;

    // Configurer les permissions pour le rôle Authenticated (utilisé par tous)
    const authenticatedPermissions = [
      { action: 'api::dataset.dataset.find', role: authenticatedRole.id },
      { action: 'api::dataset.dataset.findOne', role: authenticatedRole.id },
      { action: 'api::dataset.dataset.create', role: authenticatedRole.id },
      { action: 'api::dataset.dataset.update', role: authenticatedRole.id },
      { action: 'api::dataset.dataset.delete', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.find', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.findOne', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.create', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.update', role: authenticatedRole.id },
      { action: 'api::datapoint.datapoint.delete', role: authenticatedRole.id },
      { action: 'api::document.document.find', role: authenticatedRole.id },
      { action: 'api::document.document.findOne', role: authenticatedRole.id },
      { action: 'api::document.document.create', role: authenticatedRole.id },
      { action: 'api::document.document.update', role: authenticatedRole.id },
      { action: 'api::document.document.delete', role: authenticatedRole.id }
    ];

    // Supprimer les anciennes permissions et créer les nouvelles
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
        // Ignorer les erreurs de permissions déjà existantes
        console.log(`Permission ${permission.action} déjà existante`);
      }
    }

    console.log('✅ Permissions configurées pour le rôle Authenticated');
    console.log('ℹ️  Créez vos utilisateurs manuellement dans l\'admin Strapi');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration des rôles:', error);
  }
}

module.exports = async () => {
  await seedExampleApp();
  await setupUsersPermissionsRoles();
};
