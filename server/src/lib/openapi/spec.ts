import type { OpenAPIV3 } from "openapi-types";

export function buildOpenApiSpec(baseUrl: string): OpenAPIV3.Document {
  return {
    openapi: "3.0.3",
    info: {
      title: "BadgeNest API",
      version: "1.0.0",
      description: "BadgeNest backend API (Node.js + Express + Prisma + SQL Server).",
    },
    servers: [{ url: baseUrl }],
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Data" },
      { name: "Admin" },
      { name: "Verify" },
      { name: "Invites" },
      { name: "Notifications" },
      { name: "Uploads" },
      { name: "Views" },
      { name: "Docs" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" }, details: {} },
          required: ["error"],
          additionalProperties: true,
        },
      },
    },
    paths: {
      "/api/docs": {
        get: { tags: ["Docs"], summary: "Swagger UI", responses: { "200": { description: "HTML" } } },
      },
      "/api/openapi.json": {
        get: { tags: ["Docs"], summary: "OpenAPI JSON", responses: { "200": { description: "OpenAPI JSON" } } },
      },

      "/api/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Sign up",
          description:
            "When EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM are set, creates an unverified account and sends a verification email. Without email config, the account is created as verified and the response includes a JWT `token` for immediate use.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6 },
                    full_name: { type: "string" },
                  },
                  required: ["email", "password"],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            "201": { description: "Created" },
            "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "409": { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                  required: ["email", "password"],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
            "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": {
              description: "Email not verified (only when email verification is enabled)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/auth/session": {
        get: {
          tags: ["Auth"],
          summary: "Current session (nullable)",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/auth/update-password": {
        patch: {
          tags: ["Auth"],
          summary: "Update password",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", properties: { password: { type: "string", minLength: 6 } }, required: ["password"], additionalProperties: false } } },
          },
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
        },
      },
      "/api/auth/verify-email": {
        get: {
          tags: ["Auth"],
          summary: "Verify account email using token",
          parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Verified" },
            "400": { description: "Invalid/expired token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/auth/resend-verification": {
        post: {
          tags: ["Auth"],
          summary: "Resend verification email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },

      "/api/users/me": {
        get: { tags: ["Users"], summary: "Get my profile", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        patch: {
          tags: ["Users"],
          summary: "Update my profile",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { "200": { description: "OK" } },
        },
      },

      "/api/data/issuers": {
        get: { tags: ["Data"], summary: "List issuers", responses: { "200": { description: "OK" } } },
        post: { tags: ["Data"], summary: "Create issuer (admin)", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
      },
      "/api/data/issuers/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: { tags: ["Data"], summary: "Get issuer", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
        patch: { tags: ["Data"], summary: "Update issuer (admin)", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Data"], summary: "Delete issuer (admin)", security: [{ bearerAuth: [] }], responses: { "204": { description: "No Content" } } },
      },
      "/api/data/badge-classes": {
        get: { tags: ["Data"], summary: "List badge classes", responses: { "200": { description: "OK" } } },
        post: { tags: ["Data"], summary: "Create badge class (admin)", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
      },
      "/api/data/badge-classes/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: { tags: ["Data"], summary: "Get badge class", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
        patch: { tags: ["Data"], summary: "Update badge class (admin)", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Data"], summary: "Delete badge class (admin)", security: [{ bearerAuth: [] }], responses: { "204": { description: "No Content" } } },
      },
      "/api/data/assertions": {
        get: { tags: ["Data"], summary: "List my assertions", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        post: { tags: ["Data"], summary: "Create assertion (admin)", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
      },
      "/api/data/assertions/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: { tags: ["Data"], summary: "Get assertion", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        patch: { tags: ["Data"], summary: "Update assertion (admin)", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Data"], summary: "Delete assertion (admin)", security: [{ bearerAuth: [] }], responses: { "204": { description: "No Content" } } },
      },

      "/api/admin/dashboard-stats": {
        get: { tags: ["Admin"], summary: "Dashboard stats", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
      },
      "/api/admin/assertions": {
        get: { tags: ["Admin"], summary: "Admin assertions list", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
      },
      "/api/admin/learners": {
        get: { tags: ["Admin"], summary: "Learners list", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
      },
      "/api/admin/audit-logs": {
        get: { tags: ["Admin"], summary: "Audit logs list", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        post: { tags: ["Admin"], summary: "Create audit log (authenticated)", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
      },
      "/api/admin/webhooks": {
        get: { tags: ["Admin"], summary: "List webhooks", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        post: { tags: ["Admin"], summary: "Create webhook", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
      },
      "/api/admin/webhooks/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        patch: { tags: ["Admin"], summary: "Update webhook", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        delete: { tags: ["Admin"], summary: "Delete webhook", security: [{ bearerAuth: [] }], responses: { "204": { description: "No Content" } } },
      },
      "/api/admin/api-keys": {
        get: { tags: ["Admin"], summary: "List API keys", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        post: { tags: ["Admin"], summary: "Create API key", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
      },
      "/api/admin/api-keys/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        patch: { tags: ["Admin"], summary: "Revoke API key", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
      },
      "/api/admin/promote": {
        post: {
          tags: ["Admin"],
          summary: "Promote existing user to admin by email",
          description:
            "Requires an existing admin JWT. If no admins exist yet, you can bootstrap the first admin by sending x-bootstrap-secret matching ADMIN_BOOTSTRAP_SECRET.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "x-bootstrap-secret",
              in: "header",
              required: false,
              schema: { type: "string" },
              description: "Bootstrap-only when there are no admins yet.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
            "403": {
              description: "Forbidden",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "404": {
              description: "User not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },

      "/api/verify/{assertionId}": {
        parameters: [{ name: "assertionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: { tags: ["Verify"], summary: "Verify badge assertion (public)", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
      },
      "/api/views/record": {
        post: { tags: ["Views"], summary: "Record a badge view", requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { assertion_id: { type: "string", format: "uuid" } }, required: ["assertion_id"], additionalProperties: false } } } }, responses: { "201": { description: "Created" } } },
      },
      "/api/invites/{token}": {
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
        get: { tags: ["Invites"], summary: "Get invite by token", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
      },
      "/api/invites/claim": {
        post: { tags: ["Invites"], summary: "Claim an invite", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
      },
      "/api/notifications": {
        get: { tags: ["Notifications"], summary: "List my notifications", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
        patch: { tags: ["Notifications"], summary: "Mark notifications read", security: [{ bearerAuth: [] }], responses: { "200": { description: "OK" } } },
      },
      "/api/profile/{userId}": {
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: { tags: ["Users"], summary: "Public profile", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
      },
      "/api/upload": {
        post: { tags: ["Uploads"], summary: "Upload image (base64)", security: [{ bearerAuth: [] }], parameters: [{ name: "bucket", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      },
    },
  };
}
