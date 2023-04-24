const { Sequelize, Model } = require("sequelize");
const _ = require("lodash");

const sequelize = new Sequelize(
  process.env.MYSQL_DB_NAME,
  process.env.MYSQL_DB_USERNAME,
  process.env.MYSQL_DB_PASSWORD,
  {
    host: process.env.MYSQL_DB_HOST,
    port: process.env.MYSQL_DB_PORT,
    dialect: "mysql",
    pool: {
      min: 0, // Minimum number of connection in pool
      max: 5, // Maximum number of connection in pool
      idle: 10000, // The maximum time, in milliseconds, that a connection can be idle before being released.
      acquire: 60000, // The maximum time, in milliseconds, that pool will try to get connection before throwing error
      evict: 1000, // The time interval, in milliseconds, after which sequelize-pool will remove idle connections.
    },
  }
);

const getTableConfigs = (sequelize, tableName = "", excludeFields = []) => {
  return _.omit(
    {
      timestamps: true,
      sequelize,
      tableName: tableName,
      paranoid: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    },
    excludeFields
  );
};

module.exports = {
  sequelize,
  Model,
  getTableConfigs,
};
