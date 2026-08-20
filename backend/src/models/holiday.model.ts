import {
  Document,
  Schema,
  Types,
  model,
} from "mongoose";

export interface IHoliday extends Document {
  date: Date;
  name: string;

  optional: boolean;

  description?: string;

  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema =
  new Schema<IHoliday>(
    {
      date: {
        type: Date,
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      optional: {
        type: Boolean,
        required: true,
        default: false,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * Only one holiday can exist
 * for a particular date.
 */
holidaySchema.index(
  {
    date: 1,
  },
  {
    unique: true,
  }
);

export const Holiday =
  model<IHoliday>(
    "Holiday",
    holidaySchema
  );