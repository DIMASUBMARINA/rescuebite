const usersService = require('../services/users');

async function getProfile(req, res, next) {
  try {
    const user = await usersService.getById(req.userId);
    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { phone } = req.body;
    const user = await usersService.update(req.userId, { phone });
    res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
}

async function getAllergies(req, res, next) {
  try {
    const allergies = await usersService.getAllergies(req.userId);
    res.json({ status: 'success', data: allergies });
  } catch (err) {
    next(err);
  }
}

async function updateAllergies(req, res, next) {
  try {
    const { allergens } = req.body;
    const result = await usersService.updateAllergies(req.userId, allergens);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, getAllergies, updateAllergies };