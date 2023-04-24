const { DataTypes } = require("sequelize");
const { sequelize, Model, getTableConfigs } = require("../configs/mysql");
const { EMAIL_TYPES } = require("../constants");

class EmailSendHistory extends Model {}

EmailSendHistory.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    email_type: {
      type: DataTypes.ENUM(...Object.values(EMAIL_TYPES)),
      allowNull: false,
    },
    accepted_emails: {
      type: DataTypes.TEXT,
      get() {
        if (this.getDataValue("accepted_emails")) {
          try {
            return JSON.parse(this.getDataValue("accepted_emails"));
          } catch (error) {
            return null;
          }
        }
        return null;
      },
      set(value) {
        if (value?.length) {
          this.setDataValue("accepted_emails", JSON.stringify(value));
        }
      },
    },
    rejected_emails: {
      type: DataTypes.TEXT,
      get() {
        if (this.getDataValue("rejected_emails")) {
          try {
            return JSON.parse(this.getDataValue("rejected_emails"));
          } catch (error) {
            return null;
          }
        }
        return null;
      },
      set(value) {
        if (value?.length) {
          this.setDataValue("rejected_emails", JSON.stringify(value));
        }
      },
    },
    message_id: {
      type: DataTypes.STRING,
    },
    response_message: {
      type: DataTypes.TEXT,
    },
    envelope: {
      type: DataTypes.TEXT,
      get() {
        if (this.getDataValue("envelope")) {
          try {
            return JSON.parse(this.getDataValue("envelope"));
          } catch (error) {
            return null;
          }
        }
        return null;
      },
      set(value) {
        if (Object.keys(value)?.length) {
          this.setDataValue("envelope", JSON.stringify(value));
        }
      },
    },
    full_response: {
      type: DataTypes.TEXT,
      get() {
        if (this.getDataValue("full_response")) {
          try {
            return JSON.parse(this.getDataValue("full_response"));
          } catch (error) {
            return null;
          }
        }
        return null;
      },
      set(value) {
        if (Object.keys(value)?.length) {
          this.setDataValue("full_response", JSON.stringify(value));
        }
      },
    },
  },
  getTableConfigs(sequelize, "email_send_histories")
);

EmailSendHistory.associate = (models) => {
  EmailSendHistory.belongsTo(models.Users, {
    foreignKey: "user_id",
    targetKey: "id",
  });
};

EmailSendHistory.sync({ alter: true });
module.exports = EmailSendHistory;
