module.exports = (sequelize, type) => {
  return sequelize.define('posts', {
    id: {
      type: type.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: type.INTEGER,
    post_name: type.STRING,
    description: type.TEXT,
    post_type: type.STRING,
    link_content: type.TEXT,
    created_by: type.INTEGER,
    is_portfolio_post:{
      type: type.ENUM('0','1'),
      defaultValue:'0'
    },
    is_job:{
      type: type.ENUM('0','1'),
      defaultValue:'0'
    },
    share_type: type.STRING,
    share_id: type.INTEGER,
  }
)}