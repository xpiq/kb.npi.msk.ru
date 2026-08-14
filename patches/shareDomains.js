"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return shareDomains;
    }
});
const _sequelize = require("sequelize");
const _domains = require("../../shared/utils/domains");
const _env = /*#__PURE__*/ _interop_require_default(require("../env"));
const _models = require("../models");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function shareDomains() {
    return async function shareDomainsMiddleware(ctx, next) {
        const isCustomDomain = (0, _domains.parseDomain)(ctx.host).custom;
        if (_env.default.isDevelopment || isCustomDomain) {
            const share = await _models.Share.unscoped().findOne({
                where: {
                    domain: ctx.hostname,
                    published: true,
                    revokedAt: {
                        [_sequelize.Op.is]: null
                    }
                }
            });
            ctx.state.rootShare = share;
        }
        return next();
    };
}
