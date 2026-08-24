import { Request, Response, NextFunction } from "express";

import {
  loginService,
  refreshAccessTokenService,
  logoutService,
} from "../services/auth.service";
import { env } from "../config/env";

const isProduction = env.NODE_ENV === "production";

const cookieDomain = isProduction ? undefined : "localhost";

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days,
  domain: cookieDomain,
};

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge: 15 * 60 * 1000, // 15 minutes,
  domain: cookieDomain,
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
}

function clearAuthCookies(res: Response) {
  const clearOptions = { maxAge: 0, domain: cookieDomain };
  res.clearCookie("accessToken", { ...accessCookieOptions, ...clearOptions });
  res.clearCookie("refreshToken", { ...refreshCookieOptions, ...clearOptions });
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
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
  next: NextFunction,
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

    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const { verifyRefreshToken } = await import("../utils/jwt");
      try {
        const payload = verifyRefreshToken(refreshToken);
        await logoutService(payload.userId);
      } catch {
        // ignore invalid token
      }
    }
    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    next(error);
  }
};
