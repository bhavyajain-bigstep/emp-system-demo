import { Holiday } from "../models/holiday.model";

export const calculateLeaveDays =
  async (
    fromDate: Date,
    toDate: Date,
    excludeWeekends: boolean,
    excludeMandatoryHolidays: boolean
  ): Promise<number> => {
    let days = 0;

    const current = new Date(
      fromDate
    );

    while (
      current <= toDate
    ) {
      const dayOfWeek =
        current.getDay();

      const isWeekend =
        dayOfWeek === 0 ||
        dayOfWeek === 6;

      if (
        excludeWeekends &&
        isWeekend
      ) {
        current.setDate(
          current.getDate() + 1
        );

        continue;
      }

      if (
        excludeMandatoryHolidays
      ) {
        const startOfDay =
          new Date(current);

        startOfDay.setHours(
          0,
          0,
          0,
          0
        );

        const endOfDay =
          new Date(current);

        endOfDay.setHours(
          23,
          59,
          59,
          999
        );

        const holiday =
          await Holiday.findOne({
            date: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
            optional: false,
          });

        if (holiday) {
          current.setDate(
            current.getDate() + 1
          );

          continue;
        }
      }

      days += 1;

      current.setDate(
        current.getDate() + 1
      );
    }

    return days;
  };