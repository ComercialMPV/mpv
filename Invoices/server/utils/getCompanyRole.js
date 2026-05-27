// utils/getCompanyRole.js
const getCompanyRole = async (roleName, companyId) => {
  return RolePermission.findOne({ 
    roleName, 
    company: companyId, 
    isActive: true 
  });
};