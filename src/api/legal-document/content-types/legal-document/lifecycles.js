'use strict';

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Si pas de titre et qu'il y a un document, utiliser le nom du fichier
    if (!data.title && data.document) {
      try {
        const file = await strapi.query('plugin::upload.file').findOne({
          where: { id: data.document }
        });
        
        if (file) {
          // Nettoyer le nom du fichier pour le titre
          data.title = file.name
            .replace(/\.[^/.]+$/, '') // Enlever l'extension
            .replace(/[-_]/g, ' ')     // Remplacer - et _ par espaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitaliser
        }
      } catch (error) {
        console.warn('Erreur récupération nom fichier:', error);
      }
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Si le titre est vide et qu'un nouveau document est uploadé
    if (!data.title && data.document) {
      try {
        const file = await strapi.query('plugin::upload.file').findOne({
          where: { id: data.document }
        });
        
        if (file) {
          data.title = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        }
      } catch (error) {
        console.warn('Erreur récupération nom fichier:', error);
      }
    }
  }
};
