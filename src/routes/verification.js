const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { submitDocument } = require('../services/verification');
const { prisma } = require('../config/database');

router.post('/submit', verifyToken, async (req, res, next) => {
  try {
    const { profileType, profileId, documentType, documentUrl } = req.body;
    
    const profile = await prisma[profileType.toLowerCase()].findUnique({
      where: { id: profileId },
    });
    
    if (!profile || profile.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const doc = await submitDocument(profileType, profileId, documentType, documentUrl);
    
    res.status(201).json({
      status: 'success',
      message: 'Document submitted for review',
      data: doc,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;