import { Types } from "mongoose";

import { AppError } from "../errors/app-error";

import {
  createHoliday,
  deleteHoliday,
  findAllHolidays,
  findHolidayByDate,
  findHolidayById,
  updateHoliday,
} from "../repositories/holiday.repository";
import { logAuditEvent } from "./audit-log.service";

interface CreateHolidayInput {
  date: Date;
  name: string;
  optional: boolean;
  description?: string;
  createdBy: string;
}

export const createHolidayService =
  async (
    data: CreateHolidayInput
  ) => {
    if (
      !Types.ObjectId.isValid(
        data.createdBy
      )
    ) {
      throw new AppError(
        "Invalid creator ID",
        400,
        "INVALID_CREATOR_ID"
      );
    }

    const date =
      new Date(data.date);

    date.setHours(
      0,
      0,
      0,
      0
    );

    const existing =
      await findHolidayByDate(
        date
      );

    if (existing) {
      throw new AppError(
        "A holiday already exists for this date",
        409,
        "HOLIDAY_ALREADY_EXISTS"
      );
    }

    const newHoliday = await createHoliday({
      date,

      name: data.name,

      optional:
        data.optional,

      description:
        data.description,

      createdBy:
        new Types.ObjectId(
          data.createdBy
        ),
    });

    await logAuditEvent({
      actorId: data.createdBy,
      action: "HOLIDAY_CREATED",
      entityType: "HOLIDAY",
      entityId: newHoliday._id.toString(),
      newValue: newHoliday,
      metadata: { name: data.name, date, optional: data.optional },
    });

    return newHoliday;
  };

export const getHolidaysService =
  async (
    year?: number,
    month?: number
  ) => {
    let startDate:
      | Date
      | undefined;

    let endDate:
      | Date
      | undefined;

    if (year) {
      if (
        month &&
        month >= 1 &&
        month <= 12
      ) {
        startDate = new Date(
          year,
          month - 1,
          1
        );

        endDate = new Date(
          year,
          month,
          0,
          23,
          59,
          59,
          999
        );
      } else {
        startDate = new Date(
          year,
          0,
          1
        );

        endDate = new Date(
          year,
          11,
          31,
          23,
          59,
          59,
          999
        );
      }
    }

    return findAllHolidays(
      startDate,
      endDate
    );
  };

export const getHolidayService =
  async (
    id: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid holiday ID",
        400,
        "INVALID_HOLIDAY_ID"
      );
    }

    const holiday =
      await findHolidayById(id);

    if (!holiday) {
      throw new AppError(
        "Holiday not found",
        404,
        "HOLIDAY_NOT_FOUND"
      );
    }

    return holiday;
  };

export const updateHolidayService =
  async (
    id: string,
    data: {
      date?: Date;
      name?: string;
      optional?: boolean;
      description?: string;
    },
    actorId?: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid holiday ID",
        400,
        "INVALID_HOLIDAY_ID"
      );
    }

    const holiday =
      await findHolidayById(id);

    if (!holiday) {
      throw new AppError(
        "Holiday not found",
        404,
        "HOLIDAY_NOT_FOUND"
      );
    }

    const updateData = {
      ...data,
    };

    if (data.date) {
      const date =
        new Date(data.date);

      date.setHours(
        0,
        0,
        0,
        0
      );

      const existing =
        await findHolidayByDate(
          date
        );

      if (
        existing &&
        existing._id.toString() !== id
      ) {
        throw new AppError(
          "A holiday already exists for this date",
          409,
          "HOLIDAY_ALREADY_EXISTS"
        );
      }

      updateData.date = date;
    }

    const updated = await updateHoliday(
      id,
      updateData
    );

    await logAuditEvent({
      actorId,
      action: "HOLIDAY_UPDATED",
      entityType: "HOLIDAY",
      entityId: id,
      oldValue: holiday,
      newValue: updated,
    });

    return updated;
  };

export const deleteHolidayService =
  async (
    id: string,
    actorId?: string
  ) => {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new AppError(
        "Invalid holiday ID",
        400,
        "INVALID_HOLIDAY_ID"
      );
    }

    const holiday =
      await findHolidayById(id);

    if (!holiday) {
      throw new AppError(
        "Holiday not found",
        404,
        "HOLIDAY_NOT_FOUND"
      );
    }

    const deleted = await deleteHoliday(id);

    await logAuditEvent({
      actorId,
      action: "HOLIDAY_DELETED",
      entityType: "HOLIDAY",
      entityId: id,
      oldValue: holiday,
    });

    return deleted;
  };