const { prisma } = require('../config/database');

async function log({
  entity,
  entityId,
  action,
  field = null,
  oldValue = null,
  newValue,
  changedBy,
  ipAddress = null,
}) {
  return prisma.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      field,
      oldValue: oldValue ? String(oldValue) : null,
      newValue: String(newValue),
      changedBy,
      ipAddress,
    },
  });
}

module.exports = { log };