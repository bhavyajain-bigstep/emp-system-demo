import {
  Request,
  Response,
  NextFunction,
} from "express";

import { loginService } from "../services/auth.service";
import { logAuditEvent, AuditEventType } from "../services/audit-log.service";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(
      email,
      password
    );

    await logAuditEvent({
      eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
      actorId: result.user.id.toString(),
      actorRole: result.user.role,
      entityType: "EMPLOYEE",
      entityId: result.user.id.toString(),
      correlationId: (req as any).correlationId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    await logAuditEvent({
      eventType: AuditEventType.AUTH_LOGIN_FAILED,
      entityType: "EMPLOYEE",
      entityId: "unknown",
      metadata: { email: req.body.email },
      correlationId: (req as any).correlationId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    next(error);
  }
};