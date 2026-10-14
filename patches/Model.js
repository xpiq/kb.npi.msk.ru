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
const _fastdeepequal = /*#__PURE__*/ _interop_require_default(require("fast-deep-equal"));
const _compat = require("es-toolkit/compat");
const _sequelize = require("sequelize");
const _sequelizetypescript = require("sequelize-typescript");
const _Logger = /*#__PURE__*/ _interop_require_default(require("../../logging/Logger"));
const _Changeset = require("../decorators/Changeset");
const _errors = require("../../errors");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function contextFromCtx(ctx) {
    return ctx.context ?? {
        auth: ctx.state?.auth,
        transaction: ctx.state?.transaction,
        ip: ctx.request?.ip
    };
}
let Model = class Model extends _sequelizetypescript.Model {
    /**
   * Validates this instance, and if the validation passes, persists it to the database.
   */ saveWithCtx(ctx, options, eventOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        return this.save({
            ...options,
            ...hookContext
        });
    }
    /**
   * This is the same as calling `set` and then calling `save`.
   */ updateWithCtx(ctx, keys, eventOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        this.set(keys);
        return this.save(hookContext);
    }
    /**
   * Destroy the row corresponding to this instance. Depending on your setting for paranoid, the row will
   * either be completely deleted, or have its deletedAt timestamp set to the current time.
   */ destroyWithCtx(ctx, eventOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        return this.destroy(hookContext);
    }
    /**
   * Restore the row corresponding to this instance. Only available for paranoid models.
   */ restoreWithCtx(ctx, eventOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        return this.restore(hookContext);
    }
    /**
   * Find a row that matches the query, or build and save the row if none is found.
   * The successful result of the promise will be (instance, created) - Make sure to use `.then(([...]))`
   *
   * @param ctx The API context.
   * @param options The find or create options.
   * @param eventOpts Optional event override options.
   * @returns a tuple of the instance and a boolean indicating if it was created.
   */ static async findOrCreateWithCtx(ctx, options, eventOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        const transaction = context.transaction;
        // First, try to find an existing record
        const existing = await this.findOne({
            where: options.where,
            transaction
        });
        if (existing) {
            return [
                existing,
                false
            ];
        }
        // Record not found, try to create it
        try {
            const created = await this.create(Object.assign({}, options.defaults, options.where), {
                ...hookContext,
                transaction
            });
            return [
                created,
                true
            ];
        } catch (err) {
            // Handle race condition: another request created the record first
            if (err instanceof _sequelize.UniqueConstraintError) {
                const found = await this.findOne({
                    where: options.where,
                    transaction,
                    rejectOnEmpty: true
                });
                return [
                    found,
                    false
                ];
            }
            throw err;
        }
    }
    /**
   * Destroys every row that matches the given options, publishing an event for
   * each. Rows are matched when the destroy runs, so rows written after the
   * options were prepared are destroyed too.
   *
   * @param ctx The API context.
   * @param options The destroy options.
   * @param eventOpts Optional event override options.
   * @returns the number of destroyed rows.
   */ static destroyWithCtx(ctx, options, eventOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            ...options,
            individualHooks: true,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        return this.destroy(hookContext);
    }
    /**
   * Builds a new model instance and calls save on it.
   */ static createWithCtx(ctx, values, eventOpts, createOpts) {
        const context = contextFromCtx(ctx);
        const hookContext = {
            ...context,
            ...createOpts,
            event: {
                ...eventOpts,
                publish: true
            }
        };
        return this.create(values, hookContext);
    }
    static async beforeSaveEvent(model) {
        model.cacheChangeset();
    }
    static async afterCreateEvent(model, context) {
        await this.insertEvent("create", model, context);
    }
    static async afterUpsertEvent(model, context) {
        await this.insertEvent("create", model, context);
    }
    static async afterUpdateEvent(model, context) {
        await this.insertEvent("update", model, context);
    }
    static async afterDestroyEvent(model, context) {
        await this.insertEvent("delete", model, context);
    }
    static async afterRestoreEvent(model, context) {
        await this.insertEvent("create", model, context);
    }
    /**
   * Insert an event into the database recording a mutation to this model.
   *
   * @param name The name of the event.
   * @param model The model that was mutated.
   * @param context The API context.
   */ static async insertEvent(name, model, context) {
        const namespace = this.eventNamespace ?? this.tableName;
        const models = this.sequelize.models;
        if (!context.event?.publish) {
            return;
        }
        if (!context.transaction) {
            _Logger.default.warn("No transaction provided to insertEvent", {
                modelId: model.id
            });
        }
        if (!context.ip) {
            _Logger.default.warn("No ip provided to insertEvent", {
                modelId: model.id
            });
        }
        if (context.event.name?.includes(".")) {
            throw (0, _errors.InternalError)(`Event name (${context.event.name}) should not include a period, the namespace is automatically prefixed`);
        }
        const collectionId = "collectionId" in model ? model.collectionId : model instanceof models.collection ? model.id : undefined;
        const documentId = "documentId" in model ? model.documentId : model instanceof models.document ? model.id : undefined;
        let teamId = "teamId" in model ? model.teamId : model instanceof models.team ? model.id : context.auth?.user?.teamId;
        // Membership-style models (e.g. UserMembership, GroupMembership) carry no
        // teamId of their own, so derive it from the associated document or
        // collection when the mutating context has no authenticated team. This
        // guarantees events are never persisted without a team.
        if (!teamId && (documentId || collectionId)) {
            const parent = documentId ? await models.document.unscoped().findByPk(documentId, {
                attributes: [
                    "teamId"
                ],
                paranoid: false,
                transaction: context.transaction
            }) : await models.collection.unscoped().findByPk(collectionId, {
                attributes: [
                    "teamId"
                ],
                paranoid: false,
                transaction: context.transaction
            });
            teamId = parent?.getDataValue("teamId") ?? teamId;
        }
        const attrs = {
            name: `${namespace}.${context.event.name ?? name}`,
            modelId: "modelId" in model ? model.modelId : model.id,
            collectionId,
            documentId,
            userId: "userId" in model ? model.userId : model instanceof models.user ? model.id : undefined,
            teamId,
            actorId: context.auth?.user?.id ?? (model instanceof models.user && name === "create" ? model.id : undefined),
            authType: context.auth?.type,
            ip: context.ip,
            changes: model.previousChangeset,
            data: context.event.data
        };
        if (context.event?.persist !== false) {
            return models.event.create(attrs, {
                transaction: context.transaction
            });
        } else if (context.transaction) {
            (context.transaction.parent || context.transaction).afterCommit(()=>// @ts-expect-error Event class
                models.event.schedule(attrs));
        } else {
            // @ts-expect-error Event class
            return models.event.schedule(attrs);
        }
    }
    /**
   * Find all models in batches, calling the callback function for each batch.
   *
   * @param query The query options.
   * @param callback The function to call for each batch of results
   * @return The total number of results processed.
   */ static async findAllInBatches(query, callback) {
        const { batchLimit = 10, totalLimit = Infinity, offset, ...rest } = query;
        // A raw query with an explicit order is trusted to be unique (it may
        // select aggregates where the primary key is unavailable), otherwise
        // append the primary key column(s) to guarantee a total, stable order.
        const order = [
            ...rest.order ?? []
        ];
        if (!rest.raw || order.length === 0) {
            for (const pk of this.primaryKeyAttributes){
                if (!order.some(([column])=>column === pk)) {
                    order.push([
                        pk,
                        "ASC"
                    ]);
                }
            }
        }
        // The cursor columns must be selected for their values to be read back,
        // so add any missing ones when the caller restricts attributes.
        let attributes = rest.attributes;
        if (Array.isArray(attributes) && attributes.every((attr)=>typeof attr === "string")) {
            attributes = [
                ...new Set([
                    ...attributes,
                    ...order.map(([column])=>column)
                ])
            ];
        }
        const cursorValue = (row, column)=>typeof row.get === "function" ? row.get(column) : row[column];
        const buildCursor = (lastRow)=>({
                [_sequelize.Op.or]: order.map(([column, direction], index)=>{
                    const clause = {};
                    for (const [prevColumn] of order.slice(0, index)){
                        clause[prevColumn] = {
                            [_sequelize.Op.eq]: cursorValue(lastRow, prevColumn)
                        };
                    }
                    clause[column] = {
                        [direction === "DESC" ? _sequelize.Op.lt : _sequelize.Op.gt]: cursorValue(lastRow, column)
                    };
                    return clause;
                })
            });
        let cursor;
        let currentOffset = offset ?? 0;
        let total = 0;
        let limit;
        let results;
        do {
            limit = Math.min(batchLimit, totalLimit - total);
            const findOptions = {
                ...rest,
                attributes,
                order,
                limit,
                offset: currentOffset,
                where: cursor ? {
                    [_sequelize.Op.and]: [
                        rest.where ?? {},
                        cursor
                    ]
                } : rest.where
            };
            // @ts-expect-error this T
            results = await this.findAll(findOptions);
            total += results.length;
            await callback(results, findOptions);
            if (results.length > 0) {
                cursor = buildCursor(results[results.length - 1]);
            }
            // The cursor supersedes offset-based pagination after the first batch.
            currentOffset = 0;
        }while (results.length >= limit && total < totalLimit)
        return total;
    }
    /**
   * Returns a representation of the attributes that have changed since the last save and their previous values.
   *
   * @returns An object with `attributes` and `previousAttributes` keys.
   */ get changeset() {
        const changes = this.changed();
        const attributes = {};
        const previousAttributes = {};
        if (!changes) {
            return {
                attributes,
                previous: previousAttributes
            };
        }
        const virtualFields = this.constructor.virtualFields;
        const blobFields = this.constructor.blobFields;
        const skippedFields = (0, _Changeset.getChangesetSkipped)(this);
        for (const change of changes){
            const previous = this.previous(change);
            const current = this.getDataValue(change);
            if (virtualFields.includes(String(change)) || blobFields.includes(String(change)) || skippedFields.includes(String(change))) {
                continue;
            }
            if ((0, _compat.isObject)(previous) && (0, _compat.isObject)(current) && !(0, _compat.isArray)(previous) && !(0, _compat.isArray)(current)) {
                const difference = Object.keys(previous).concat(Object.keys(current))// @ts-expect-error TODO
                .filter((key)=>!(0, _fastdeepequal.default)(previous[key], current[key]));
                previousAttributes[change] = (0, _compat.pick)(previous, difference);
                attributes[change] = (0, _compat.pick)(current, difference);
            } else {
                previousAttributes[change] = previous;
                attributes[change] = current;
            }
        }
        return {
            attributes,
            previous: previousAttributes
        };
    }
    /**
   * Cache the current changeset for later use.
   */ cacheChangeset() {
        const previous = this.changeset;
        if (Object.keys(previous.attributes).length > 0 || Object.keys(previous.previous).length > 0) {
            this.previousChangeset = previous;
        }
    }
    /**
   * Returns the virtual fields for this model.
   */ static get virtualFields() {
        const attrs = this.rawAttributes;
        return Object.keys(attrs).filter((attr)=>attrs[attr].type instanceof _sequelize.DataTypes.VIRTUAL);
    }
    /**
   * Returns the blob fields for this model.
   */ static get blobFields() {
        const attrs = this.rawAttributes;
        return Object.keys(attrs).filter((attr)=>attrs[attr].type instanceof _sequelize.DataTypes.BLOB);
    }
};
/**
   * Disables Sequelize's public class field detection, which reports a false positive for the
   * per-instance accessors that sequelize-strict-attributes installs on attributes omitted from
   * a query's selection.
   */ Model._overwrittenAttributesChecked = true;
_ts_decorate([
    _sequelizetypescript.BeforeSave
], Model, "beforeSaveEvent", null);
_ts_decorate([
    _sequelizetypescript.AfterCreate
], Model, "afterCreateEvent", null);
_ts_decorate([
    _sequelizetypescript.AfterUpsert
], Model, "afterUpsertEvent", null);
_ts_decorate([
    _sequelizetypescript.AfterUpdate
], Model, "afterUpdateEvent", null);
_ts_decorate([
    _sequelizetypescript.AfterDestroy
], Model, "afterDestroyEvent", null);
_ts_decorate([
    _sequelizetypescript.AfterRestore
], Model, "afterRestoreEvent", null);
const _default = Model;
