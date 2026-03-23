import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import * as auth from "../controllers/authController.js";
import * as user from "../controllers/userController.js";
import * as data from "../controllers/dataController.js";
import * as admin from "../controllers/adminController.js";
import * as notifications from "../controllers/notificationsController.js";
import * as pub from "../controllers/publicController.js";
import * as docs from "../controllers/docsController.js";

export const apiRouter = Router();

apiRouter.get("/docs", asyncHandler(docs.getDocsHtml));
apiRouter.get("/openapi.json", asyncHandler(docs.getOpenApiJson));

apiRouter.post(
  "/auth/signup",
  rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "auth:signup" }),
  asyncHandler(auth.postSignup)
);
apiRouter.post(
  "/auth/login",
  rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "auth:login" }),
  asyncHandler(auth.postLogin)
);
apiRouter.get("/auth/session", asyncHandler(auth.getSession));
apiRouter.patch("/auth/update-password", asyncHandler(auth.patchUpdatePassword));
apiRouter.post("/auth/update-password", asyncHandler(auth.patchUpdatePassword));
apiRouter.get("/auth/verify-email", asyncHandler(auth.getVerifyEmail));
apiRouter.post(
  "/auth/resend-verification",
  rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "auth:resendVerification" }),
  asyncHandler(auth.postResendVerification)
);

apiRouter.get("/users/me", asyncHandler(user.getMe));
apiRouter.patch("/users/me", asyncHandler(user.patchMe));

apiRouter.get("/data/issuers", asyncHandler(data.listIssuers));
apiRouter.post("/data/issuers", asyncHandler(data.postIssuer));
apiRouter.get("/data/issuers/:id", asyncHandler(data.getIssuer));
apiRouter.patch("/data/issuers/:id", asyncHandler(data.patchIssuer));
apiRouter.delete("/data/issuers/:id", asyncHandler(data.deleteIssuer));

apiRouter.get("/data/badge-classes", asyncHandler(data.listBadgeClasses));
apiRouter.post("/data/badge-classes", asyncHandler(data.postBadgeClass));
apiRouter.get("/data/badge-classes/:id", asyncHandler(data.getBadgeClass));
apiRouter.patch("/data/badge-classes/:id", asyncHandler(data.patchBadgeClass));
apiRouter.delete("/data/badge-classes/:id", asyncHandler(data.deleteBadgeClass));

apiRouter.get("/data/assertions", asyncHandler(data.listAssertionsMe));
apiRouter.post("/data/assertions", asyncHandler(data.postAssertion));
apiRouter.get("/data/assertions/:id", asyncHandler(data.getAssertionById));
apiRouter.patch("/data/assertions/:id", asyncHandler(data.patchAssertionById));
apiRouter.delete("/data/assertions/:id", asyncHandler(data.deleteAssertionById));

apiRouter.get("/admin/dashboard-stats", asyncHandler(admin.getDashboardStats));
apiRouter.get("/admin/assertions", asyncHandler(admin.getAdminAssertions));
apiRouter.get("/admin/learners", asyncHandler(admin.getLearners));
apiRouter.get("/admin/audit-logs", asyncHandler(admin.getAuditLogs));
apiRouter.post("/admin/audit-logs", asyncHandler(admin.postAuditLog));
apiRouter.get("/admin/webhooks", asyncHandler(admin.listWebhooks));
apiRouter.post("/admin/webhooks", asyncHandler(admin.postWebhook));
apiRouter.patch("/admin/webhooks/:id", asyncHandler(admin.patchWebhook));
apiRouter.delete("/admin/webhooks/:id", asyncHandler(admin.deleteWebhook));
apiRouter.get("/admin/api-keys", asyncHandler(admin.listApiKeys));
apiRouter.post("/admin/api-keys", asyncHandler(admin.postApiKey));
apiRouter.patch("/admin/api-keys/:id", asyncHandler(admin.revokeApiKey));
apiRouter.post("/admin/promote", asyncHandler(admin.postPromote));

apiRouter.get("/notifications", asyncHandler(notifications.listNotifications));
apiRouter.patch("/notifications", asyncHandler(notifications.patchNotifications));

apiRouter.get("/verify/:assertionId", asyncHandler(pub.getVerifyAssertion));
apiRouter.post("/views/record", asyncHandler(pub.postRecordView));
apiRouter.post("/invites/claim", asyncHandler(pub.postClaimInvite));
apiRouter.get("/invites/:token", asyncHandler(pub.getInviteByToken));
apiRouter.get("/profile/:userId", asyncHandler(pub.getPublicProfile));
apiRouter.post("/upload", asyncHandler(pub.postUpload));
