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
const _koa = /*#__PURE__*/ _interop_require_default(require("koa"));
const _koabody = /*#__PURE__*/ _interop_require_default(require("koa-body"));
const _koarouter = /*#__PURE__*/ _interop_require_default(require("koa-router"));
const _koauseragent = /*#__PURE__*/ _interop_require_default(require("koa-useragent"));
const _env = /*#__PURE__*/ _interop_require_default(require("../../env"));
const _errors = require("../../errors");
const _apiContext = require("../../middlewares/apiContext");
const _coaleseBody = /*#__PURE__*/ _interop_require_default(require("../../middlewares/coaleseBody"));
const _requestContext = /*#__PURE__*/ _interop_require_default(require("../../middlewares/requestContext"));
const _requestTracer = /*#__PURE__*/ _interop_require_default(require("../../middlewares/requestTracer"));
const _csrf = require("../../middlewares/csrf");
const _PluginManager = require("../../utils/PluginManager");
const _apiKeys = /*#__PURE__*/ _interop_require_default(require("./apiKeys"));
const _attachments = /*#__PURE__*/ _interop_require_default(require("./attachments"));
const _auth = /*#__PURE__*/ _interop_require_default(require("./auth"));
const _authenticationProviders = /*#__PURE__*/ _interop_require_default(require("./authenticationProviders"));
const _batch = /*#__PURE__*/ _interop_require_default(require("./batch"));
const _collections = /*#__PURE__*/ _interop_require_default(require("./collections"));
const _comments = /*#__PURE__*/ _interop_require_default(require("./comments/comments"));
const _cron = /*#__PURE__*/ _interop_require_default(require("./cron"));
const _developer = /*#__PURE__*/ _interop_require_default(require("./developer"));
const _documents = /*#__PURE__*/ _interop_require_default(require("./documents"));
const _emojis = /*#__PURE__*/ _interop_require_default(require("./emojis"));
const _events = /*#__PURE__*/ _interop_require_default(require("./events"));
const _fileOperations = /*#__PURE__*/ _interop_require_default(require("./fileOperations"));
const _groupMemberships = /*#__PURE__*/ _interop_require_default(require("./groupMemberships"));
const _groups = /*#__PURE__*/ _interop_require_default(require("./groups"));
const _imports = /*#__PURE__*/ _interop_require_default(require("./imports"));
const _installation = /*#__PURE__*/ _interop_require_default(require("./installation"));
const _integrations = /*#__PURE__*/ _interop_require_default(require("./integrations"));
const _apiErrorHandler = /*#__PURE__*/ _interop_require_default(require("./middlewares/apiErrorHandler"));
const _apiResponse = /*#__PURE__*/ _interop_require_default(require("./middlewares/apiResponse"));
const _editor = /*#__PURE__*/ _interop_require_default(require("./middlewares/editor"));
const _notifications = /*#__PURE__*/ _interop_require_default(require("./notifications"));
const _oauthAuthentications = /*#__PURE__*/ _interop_require_default(require("./oauthAuthentications"));
const _oauthClients = /*#__PURE__*/ _interop_require_default(require("./oauthClients"));
const _pins = /*#__PURE__*/ _interop_require_default(require("./pins"));
const _reactions = /*#__PURE__*/ _interop_require_default(require("./reactions"));
const _relationships = /*#__PURE__*/ _interop_require_default(require("./relationships"));
const _revisions = /*#__PURE__*/ _interop_require_default(require("./revisions"));
const _searches = /*#__PURE__*/ _interop_require_default(require("./searches"));
const _shares = /*#__PURE__*/ _interop_require_default(require("./shares"));
const _stars = /*#__PURE__*/ _interop_require_default(require("./stars"));
const _subscriptions = /*#__PURE__*/ _interop_require_default(require("./subscriptions"));
const _suggestions = /*#__PURE__*/ _interop_require_default(require("./suggestions"));
const _teams = /*#__PURE__*/ _interop_require_default(require("./teams"));
const _templates = /*#__PURE__*/ _interop_require_default(require("./templates"));
const _urls = /*#__PURE__*/ _interop_require_default(require("./urls"));
const _userMemberships = /*#__PURE__*/ _interop_require_default(require("./userMemberships"));
const _users = /*#__PURE__*/ _interop_require_default(require("./users"));
const _views = /*#__PURE__*/ _interop_require_default(require("./views"));
const _accessRequests = /*#__PURE__*/ _interop_require_default(require("./accessRequests"));
const _storageFiles = /*#__PURE__*/ _interop_require_default(require("../../../plugins/storage/server/api/files"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const api = new _koa.default();
const router = new _koarouter.default();
// middlewares
api.use((0, _requestContext.default)());
api.use((0, _koabody.default)({
    multipart: true,
    formidable: {
        maxFileSize: Math.max(_env.default.FILE_STORAGE_UPLOAD_MAX_SIZE, _env.default.FILE_STORAGE_IMPORT_MAX_SIZE),
        maxFieldsSize: 10 * 1024 * 1024
    },
    jsonLimit: 5 * 1024 * 1024
}));
api.use((0, _coaleseBody.default)());
api.use(_koauseragent.default);
api.use((0, _requestTracer.default)());
api.use((0, _apiResponse.default)());
api.use((0, _apiErrorHandler.default)());
api.use((0, _editor.default)());
api.use((0, _apiContext.apiContext)());
api.use((0, _csrf.verifyCSRFToken)());
// Register plugin API routes before others to allow for overrides
_PluginManager.PluginManager.getHooks(_PluginManager.Hook.API).forEach((hook)=>router.use("/", hook.value.routes()));
// routes
router.use("/", _storageFiles.default.routes());
router.use("/", _auth.default.routes());
router.use("/", _authenticationProviders.default.routes());
router.use("/", _batch.default.routes());
router.use("/", _events.default.routes());
router.use("/", _users.default.routes());
router.use("/", _collections.default.routes());
router.use("/", _comments.default.routes());
router.use("/", _documents.default.routes());
router.use("/", _accessRequests.default.routes());
router.use("/", _emojis.default.routes());
router.use("/", _pins.default.routes());
router.use("/", _revisions.default.routes());
router.use("/", _views.default.routes());
router.use("/", _apiKeys.default.routes());
router.use("/", _searches.default.routes());
router.use("/", _shares.default.routes());
router.use("/", _stars.default.routes());
router.use("/", _subscriptions.default.routes());
router.use("/", _suggestions.default.routes());
router.use("/", _teams.default.routes());
router.use("/", _templates.default.routes());
router.use("/", _integrations.default.routes());
router.use("/", _notifications.default.routes());
router.use("/", _oauthAuthentications.default.routes());
router.use("/", _oauthClients.default.routes());
router.use("/", _attachments.default.routes());
router.use("/", _cron.default.routes());
router.use("/", _groups.default.routes());
router.use("/", _groupMemberships.default.routes());
router.use("/", _fileOperations.default.routes());
router.use("/", _urls.default.routes());
router.use("/", _userMemberships.default.routes());
router.use("/", _reactions.default.routes());
router.use("/", _relationships.default.routes());
router.use("/", _imports.default.routes());
if (!_env.default.isCloudHosted) {
    router.use("/", _installation.default.routes());
}
if (_env.default.isDevelopment) {
    router.use("/", _developer.default.routes());
}
router.post("*", (ctx)=>{
    ctx.throw((0, _errors.NotFoundError)("Endpoint not found"));
});
router.get("*", (ctx)=>{
    ctx.throw((0, _errors.NotFoundError)("Endpoint not found"));
});
// Router is embedded in a Koa application wrapper, because koa-router does not
// allow middleware to catch any routes which were not explicitly defined.
api.use(router.routes());
api.use(router.allowedMethods());
const _default = api;
