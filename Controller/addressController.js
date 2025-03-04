import { Address } from "../Model/Address.js";
import mongoose from "mongoose";
import statusCodeResponse from "../helpers/statusCodeResponse.js";

export const addUserAddress = async (req, res) => {
  const { myAddress, createdAt, isDefault } = req.body;
  const buyerId = req.user.id;
  const role = req.user.role;

  try {
    if (Number(role) !== 1) {
      return res.status(403).json({
        message: "Unauthorized: Only buyers (roleId = 1) can add an address",
      });
    }

    if (!myAddress) {
      return res.status(400).json({
        message: "Address is required",
        success: false,
      });
    }

    if (isDefault) {
      await Address.updateMany({ buyerId }, { $set: { isDefault: false } });
    }

    const address = await Address.create({
      myAddress,
      createdAt,
      buyerId,
      isDefault,
    });

    res.status(200).json({
      message: "Address added successfully",
      success: true,
      address: {
        _id: address._id,
        myAddress: address.myAddress,
        isDefault: address.isDefault,
        createdAt: address.createdAt,
      },
    });
  } catch (err) {
    console.error("Error while adding address", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const updateDefaultAddress = async (req, res) => {
  const aid = req.params.aid;
  const { id: buyerId } = req.user;
  // const buyerId = req.user.id;
  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await Address.updateMany(
      { buyerId, isDefault: true },
      { $set: { isDefault: false } },
      { session }
    );

    const updatedAddress = await Address.findByIdAndUpdate(
      aid,
      { isDefault: true },
      { new: true, session }
    );

    if (!updatedAddress) {
      await session.abortTransaction();
      return res
        .status(statusCodeResponse.notFound.code)
        .json({ message: statusCodeResponse.notFound.message });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      address: updatedAddress,
    });
  } catch (err) {
    console.error("Error updating default address:", err);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      error: err.message,
    });
  }
};

export const getUserAddress = async (req, res) => {
  const buyerId = req.user.id;
  const role = req.user.role;

  try {
    if (Number(role) !== 1) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
      });
    }

    const myAddress = await Address.find({ buyerId })
      .select("myAddress createdAt _id isDefault")
      .sort({ isDefault: -1 });

    if (myAddress.length === 0) {
      return res.status(statusCodeResponse.success.code).json({
        message: statusCodeResponse.success.message,
        success: true,
        data: { address: [] },
      });
    }

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      count: myAddress.length,
      data: myAddress,
    });
  } catch (err) {
    console.error("Error fetching addresses", err);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.code,
      error: err.message,
    });
  }
};

export const editUserAddress = async (req, res) => {
  try {
    const eid = req.params.eid;
    const userRole = req.user.role;
    // console.log("Edit ID", eid);
    if (Number(userRole) !== 1) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eid)) {
      return res
        .status(statusCodeResponse.badRequest.code)
        .json({ message: statusCodeResponse.badRequest.message });
    }

    if (req.body.isDefault) {
      await Address.updateMany(
        { buyerId: req.user.id },
        { $set: { isDefault: false } }
      );
    }

    const address = await Address.findByIdAndUpdate(
      eid,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!address) {
      return res
        .status(statusCodeResponse.notFound.code)
        .json({ message: statusCodeResponse.notFound.message });
    }

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
      data: address,
    });
  } catch (err) {
    console.error("Error editing address", err);
    res.status(statusCodeResponse.serverError.code).json({
      message: statusCodeResponse.serverError.message,
      error: err.message,
    });
  }
};

export const deleteUserAddress = async (req, res) => {
  try {
    const rid = req.params.rid;
    const userRole = req.user.role;
    if (Number(userRole) !== 1) {
      return res.status(statusCodeResponse.forbidden.code).json({
        message: statusCodeResponse.forbidden.message,
        success: false,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(rid)) {
      return res
        .status(statusCodeResponse.badRequest.code)
        .json({ message: statusCodeResponse.badRequest.message });
    }

    let address = await Address.findByIdAndDelete(rid);

    if (!address) {
      return res.status(statusCodeResponse.notFound.code).json({
        message: statusCodeResponse.notFound.message,
        success: false,
      });
    }

    res.status(statusCodeResponse.success.code).json({
      message: statusCodeResponse.success.message,
      success: true,
    });
  } catch (err) {
    console.log(err);
  }
};
