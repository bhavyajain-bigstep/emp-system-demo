import { Request, Response, NextFunction } from "express";

import { loginService, refreshAccessTokenService, logoutService } from "../services/auth.service";
import { env } from "../config/env";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);

    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
        error: { code: "REFRESH_TOKEN_MISSING" },
      });
    }

    const result = await refreshAccessTokenService(refreshToken);

    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    // clear cookie on failure
    res.clearCookie("refreshToken", { ...cookieOptions, maxAge: 0 });
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      // we could decode to get userId but logoutService expects userId
      // Instead, we can attempt to verify to get userId
      const { verifyRefreshToken } = await import("../utils/jwt");
      try {
        const payload = verifyRefreshToken(refreshToken);
        await logoutService(payload.userId);
      } catch {
        // ignore invalid token
      }
    }
    res.clearCookie("refreshToken", { ...cookieOptions, maxAge: 0 });
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    next(error);
  }
};