"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _fs = require("fs");
var _path = _interopRequireDefault(require("path"));
var _sequelize = require("sequelize");
var _sequelizeTypescript = require("sequelize-typescript");
var _errors = require("./../errors");
var _files = _interopRequireDefault(require("./../storage/files"));
var _validation = require("./../validation");
var _Document = _interopRequireDefault(require("./Document"));
var _Team = _interopRequireDefault(require("./Team"));
var _User = _interopRequireDefault(require("./User"));
var _IdModel = _interopRequireDefault(require("./base/IdModel"));
var _Changeset = require("./decorators/Changeset");
var _Fix = _interopRequireDefault(require("./decorators/Fix"));
var _Length = _interopRequireDefault(require("./validators/Length"));
var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec0, _dec1, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _dec17, _dec18, _dec19, _dec20, _dec21, _dec22, _dec23, _dec24, _dec25, _dec26, _dec27, _dec28, _dec29, _dec30, _dec31, _class, _class2, _descriptor, _descriptor2, _descriptor3, _descriptor4, _descriptor5, _descriptor6, _descriptor7, _descriptor8, _descriptor9, _descriptor0, _descriptor1, _descriptor10;
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _initializerDefineProperty(e, i, r, l) { r && Object.defineProperty(e, i, { enumerable: r.enumerable, configurable: r.configurable, writable: r.writable, value: r.initializer ? r.initializer.call(l) : void 0 }); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _applyDecoratedDescriptor(i, e, r, n, l) { var a = {}; return Object.keys(n).forEach(function (i) { a[i] = n[i]; }), a.enumerable = !!a.enumerable, a.configurable = !!a.configurable, ("value" in a || a.initializer) && (a.writable = !0), a = r.slice().reverse().reduce(function (r, n) { return n(i, e, r) || r; }, a), l && void 0 !== a.initializer && (a.value = a.initializer ? a.initializer.call(l) : void 0, a.initializer = void 0), void 0 === a.initializer ? (Object.defineProperty(i, e, a), null) : a; }
function _initializerWarningHelper(r, e) { throw Error("Decorating class property failed. Please ensure that transform-class-properties is enabled and runs after the decorators transform."); }
let Attachment = (_dec = (0, _sequelizeTypescript.Table)({
  tableName: "attachments",
  modelName: "attachment"
}), _dec2 = (0, _Length.default)({
  max: 4096,
  msg: "key must be 4096 characters or less"
}), _dec3 = Reflect.metadata("design:type", String), _dec4 = (0, _Length.default)({
  max: 255,
  msg: "contentType must be 255 characters or less"
}), _dec5 = Reflect.metadata("design:type", String), _dec6 = (0, _sequelizeTypescript.Column)(_sequelizeTypescript.DataType.BIGINT), _dec7 = Reflect.metadata("design:type", Number), _dec8 = (0, _sequelizeTypescript.Default)("public-read"), _dec9 = (0, _sequelizeTypescript.IsIn)([["private", "public-read"]]), _dec0 = Reflect.metadata("design:type", String), _dec1 = Reflect.metadata("design:type", typeof Date === "undefined" ? Object : Date), _dec10 = Reflect.metadata("design:type", typeof Date === "undefined" ? Object : Date), _dec11 = Reflect.metadata("design:type", Function), _dec12 = Reflect.metadata("design:paramtypes", [Object]), _dec13 = Reflect.metadata("design:type", Function), _dec14 = Reflect.metadata("design:paramtypes", [Object]), _dec15 = Reflect.metadata("design:type", Function), _dec16 = Reflect.metadata("design:paramtypes", [Object]), _dec17 = (0, _sequelizeTypescript.BelongsTo)(() => _Team.default, "teamId"), _dec18 = Reflect.metadata("design:type", typeof _Team.default === "undefined" ? Object : _Team.default), _dec19 = (0, _sequelizeTypescript.ForeignKey)(() => _Team.default), _dec20 = (0, _sequelizeTypescript.Column)(_sequelizeTypescript.DataType.UUID), _dec21 = Reflect.metadata("design:type", String), _dec22 = (0, _sequelizeTypescript.BelongsTo)(() => _Document.default, "documentId"), _dec23 = Reflect.metadata("design:type", typeof _Document.default === "undefined" ? Object : _Document.default), _dec24 = (0, _sequelizeTypescript.ForeignKey)(() => _Document.default), _dec25 = (0, _sequelizeTypescript.Column)(_sequelizeTypescript.DataType.UUID), _dec26 = Reflect.metadata("design:type", String), _dec27 = (0, _sequelizeTypescript.BelongsTo)(() => _User.default, "userId"), _dec28 = Reflect.metadata("design:type", typeof _User.default === "undefined" ? Object : _User.default), _dec29 = (0, _sequelizeTypescript.ForeignKey)(() => _User.default), _dec30 = (0, _sequelizeTypescript.Column)(_sequelizeTypescript.DataType.UUID), _dec31 = Reflect.metadata("design:type", String), _dec(_class = (0, _Fix.default)(_class = (_class2 = class Attachment extends _IdModel.default {
  constructor() {
    super(...arguments);
    _initializerDefineProperty(this, "key", _descriptor, this);
    _initializerDefineProperty(this, "contentType", _descriptor2, this);
    _initializerDefineProperty(this, "size", _descriptor3, this);
    _initializerDefineProperty(this, "acl", _descriptor4, this);
    _initializerDefineProperty(this, "lastAccessedAt", _descriptor5, this);
    _initializerDefineProperty(this, "expiresAt", _descriptor6, this);
    // associations
    _initializerDefineProperty(this, "team", _descriptor7, this);
    _initializerDefineProperty(this, "teamId", _descriptor8, this);
    _initializerDefineProperty(this, "document", _descriptor9, this);
    _initializerDefineProperty(this, "documentId", _descriptor0, this);
    _initializerDefineProperty(this, "user", _descriptor1, this);
    _initializerDefineProperty(this, "userId", _descriptor10, this);
  }
  // getters

  /**
   * Get the original uploaded file name.
   */
  get name() {
    return _path.default.parse(this.key).base;
  }

  /**
   * Whether the attachment is private or not.
   */
  get isPrivate() {
    return this.acl === "private";
  }

  /**
   * Get the contents of this attachment as a readable stream.
   */
  get stream() {
    return _files.default.getFileStream(this.key);
  }

  /**
   * Get the contents of this attachment as a buffer.
   */
  get buffer() {
    return _files.default.getFileBuffer(this.key);
  }

  /**
   * Get a url that can be used to download the attachment if the user has a valid session.
   */
  get url() {
    return this.isPrivate ? this.redirectUrl : this.canonicalUrl;
  }

  /**
   * Get a url that can be used to download a private attachment if the user has a valid session.
   */
  get redirectUrl() {
    return Attachment.getRedirectUrl(this.id);
  }

  /**
   * Get a direct URL to the attachment in storage. Note that this will not work
   * for private attachments, a signed URL must be used.
   */
  get canonicalUrl() {
    return encodeURI(_files.default.getUrlForKey(this.key));
  }

  /**
   * Get a signed URL with the default expiry to download the attachment from storage.
   */
  get signedUrl() {
    return _files.default.getSignedUrl(this.key);
  }

  /**
   * Store the given file in storage at the location specified by the attachment key.
   * If the attachment already exists, an error will be thrown.
   *
   * @param file The file to store
   * @returns A promise resolving to the attachment
   */
  async writeFile(file) {
    return _files.default.store({
      body: (0, _fs.readFileSync)(file.filepath),
      contentLength: this.size || file.size,
      contentType: this.contentType,
      key: this.key,
      acl: this.acl
    });
  }

  // hooks

  static async sanitizeKey(model) {
    model.key = _validation.ValidateKey.sanitize(model.key);
    return model;
  }
  static async preventKeyChange(model) {
    if (model.changed("key")) {
      throw (0, _errors.ValidationError)("Cannot change the key of an attachment");
    }
  }
  static async deleteAttachmentFromS3(model) {
    await _files.default.deleteFile(model.key);
  }

  // static methods

  /**
   * Find an attachment by its key.
   *
   * @param key - The key of the attachment to find.
   * @param options - Additional options for the query.
   * @returns A promise resolving to the attachment with the given key, or null if not found.
   */
  static async findByKey(key, options) {
    return this.findOne({
      where: {
        key
      },
      ...options
    });
  }

  /**
   * Get the total size of all attachments for a given team.
   *
   * @param teamId - The ID of the team to get the total size for.
   * @returns A promise resolving to the total size of all attachments for the given team in bytes.
   */
  static async getTotalSizeForTeam(teamId) {
    const result = await this.sequelize.query(`
      SELECT SUM(size) as total
      FROM attachments
      WHERE "teamId" = :teamId
    `, {
      replacements: {
        teamId
      },
      type: _sequelize.QueryTypes.SELECT
    });
    return parseInt(result?.[0]?.total ?? "0", 10);
  }

  /**
   * Get the redirect URL for a private attachment. Use `attachment.redirectUrl` if you already have
   * an instance of the attachment.
   *
   * @param id The ID of the attachment to get the redirect URL for.
   * @returns The redirect URL for the attachment.
   */
  static getRedirectUrl(id) {
    return `/api/attachments.redirect?id=${id}`;
  }
}, _descriptor = _applyDecoratedDescriptor(_class2.prototype, "key", [_dec2, _sequelizeTypescript.Column, _dec3], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "contentType", [_dec4, _sequelizeTypescript.Column, _dec5], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "size", [_sequelizeTypescript.IsNumeric, _dec6, _dec7], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor4 = _applyDecoratedDescriptor(_class2.prototype, "acl", [_dec8, _dec9, _sequelizeTypescript.Column, _dec0], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor5 = _applyDecoratedDescriptor(_class2.prototype, "lastAccessedAt", [_sequelizeTypescript.Column, _Changeset.SkipChangeset, _dec1], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor6 = _applyDecoratedDescriptor(_class2.prototype, "expiresAt", [_sequelizeTypescript.Column, _dec10], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _applyDecoratedDescriptor(_class2, "sanitizeKey", [_sequelizeTypescript.BeforeCreate, _dec11, _dec12], Object.getOwnPropertyDescriptor(_class2, "sanitizeKey"), _class2), _applyDecoratedDescriptor(_class2, "preventKeyChange", [_sequelizeTypescript.BeforeUpdate, _dec13, _dec14], Object.getOwnPropertyDescriptor(_class2, "preventKeyChange"), _class2), _applyDecoratedDescriptor(_class2, "deleteAttachmentFromS3", [_sequelizeTypescript.BeforeDestroy, _dec15, _dec16], Object.getOwnPropertyDescriptor(_class2, "deleteAttachmentFromS3"), _class2), _descriptor7 = _applyDecoratedDescriptor(_class2.prototype, "team", [_dec17, _dec18], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor8 = _applyDecoratedDescriptor(_class2.prototype, "teamId", [_dec19, _dec20, _dec21], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor9 = _applyDecoratedDescriptor(_class2.prototype, "document", [_dec22, _dec23], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor0 = _applyDecoratedDescriptor(_class2.prototype, "documentId", [_dec24, _dec25, _dec26], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor1 = _applyDecoratedDescriptor(_class2.prototype, "user", [_dec27, _dec28], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _descriptor10 = _applyDecoratedDescriptor(_class2.prototype, "userId", [_dec29, _dec30, _dec31], {
  configurable: true,
  enumerable: true,
  writable: true,
  initializer: null
}), _class2)) || _class) || _class);
var _default = exports.default = Attachment;