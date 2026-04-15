import mongoose, { type Document, Schema } from 'mongoose';

const MAX_LOGIN_HISTORY = 20;

export interface ILoginHistoryEntry {
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

export interface IAccountUser extends Document {
  email: string;
  passwordHash: string;
  loginCount: number;
  lastLoginAt?: Date;
  loginHistory: ILoginHistoryEntry[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  recordLogin(ip?: string, userAgent?: string): void;
}

const loginHistoryEntrySchema = new Schema<ILoginHistoryEntry>(
  {
    timestamp: { type: Date, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false },
);

const accountUserSchema = new Schema<IAccountUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    loginHistory: {
      type: [loginHistoryEntrySchema],
      default: [],
      validate: {
        validator(entries: ILoginHistoryEntry[]) {
          return entries.length <= MAX_LOGIN_HISTORY;
        },
        message: `loginHistory cannot exceed ${MAX_LOGIN_HISTORY} entries.`,
      },
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

/**
 * Record a login event, capping loginHistory to the most recent entries.
 */
accountUserSchema.methods.recordLogin = function (
  ip?: string,
  userAgent?: string,
) {
  this.loginCount += 1;
  this.lastLoginAt = new Date();
  this.loginHistory.push({
    timestamp: new Date(),
    ip,
    userAgent,
  });

  // Cap to most recent entries
  if (this.loginHistory.length > MAX_LOGIN_HISTORY) {
    this.loginHistory = this.loginHistory.slice(-MAX_LOGIN_HISTORY);
  }
};

export const AccountUser = mongoose.model<IAccountUser>(
  'AccountUser',
  accountUserSchema,
);
