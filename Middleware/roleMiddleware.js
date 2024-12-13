// import Roles from "../Roles.js";

// const Authorized =
//   (...allowedRoles) =>
//   (req, res, next) => {
//     const userRole = req.user.role;

//     if (!allowedRoles.includes(userRole)) {
//       return res.status(403).json({
//         message: "You do not have permission to access this resource",
//       });
//     }

//     next();
//   };

// export default Authorized;
