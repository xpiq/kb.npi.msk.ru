"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _koarouter = /*#__PURE__*/ _interop_require_default(require("koa-router"));
const _nodecrypto = require("node:crypto");
const _jsonwebtoken = /*#__PURE__*/ _interop_require_default(require("jsonwebtoken"));
const _constants = require("../../../../shared/constants");
const _types = require("../../../../shared/types");
const _files = require("../../../../shared/utils/files");
const _env = /*#__PURE__*/ _interop_require_default(require("../../../env"));
const _validations = require("../../../../shared/validations");
const _context = require("../../../context");
const _errors = require("../../../errors");
const _authentication = /*#__PURE__*/ _interop_require_default(require("../../../middlewares/authentication"));
const _rateLimiter = require("../../../middlewares/rateLimiter");
const _transaction = require("../../../middlewares/transaction");
const _validate = /*#__PURE__*/ _interop_require_default(require("../../../middlewares/validate"));
const _csrf = require("../../../utils/csrf");
const _models = require("../../../models");
const _AttachmentHelper = /*#__PURE__*/ _interop_require_default(require("../../../models/helpers/AttachmentHelper"));
const _policies = require("../../../policies");
const _presenters = require("../../../presenters");
const _UploadAttachmentFromUrlTask = /*#__PURE__*/ _interop_require_default(require("../../../queues/tasks/UploadAttachmentFromUrlTask"));
const _pagination = /*#__PURE__*/ _interop_require_default(require("../middlewares/pagination"));
const _database = require("../../../storage/database");
const _files1 = /*#__PURE__*/ _interop_require_default(require("../../../storage/files"));
const _BaseStorage = /*#__PURE__*/ _interop_require_default(require("../../../storage/files/BaseStorage"));
const _RateLimiter = require("../../../utils/RateLimiter");
const _validation = require("../../../validation");
const _schema = /*#__PURE__*/ _interop_require_wildcard(require("./schema"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
const router = new _koarouter.default();
router.post("attachments.list", (0, _authentication.default)(), (0, _pagination.default)(), (0, _validate.default)(_schema.AttachmentsListSchema), async (ctx)=>{
    const { documentId, userId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const where = {
        teamId: user.teamId
    };
    // If a specific user is passed then add to filters
    if (userId && user.isAdmin) {
        where.userId = userId;
    } else {
        where.userId = user.id;
    }
    // If a specific document is passed then add to filters
    if (documentId) {
        const document = await _models.Document.findByPk(documentId, {
            userId: user.id
        });
        (0, _policies.authorize)(user, "read", document);
        where.documentId = documentId;
    }
    const [attachments, total] = await Promise.all([
        _models.Attachment.findAll({
            where,
            order: [
                [
                    "createdAt",
                    "DESC"
                ]
            ],
            offset: ctx.state.pagination.offset,
            limit: ctx.state.pagination.limit
        }),
        _models.Attachment.count({
            where
        })
    ]);
    ctx.body = {
        pagination: {
            ...ctx.state.pagination,
            total
        },
        data: attachments.map(_presenters.presentAttachment),
        policies: (0, _presenters.presentPolicies)(user, attachments)
    };
});
router.post("attachments.create", (0, _rateLimiter.rateLimiter)(_RateLimiter.RateLimiterStrategy.TwentyFivePerMinute), (0, _authentication.default)(), (0, _validate.default)(_schema.AttachmentsCreateSchema), (0, _transaction.transaction)(), async (ctx)=>{
    const { id, name, documentId, contentType, size, preset } = ctx.input.body;
    const { auth, transaction } = ctx.state;
    const { user } = auth;
    if (documentId) {
        const document = await _models.Document.findByPk(documentId, {
            userId: user.id,
            transaction
        });
        (0, _policies.authorize)(user, "update", document);
    }
    // All user types can upload an avatar so no additional authorization is needed.
    if (preset === _types.AttachmentPreset.Avatar) {
        (0, _validation.assertIn)(contentType, _validations.AttachmentValidation.avatarContentTypes);
    } else {
        if (preset === _types.AttachmentPreset.WorkspaceImport) {
            (0, _policies.authorize)(user, "createImport", user.team);
        }
        if (preset === _types.AttachmentPreset.Emoji) {
            (0, _validation.assertIn)(contentType, _validations.AttachmentValidation.emojiContentTypes);
        }
        (0, _policies.authorize)(user, "createAttachment", user.team);
    }
    const maxUploadSize = _AttachmentHelper.default.presetToMaxUploadSize(preset);
    if (size > maxUploadSize) {
        throw (0, _errors.ValidationError)(`Sorry, this file is too large – the maximum size is ${(0, _files.bytesToHumanReadable)(maxUploadSize)}`);
    }
    const modelId = id ?? (0, _nodecrypto.randomUUID)();
    const acl = _AttachmentHelper.default.presetToAcl(preset);
    const key = _AttachmentHelper.default.getKey({
        id: modelId,
        name,
        userId: user.id
    });
    const attachment = await _models.Attachment.createWithCtx(ctx, {
        id: modelId,
        key,
        acl,
        size,
        expiresAt: _AttachmentHelper.default.presetToExpiry(preset),
        contentType,
        documentId,
        teamId: user.teamId,
        userId: user.id
    });
    const uploadSig = _jsonwebtoken.default.sign({
        key,
        type: "attachment-upload"
    }, _env.default.SECRET_KEY, {
        expiresIn: 3600
    });
    ctx.body = {
        data: {
            mode: "post",
            uploadUrl: "/api/files.create",
            form: {
                key,
                sig: uploadSig,
                [_constants.CSRF.fieldName]: (0, _csrf.getTokenFromCookie)(ctx) || ""
            },
            attachment: {
                ...(0, _presenters.presentAttachment)(attachment),
                url: attachment.redirectUrl
            }
        }
    };
});
router.post("attachments.createFromUrl", (0, _rateLimiter.rateLimiter)(_RateLimiter.RateLimiterStrategy.TwentyFivePerMinute), (0, _authentication.default)(), (0, _validate.default)(_schema.AttachmentsCreateFromUrlSchema), async (ctx)=>{
    const { id, url, documentId, preset } = ctx.input.body;
    const { user, type } = ctx.state.auth;
    if (preset !== _types.AttachmentPreset.DocumentAttachment || !documentId) {
        throw (0, _errors.ValidationError)("Only document attachments can be created from a URL");
    }
    const document = await _models.Document.findByPk(documentId, {
        userId: user.id
    });
    (0, _policies.authorize)(user, "update", document);
    const name = (0, _files.getFileNameFromUrl)(url) ?? "file";
    const modelId = id ?? (0, _nodecrypto.randomUUID)();
    const acl = _AttachmentHelper.default.presetToAcl(preset);
    const key = _AttachmentHelper.default.getKey({
        id: modelId,
        name,
        userId: user.id
    });
    // Does not use transaction middleware, as attachment must be persisted
    // before the job is scheduled.
    const attachment = await _database.sequelize.transaction(async (transaction)=>_models.Attachment.createWithCtx((0, _context.createContext)({
            authType: type,
            user,
            ip: ctx.ip,
            transaction
        }), {
            id: modelId,
            key,
            acl,
            size: 0,
            expiresAt: _AttachmentHelper.default.presetToExpiry(preset),
            contentType: "application/octet-stream",
            documentId,
            teamId: user.teamId,
            userId: user.id
        }));
    const job = await new _UploadAttachmentFromUrlTask.default().schedule({
        attachmentId: attachment.id,
        url
    });
    const response = await job.finished();
    if ("error" in response) {
        throw (0, _errors.InvalidRequestError)(response.error);
    }
    await attachment.reload();
    ctx.body = {
        data: (0, _presenters.presentAttachment)(attachment)
    };
});
router.post("attachments.delete", (0, _authentication.default)(), (0, _validate.default)(_schema.AttachmentDeleteSchema), (0, _transaction.transaction)(), async (ctx)=>{
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;
    const attachment = await _models.Attachment.findByPk(id, {
        rejectOnEmpty: true,
        lock: transaction.LOCK.UPDATE,
        transaction
    });
    if (attachment.documentId) {
        const document = await _models.Document.findByPk(attachment.documentId, {
            userId: user.id,
            transaction
        });
        (0, _policies.authorize)(user, "update", document);
    }
    (0, _policies.authorize)(user, "delete", attachment);
    await attachment.destroyWithCtx(ctx);
    ctx.body = {
        success: true
    };
});
const handleAttachmentsRedirect = async (ctx)=>{
    const id = ctx.input.body.id ?? ctx.input.query.id;
    const user = ctx.state.auth?.user;
    const attachment = await _models.Attachment.findByPk(id, {
        rejectOnEmpty: true
    });
    // Private attachments are accessible to any member of the workspace they
    // belong to. This is intentional and not a permission bypass – attachments
    // are owned by the workspace (team), not by individual documents. Checking
    // document-level permissions here would be insufficient anyway as attachments
    // can exist independently of documents.
    if (attachment.isPrivate && attachment.teamId !== user?.teamId) {
        throw (0, _errors.AuthorizationError)();
    }
    await attachment.update({
        lastAccessedAt: new Date()
    }, {
        silent: true
    });
    if (attachment.isStoredInPublicBucket) {
        ctx.set("Cache-Control", `max-age=604800, immutable`);
        ctx.redirect(attachment.canonicalUrl);
    } else {
        ctx.set("Cache-Control", `max-age=${_BaseStorage.default.defaultSignedUrlExpires}, immutable`);
        ctx.redirect(await attachment.signedUrl);
    }
};
router.register("attachments.redirect", [
    "get",
    "post"
], [
    (0, _authentication.default)({
        optional: true
    }),
    (0, _validate.default)(_schema.AttachmentsRedirectSchema),
    handleAttachmentsRedirect
]);
const _default = router;
