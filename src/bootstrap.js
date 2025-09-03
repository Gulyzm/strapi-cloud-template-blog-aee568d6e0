'use strict';

const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const { categories, authors, articles, global, about } = require('../data/data.json');

async function seedExampleApp() {
  const shouldImportSeedData = await isFirstRun();

  if (shouldImportSeedData) {
    try {
      console.log('Setting up the template...');
      await importSeedData();
      console.log('Ready to go');
    } catch (error) {
      console.log('Could not import seed data');
      console.error(error);
    }
  } else {
    console.log(
      'Seed data has already been imported. We cannot reimport unless you clear your database first.'
    );
  }
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

async function setPublicPermissions(newPermissions) {
  // Find the ID of the public role
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: {
      type: 'public',
    },
  });

  // Create the new permissions and link them to the public role
  const allPermissionsToCreate = [];
  Object.keys(newPermissions).map((controller) => {
    const actions = newPermissions[controller];
    const permissionsToCreate = actions.map((action) => {
      return strapi.query('plugin::users-permissions.permission').create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id,
        },
      });
    });
    allPermissionsToCreate.push(...permissionsToCreate);
  });
  await Promise.all(allPermissionsToCreate);
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

function getFileData(fileName) {
  const filePath = path.join('data', 'uploads', fileName);
  // Parse the file metadata
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split('.').pop();
  const mimeType = mime.lookup(ext || '') || '';

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `An image uploaded to Strapi called ${name}`,
          caption: name,
          name,
        },
      },
    });
}

// Create an entry and attach files if there are any
async function createEntry({ model, entry }) {
  try {
    // Actually create the entry in Strapi
    await strapi.documents(`api::${model}.${model}`).create({
      data: entry,
    });
  } catch (error) {
    console.error({ model, entry, error });
  }
}

async function checkFileExistsBeforeUpload(files) {
  const existingFiles = [];
  const uploadedFiles = [];
  const filesCopy = [...files];

  for (const fileName of filesCopy) {
    // Check if the file already exists in Strapi
    const fileWhereName = await strapi.query('plugin::upload.file').findOne({
      where: {
        name: fileName.replace(/\..*$/, ''),
      },
    });

    if (fileWhereName) {
      // File exists, don't upload it
      existingFiles.push(fileWhereName);
    } else {
      // File doesn't exist, upload it
      const fileData = getFileData(fileName);
      const fileNameNoExtension = fileName.split('.').shift();
      const [file] = await uploadFile(fileData, fileNameNoExtension);
      uploadedFiles.push(file);
    }
  }
  const allFiles = [...existingFiles, ...uploadedFiles];
  // If only one file then return only that file
  return allFiles.length === 1 ? allFiles[0] : allFiles;
}

async function updateBlocks(blocks) {
  const updatedBlocks = [];
  for (const block of blocks) {
    if (block.__component === 'shared.media') {
      const uploadedFiles = await checkFileExistsBeforeUpload([block.file]);
      // Copy the block to not mutate directly
      const blockCopy = { ...block };
      // Replace the file name on the block with the actual file
      blockCopy.file = uploadedFiles;
      updatedBlocks.push(blockCopy);
    } else if (block.__component === 'shared.slider') {
      // Get files already uploaded to Strapi or upload new files
      const existingAndUploadedFiles = await checkFileExistsBeforeUpload(block.files);
      // Copy the block to not mutate directly
      const blockCopy = { ...block };
      // Replace the file names on the block with the actual files
      blockCopy.files = existingAndUploadedFiles;
      // Push the updated block
      updatedBlocks.push(blockCopy);
    } else {
      // Just push the block as is
      updatedBlocks.push(block);
    }
  }

  return updatedBlocks;
}

async function importArticles() {
  for (const article of articles) {
    const cover = await checkFileExistsBeforeUpload([`${article.slug}.jpg`]);
    const updatedBlocks = await updateBlocks(article.blocks);

    await createEntry({
      model: 'article',
      entry: {
        ...article,
        cover,
        blocks: updatedBlocks,
        // Make sure it's not a draft
        publishedAt: Date.now(),
      },
    });
  }
}

async function importGlobal() {
  const favicon = await checkFileExistsBeforeUpload(['favicon.png']);
  const shareImage = await checkFileExistsBeforeUpload(['default-image.png']);
  return createEntry({
    model: 'global',
    entry: {
      ...global,
      favicon,
      // Make sure it's not a draft
      publishedAt: Date.now(),
      defaultSeo: {
        ...global.defaultSeo,
        shareImage,
      },
    },
  });
}

async function importAbout() {
  const updatedBlocks = await updateBlocks(about.blocks);

  await createEntry({
    model: 'about',
    entry: {
      ...about,
      blocks: updatedBlocks,
      // Make sure it's not a draft
      publishedAt: Date.now(),
    },
  });
}

async function importCategories() {
  for (const category of categories) {
    await createEntry({ model: 'category', entry: category });
  }
}

async function importAuthors() {
  for (const author of authors) {
    const avatar = await checkFileExistsBeforeUpload([author.avatar]);

    await createEntry({
      model: 'author',
      entry: {
        ...author,
        avatar,
      },
    });
  }
}

async function importSeedData() {
  // Allow read of application content types
  await setPublicPermissions({
    article: ['find', 'findOne'],
    category: ['find', 'findOne'],
    author: ['find', 'findOne'],
    global: ['find', 'findOne'],
    about: ['find', 'findOne'],
  });

  // Create all entries
  await importCategories();
  await importAuthors();
  await importArticles();
  await importGlobal();
  await importAbout();
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  await seedExampleApp();
  await app.destroy();

  process.exit(0);
}


async function setupUsersPermissionsRoles() {
  console.log('Setting up Users & Permissions roles...');
  
  try {
    // Vérifier si les rôles existent déjà
    const existingMember = await strapi.query('plugin::users-permissions.role').findOne({
      where: { name: 'MEMBER' }
    });
    const existingAdmin = await strapi.query('plugin::users-permissions.role').findOne({
      where: { name: 'ADMIN' }
    });

    // Créer le rôle MEMBER s'il n'existe pas
    let memberRole = existingMember;
    if (!memberRole) {
      memberRole = await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: 'MEMBER',
          description: 'Membre avec accès en lecture aux datasets et datapoints',
          type: 'member'
        }
      });
      console.log('✅ Rôle MEMBER créé');
    }

    // Créer le rôle ADMIN s'il n'existe pas
    let adminRole = existingAdmin;
    if (!adminRole) {
      adminRole = await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: 'ADMIN',
          description: 'Administrateur avec accès complet et import CSV',
          type: 'admin'
        }
      });
      console.log('✅ Rôle ADMIN créé');
    }

    // Définir les permissions pour MEMBER
    const memberPermissions = [
      { action: 'api::dataset.dataset.find', role: memberRole.id },
      { action: 'api::dataset.dataset.findOne', role: memberRole.id },
      { action: 'api::datapoint.datapoint.find', role: memberRole.id },
      { action: 'api::datapoint.datapoint.findOne', role: memberRole.id },
      { action: 'api::document.document.find', role: memberRole.id },
      { action: 'api::document.document.findOne', role: memberRole.id }
    ];

    // Définir les permissions pour ADMIN (tout + import)
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
      { action: 'api::document.document.find', role: adminRole.id },
      { action: 'api::document.document.findOne', role: adminRole.id },
      { action: 'api::document.document.create', role: adminRole.id },
      { action: 'api::document.document.update', role: adminRole.id },
      { action: 'api::document.document.delete', role: adminRole.id }
    ];

    // Supprimer les anciennes permissions et créer les nouvelles pour MEMBER
    await strapi.query('plugin::users-permissions.permission').deleteMany({
      where: {
        role: memberRole.id,
        action: { $in: memberPermissions.map(p => p.action) }
      }
    });

    for (const permission of memberPermissions) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: permission
      });
    }

    // Supprimer les anciennes permissions et créer les nouvelles pour ADMIN
    await strapi.query('plugin::users-permissions.permission').deleteMany({
      where: {
        role: adminRole.id,
        action: { $in: adminPermissions.map(p => p.action) }
      }
    });

    for (const permission of adminPermissions) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: permission
      });
    }

    console.log('✅ Permissions configurées pour MEMBER et ADMIN');

    // Créer un utilisateur admin de test s'il n'existe pas
    const existingAdminUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: 'admin@test.com' }
    });

    if (!existingAdminUser) {
      const bcrypt = require('bcryptjs');
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
      console.log('✅ Utilisateur admin de test créé (admin@test.com / admin123)');
    }

    // Créer un utilisateur member de test s'il n'existe pas
    const existingMemberUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: 'member@test.com' }
    });

    if (!existingMemberUser) {
      const bcrypt = require('bcryptjs');
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
      console.log('✅ Utilisateur member de test créé (member@test.com / member123)');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la configuration des rôles:', error);
  }
}

module.exports = async () => {
  await seedExampleApp();
  await setupUsersPermissionsRoles();
};
