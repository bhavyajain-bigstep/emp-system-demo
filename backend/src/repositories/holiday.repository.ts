import {
  Holiday,
  IHoliday,
} from "../models/holiday.model";

export const createHoliday =
  async (
    data: Partial<IHoliday>
  ): Promise<IHoliday> => {
    return Holiday.create(data);
  };

export const findAllHolidays =
  async (
    startDate?: Date,
    endDate?: Date
  ): Promise<IHoliday[]> => {
    const filter: {
      date?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {};

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        filter.date.$gte =
          startDate;
      }

      if (endDate) {
        filter.date.$lte =
          endDate;
      }
    }

    return Holiday.find(filter)
      .populate(
        "createdBy",
        "employeeCode name email"
      )
      .sort({
        date: 1,
      });
  };

export const findHolidayById =
  async (
    id: string
  ): Promise<IHoliday | null> => {
    return Holiday.findById(id)
      .populate(
        "createdBy",
        "employeeCode name email"
      );
  };

export const findHolidayByDate =
  async (
    date: Date
  ): Promise<IHoliday | null> => {
    return Holiday.findOne({
      date,
    });
  };

export const updateHoliday =
  async (
    id: string,
    data: Partial<IHoliday>
  ): Promise<IHoliday | null> => {
    return Holiday.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    ).populate(
      "createdBy",
      "employeeCode name email"
    );
  };

export const deleteHoliday =
  async (
    id: string
  ): Promise<IHoliday | null> => {
    return Holiday.findByIdAndDelete(
      id
    );
  };