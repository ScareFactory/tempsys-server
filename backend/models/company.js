// backend/models/company.js

module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    "Company",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Füge hier bei Bedarf weitere Felder hinzu, z.B. Adresse, Kontakt, etc.
    },
    {
      tableName: "companies",
      timestamps: true, // oder false, je nach deiner Konvention
    }
  );

  Company.associate = (models) => {
    // Beziehung zu User (falls vorhanden)
    if (models.User) {
      Company.hasMany(models.User, {
        foreignKey: "companyId",
        onDelete: "CASCADE",
      });
    }

    // Many-to-Many zu Feature
    if (models.Feature) {
      Company.belongsToMany(models.Feature, {
        through: "company_features",
        foreignKey: "company_id",
      });
    }

    // Weitere Relationen hier…
  };

  return Company;
};
