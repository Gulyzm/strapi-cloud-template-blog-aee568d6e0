'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::document.document', ({ strapi }) => ({
  async uploadDocument(ctx) {
    const { files, request, state } = ctx;

    const file = files?.file || request?.files?.file;
    if (!file) return ctx.badRequest('file is required');

    const userId = state?.user?.id;
    if (!userId) return ctx.unauthorized();

    const { title, description, category, tags, visibility } = request.body;

    // Validation du type de fichier
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return ctx.badRequest('Type de fichier non autorisé. Seuls PDF, DOC, DOCX et TXT sont acceptés.');
    }

    // Validation de la taille (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return ctx.badRequest('Le fichier est trop volumineux. Taille maximale : 10MB');
    }

    try {
      // Upload du fichier via le service Strapi
      const uploadedFiles = await strapi
        .plugin('upload')
        .service('upload')
        .upload({
          files: file,
          data: {
            fileInfo: {
              alternativeText: title || file.name,
              caption: description || '',
              name: title || file.name,
            },
          },
        });

      // Déterminer le type de fichier
      let fileType = 'other';
      if (file.mimetype === 'application/pdf') fileType = 'pdf';
      else if (file.mimetype.includes('word')) fileType = file.mimetype.includes('openxml') ? 'docx' : 'doc';
      else if (file.mimetype === 'text/plain') fileType = 'txt';

      // Créer l'entrée document
      const document = await strapi.documents('api::document.document').create({
        data: {
          title: title || file.name,
          description: description || '',
          file: uploadedFiles[0].id,
          fileType,
          category: category || 'autre',
          uploadedBy: userId,
          tags: tags ? JSON.parse(tags) : [],
          visibility: visibility || 'private',
        },
      });

      ctx.body = {
        ok: true,
        documentId: document.id,
        fileName: uploadedFiles[0].name,
        fileType,
        size: uploadedFiles[0].size,
        url: uploadedFiles[0].url
      };
    } catch (error) {
      console.error('Erreur upload document:', error);
      return ctx.internalServerError('Erreur lors de l\'upload du document');
    }
  },

  async getMyDocuments(ctx) {
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    try {
      const documents = await strapi.documents('api::document.document').findMany({
        filters: { uploadedBy: userId },
        populate: ['file', 'uploadedBy'],
        sort: { createdAt: 'desc' }
      });

      ctx.body = { documents };
    } catch (error) {
      console.error('Erreur récupération documents:', error);
      return ctx.internalServerError('Erreur lors de la récupération des documents');
    }
  }
}));
