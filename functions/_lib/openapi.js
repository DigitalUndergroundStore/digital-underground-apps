const S = "https://digitalundergroundstore.com";
const Listing = {
  type: "object",
  properties: {
    id: { type: "string" }, status: { type: "string", enum: ["pending", "approved", "rejected", "unpublished"] },
    name: { type: "string" }, projectUrl: { type: "string" }, pitchShort: { type: "string" }, descriptionLong: { type: "string" },
    imageUrl: { type: "string" }, videoUrl: { type: "string" }, tags: { type: "array", items: { type: "string" } },
    pendingVideo: { type: "object", nullable: true }, pendingRevision: { type: "object", nullable: true, description: "An API edit to an approved listing waiting for owner approval (status: \"pending owner approval\"). The approved version stays live until the owner approves it." }, reasons: { type: "array", items: { type: "string" } },
    createdAt: { type: "integer" }, updatedAt: { type: "integer" },
  },
};
const Create = {
  type: "object",
  required: ["name", "projectUrl", "category", "pitchShort", "descriptionLong", "terms"],
  properties: {
    name: { type: "string", maxLength: 120 },
    projectUrl: { type: "string", format: "uri", description: "https link to the product (checkout stays on your site)" },
    category: { type: "string", enum: ["apps", "ai-tools", "games", "books", "templates", "other"] },
    pitchShort: { type: "string", maxLength: 280, description: "One-sentence tagline" },
    descriptionLong: { type: "string", maxLength: 4000 },
    priceLabel: { type: "string", maxLength: 40, example: "$9" },
    tags: { oneOf: [{ type: "array", items: { type: "string" }, maxItems: 6 }, { type: "string" }] },
    makerName: { type: "string", maxLength: 80, description: "Defaults to your account name" },
    xHandle: { type: "string", maxLength: 16 },
    imageUrl: { type: "string", description: "https image URL (required unless imageData is sent)" },
    imageData: { type: "string", description: "data:image/(jpeg|png|webp|gif);base64,... max ~750 KB" },
    videoUrl: { type: "string", description: "Optional https YouTube/Vimeo/.mp4/.webm link; goes live after owner review" },
    terms: { type: "boolean", description: "Must be true: you accept the listing terms at /community/submit/" },
  },
};
const Update = { type: "object", description: "Send only the fields you want to change.", properties: { name: Create.properties.name, projectUrl: Create.properties.projectUrl, pitchShort: Create.properties.pitchShort, descriptionLong: Create.properties.descriptionLong, tags: Create.properties.tags, imageUrl: Create.properties.imageUrl, imageData: Create.properties.imageData, videoUrl: Create.properties.videoUrl, removeMedia: { type: "boolean" } } };
const err = { description: "Error", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } };
export const OPENAPI = {
  openapi: "3.0.3",
  info: {
    title: "Digital Underground Creator Listings API", version: "1.0.0",
    description: "Create and manage your own Developer Marketplace listings. Every new listing is screened automatically and then waits for owner approval before it is public. Updates are re-screened; approved listings stay live while changes are reviewed. Writes are limited to 10 per hour and 50 per day per key. Human docs: " + S + "/community/api/",
  },
  servers: [{ url: S + "/api/v1" }],
  components: { securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "duk_…" } }, schemas: { Listing, Create, Update } },
  security: [{ bearer: [] }],
  paths: {
    "/listings": {
      get: { operationId: "listMyListings", summary: "List your listings", responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { listings: { type: "array", items: { $ref: "#/components/schemas/Listing" } } } } } } }, 401: err } },
      post: { operationId: "createListing", summary: "Submit a new listing (goes to the review queue)", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Create" } } } }, responses: { 201: { description: "Created (status pending or rejected)", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" }, listing: { $ref: "#/components/schemas/Listing" } } } } } }, 400: err, 401: err, 429: err } },
    },
    "/listings/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { operationId: "getListing", summary: "Get one of your listings and its review status", responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { listing: { $ref: "#/components/schemas/Listing" } } } } } }, 404: err } },
      patch: { operationId: "updateListing", summary: "Update one of your listings (re-screened)", description: "Edits to a listing that is not yet approved update it in place and it stays in the owner queue. Edits to an approved listing are stored as a pending revision: the approved version stays live unchanged, the response is 202 with status \"pending owner approval\", and the owner approves (applies) or rejects (discards) it. A newer edit replaces an older pending revision. 422 means the edit failed screening.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Update" } } } }, responses: { 200: { description: "Updated (listing was not yet approved; still waiting for owner approval)" }, 202: { description: "Edit to an approved listing saved as a pending revision: pending owner approval" }, 400: err, 404: err, 422: err, 429: err } },
    },
  },
};
