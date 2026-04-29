const inventoryService = require('../services/inventory');

async function list(req, res, next) {
  try {
    const { state, page = 1, perPage = 20 } = req.query;
    const result = await inventoryService.list({ state, page: Number(page), perPage: Number(perPage) });
    res.json({ status: 'success', data: result.items, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const item = await inventoryService.create(req.userId, req.body);
    res.status(201).json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const item = await inventoryService.update(req.params.id, req.userId, req.body);
    res.json({ status: 'success', data: item });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await inventoryService.remove(req.params.id, req.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };