const { DataTypes } = require("sequelize");
const { sequelize, Model, getTableConfigs } = require("../configs/mysql");
const bcrypt = require("bcryptjs");

class Users extends Model {
  // Set display name
  setDisplayName() {
    this.display_name = `${this.first_name} ${this.last_name}`;
  }
  // verify password
  isValidPassword(password) {
    return bcrypt.compareSync(password, this.password);
  }
}

Users.init(
  {
    first_name: {
      type: DataTypes.STRING(35),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(35),
      allowNull: false,
    },
    display_name: {
      type: DataTypes.STRING(75),
    },
    email: {
      type: DataTypes.STRING(75),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(10),
    },
    bio: {
      type: DataTypes.TEXT,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue("password", bcrypt.hashSync(value, 10));
      },
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    ...getTableConfigs(sequelize, "users"),
    hooks: {
      beforeCreate: (user) => {
        user.setDisplayName();
      },
    },
  }
);

Users.associate = (models) => {
  Users.hasMany(models.EmailSendHistory, {
    foreignKey: "user_id",
    sourceKey: "id",
  });
};

module.exports = Users;
