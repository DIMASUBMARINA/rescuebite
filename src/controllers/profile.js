const profileService = require('../services/profile');

async function createProfile(req, res, next) {
  try {
    const { userRole, userId } = req;
    let profile;

    switch (userRole) {
      case 'RESTAURANT':
        profile = await profileService.createRestaurant(userId, req.body);
        break;
      case 'SHELTER':
        profile = await profileService.createShelter(userId, req.body);
        break;
      case 'DRIVER':
        profile = await profileService.createDriver(userId, req.body);
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'CONSUMER and ADMIN roles do not require profiles',
        });
    }

    res.status(201).json({ status: 'success', data: profile });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProfile };