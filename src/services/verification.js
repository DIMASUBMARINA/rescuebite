const { prisma } = require('../config/database');

async function submitDocument(profileType, profileId, documentType, documentUrl) {
  return prisma.verificationDocument.create({
    data: {
      profileType,
      profileId,
      documentType,
      documentUrl,
      status: 'PENDING',
    },
  });
}

async function getPendingDocuments() {
  return prisma.verificationDocument.findMany({
    where: { status: 'PENDING' },
    include: {
      restaurant: true,
      shelter: true,
      driver: true,
    },
  });
}

async function reviewDocument(documentId, adminId, status, note) {
  const document = await prisma.verificationDocument.update({
    where: { id: documentId },
    data: {
      status,
      reviewedBy: adminId,
      reviewNote: note,
    },
  });

  if (status === 'APPROVED') {
    const updateData = {
      isVerified: true,
      verificationStatus: 'APPROVED',
    };

    if (document.profileType === 'RESTAURANT') {
      await prisma.restaurant.update({
        where: { id: document.profileId },
        data: updateData,
      });
    } else if (document.profileType === 'SHELTER') {
      await prisma.shelter.update({
        where: { id: document.profileId },
        data: updateData,
      });
    } else if (document.profileType === 'DRIVER') {
      await prisma.driver.update({
        where: { id: document.profileId },
        data: updateData,
      });
    }
  }

  return document;
}




module.exports = { submitDocument, getPendingDocuments, reviewDocument };