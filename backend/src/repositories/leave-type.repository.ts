import {
  ILeaveType,
  LeaveType,
} from "../models/leave-type.model";

export const findLeaveTypes =
  async (): Promise<ILeaveType[]> => {
    return LeaveType.find()
      .sort({
        name: 1,
      })
      .lean() as unknown as Promise<ILeaveType[]>;
  };

export const findActiveLeaveTypes =
  async (): Promise<ILeaveType[]> => {
    return LeaveType.find({
      status: "ACTIVE",
    }).sort({
      name: 1,
    }).lean() as unknown as Promise<ILeaveType[]>;
  };

export const findLeaveTypeById =
  async (
    id: string
  ): Promise<ILeaveType | null> => {
    return LeaveType.findById(id).lean() as unknown as Promise<ILeaveType | null>;
  };

export const findLeaveTypeByCode =
  async (
    code: string
  ): Promise<ILeaveType | null> => {
    return LeaveType.findOne({
      code: code.toUpperCase(),
    }).lean() as unknown as Promise<ILeaveType | null>;
  };

export const findLeaveTypeByName =
  async (
    name: string
  ): Promise<ILeaveType | null> => {
    return LeaveType.findOne({
      name: name.trim(),
    }).lean() as unknown as Promise<ILeaveType | null>;
  };

export const createLeaveType =
  async (
    data: Partial<ILeaveType>
  ): Promise<ILeaveType> => {
    return LeaveType.create(data);
  };

export const updateLeaveType =
  async (
    id: string,
    data: Partial<ILeaveType>
  ): Promise<ILeaveType | null> => {
    return LeaveType.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  };

export const deleteLeaveType =
  async (
    id: string
  ): Promise<ILeaveType | null> => {
    return LeaveType.findByIdAndDelete(id);
  };