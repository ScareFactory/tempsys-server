// backend/models/feature.js
module.exports = (sequelize, DataTypes) => {
  const Feature = sequelize.define("Feature", {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
  });
  Feature.associate = (models) => {
    Feature.belongsToMany(models.Company, {
      through: "company_features",
      foreignKey: "feature_id",
    });
  };
  return Feature;
};