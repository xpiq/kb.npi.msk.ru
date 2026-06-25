"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _path = _interopRequireDefault(require("path"));
var _https = _interopRequireDefault(require("https"));
var _nodeHttpHandler = require("@smithy/node-http-handler");
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _stream = require("stream");
var _clientS = require("@aws-sdk/client-s3");
var _libStorage = require("@aws-sdk/lib-storage");
require("@aws-sdk/signature-v4-crt");
var _s3PresignedPost = require("@aws-sdk/s3-presigned-post");
var _s3RequestPresigner = require("@aws-sdk/s3-request-presigner");
var _fsExtra = _interopRequireDefault(require("fs-extra"));
var _invariant = _interopRequireDefault(require("invariant"));
var _compact = _interopRequireDefault(require("lodash/compact"));
var _tmp = _interopRequireDefault(require("tmp"));
var _env = _interopRequireDefault(require("./../../env"));
var _Logger = _interopRequireDefault(require("./../../logging/Logger"));
var _BaseStorage = _interopRequireDefault(require("./BaseStorage"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt
class S3Storage extends _BaseStorage.default {
  constructor() {
    var _this;
    super();
    _this = this;
    _defineProperty(this, "store", async _ref => {
      let {
        body,
        contentLength,
        contentType,
        key,
        acl
      } = _ref;
      const filePath = this.getLocalFilePath(key);
      const exists = await _fsExtra.default.pathExists(filePath);
      if (exists) {
        throw new Error(`File already exists at ${key}`);
      }
      await _fsExtra.default.ensureDir(_path.default.dirname(filePath));
      const buffer = Buffer.isBuffer(body) ? body : await this.streamToBuffer(body);
      await _fsExtra.default.writeFile(filePath, buffer);
      return this.getUrlForKey(key);
    });
    _defineProperty(this, "getSignedUrl", async function (key) {
      let expiresIn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : S3Storage.defaultSignedUrlExpires;
      const sig = _jsonwebtoken.default.sign({
        type: "attachment",
        key
      }, _env.default.SECRET_KEY, {
        expiresIn
      });
      return `${_env.default.URL}/api/files.get?sig=${encodeURIComponent(sig)}`;
    });
    _defineProperty(this, "client", void 0);
    this.client = new _clientS.S3Client({
      bucketEndpoint: _env.default.AWS_S3_ACCELERATE_URL ? true : false,
      forcePathStyle: _env.default.AWS_S3_FORCE_PATH_STYLE,
      region: _env.default.AWS_REGION,
      endpoint: this.getEndpoint(),
      requestHandler: new _nodeHttpHandler.NodeHttpHandler({
        httpsAgent: new _https.default.Agent({ keepAlive: false }),
        connectionTimeout: 10000,
        socketTimeout: 30000
      })
    });
  }
  async getPresignedPost(key, acl, maxUploadSize) {
    let contentType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "image";
    const params = {
      Bucket: _env.default.AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
      Conditions: (0, _compact.default)([["content-length-range", 0, maxUploadSize], ["starts-with", "$Content-Type", contentType], ["starts-with", "$Cache-Control", ""]]),
      Fields: {
        "Content-Disposition": this.getContentDisposition(contentType),
        key,
        acl
      },
      Expires: 3600
    };
    return (0, _s3PresignedPost.createPresignedPost)(this.client, params);
  }
  getPublicEndpoint(isServerUpload) {
    if (_env.default.AWS_S3_ACCELERATE_URL) {
      return _env.default.AWS_S3_ACCELERATE_URL;
    }
    (0, _invariant.default)(_env.default.AWS_S3_UPLOAD_BUCKET_NAME, "AWS_S3_UPLOAD_BUCKET_NAME is required");

    // lose trailing slash if there is one and convert fake-s3 url to localhost
    // for access outside of docker containers in local development
    const isDocker = _env.default.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
    const host = _env.default.AWS_S3_UPLOAD_BUCKET_URL.replace("s3:", "localhost:").replace(/\/$/, "");

    // support old path-style S3 uploads and new virtual host uploads by checking
    // for the bucket name in the endpoint url before appending.
    const isVirtualHost = host.includes(_env.default.AWS_S3_UPLOAD_BUCKET_NAME);
    if (isVirtualHost) {
      return host;
    }
    return `${host}/${isServerUpload && isDocker ? "s3/" : ""}${_env.default.AWS_S3_UPLOAD_BUCKET_NAME}`;
  }
  getUploadUrl(isServerUpload) {
    return process.env.AWS_S3_UPLOAD_PROXY_URL || this.getPublicEndpoint(isServerUpload);
  }
  getUrlForKey(key) {
    return `/api/files.get?key=${encodeURIComponent(key)}`;
  }
  async deleteFile(key) {
    const localPath = this.getLocalFilePath(key);
    if (await _fsExtra.default.pathExists(localPath)) {
      await _fsExtra.default.remove(localPath);
      return;
    }
    const meta = await this.getChunkMeta(key);
    if (meta) {
      for (let index = 0; index < meta.chunks; index++) {
        await this.client.send(new _clientS.DeleteObjectCommand({
          Bucket: this.getBucket(),
          Key: this.getChunkKey(key, index)
        }));
      }
      await this.client.send(new _clientS.DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: this.getMetaKey(key)
      }));
      return;
    }
    await this.client.send(new _clientS.DeleteObjectCommand({
      Bucket: this.getBucket(),
      Key: key
    }));
  }
  getFileHandle(key) {
    return new Promise((resolve, reject) => {
      const localPath = this.getLocalFilePath(key);
      void _fsExtra.default.pathExists(localPath).then(exists => {
        if (exists) {
          resolve({
            path: localPath,
            cleanup: async () => {}
          });
        }
      }).catch(reject);
      _tmp.default.dir((err, tmpDir) => {
        if (err) {
          return reject(err);
        }
        const tmpFile = _path.default.join(tmpDir, "tmp");
        const dest = _fsExtra.default.createWriteStream(tmpFile);
        dest.on("error", reject);
        dest.on("finish", () => resolve({
          path: tmpFile,
          cleanup: () => _fsExtra.default.rm(tmpFile)
        }));
        void this.getFileStream(key).then(stream => {
          if (!stream) {
            return reject(new Error("No stream available"));
          }
          stream.on("error", error => {
            dest.end();
            reject(error);
          }).pipe(dest);
        });
      });
    });
  }
  async getFileStream(key, range) {
    const localPath = this.getLocalFilePath(key);
    if (await _fsExtra.default.pathExists(localPath)) {
      return _fsExtra.default.createReadStream(localPath, range);
    }
    const meta = await this.getChunkMeta(key);
    if (meta) {
      const start = range?.start ?? 0;
      const end = Math.min(range?.end ?? meta.size - 1, meta.size - 1);
      if (start > end) {
        return _stream.Readable.from([]);
      }
      const self = this;
      return _stream.Readable.from((async function* () {
        const firstChunk = Math.floor(start / meta.chunkSize);
        const lastChunk = Math.floor(end / meta.chunkSize);
        for (let index = firstChunk; index <= lastChunk; index++) {
          const item = await self.client.send(new _clientS.GetObjectCommand({
            Bucket: self.getBucket(),
            Key: self.getChunkKey(key, index)
          }));
          const chunk = await self.streamToBuffer(item.Body);
          const chunkStart = index * meta.chunkSize;
          const sliceStart = Math.max(0, start - chunkStart);
          const sliceEnd = Math.min(chunk.length, end - chunkStart + 1);
          yield chunk.subarray(sliceStart, sliceEnd);
        }
      })());
    }
    return this.client.send(new _clientS.GetObjectCommand({
      Bucket: this.getBucket(),
      Key: key,
      Range: range ? `bytes=${range.start}-${range.end}` : undefined
    })).then(item => item.Body).catch(err => {
      _Logger.default.error("Error getting file stream from S3 ", err, {
        key
      });
      return null;
    });
  }
  async stat(key) {
    const localPath = this.getLocalFilePath(key);
    if (await _fsExtra.default.pathExists(localPath)) {
      const stats = await _fsExtra.default.stat(localPath);
      return {
        size: stats.size
      };
    }
    const meta = await this.getChunkMeta(key);
    if (meta) {
      return {
        size: meta.size
      };
    }
    const item = await this.client.send(new _clientS.HeadObjectCommand({
      Bucket: this.getBucket(),
      Key: key
    }));
    return {
      size: item.ContentLength || 0
    };
  }
  getMetaKey(key) {
    return `${key}.storj-meta.json`;
  }
  getChunkKey(key, index) {
    return `${key}.chunks/${String(index).padStart(6, "0")}`;
  }
  getLocalFilePath(key) {
    return _path.default.join(_env.default.FILE_STORAGE_LOCAL_ROOT_DIR || "/var/lib/outline/data", key);
  }
  async getChunkMeta(key) {
    try {
      const item = await this.client.send(new _clientS.GetObjectCommand({
        Bucket: this.getBucket(),
        Key: this.getMetaKey(key)
      }));
      const buffer = await this.streamToBuffer(item.Body);
      const meta = JSON.parse(buffer.toString("utf8"));
      return meta?.chunked ? meta : null;
    } catch (err) {
      if (err?.name === "NoSuchKey" || err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }
  async streamToBuffer(body) {
    if (!body) {
      return Buffer.alloc(0);
    }
    if (Buffer.isBuffer(body)) {
      return body;
    }
    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }
    if (typeof body.transformToByteArray === "function") {
      return Buffer.from(await body.transformToByteArray());
    }
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  getEndpoint() {
    if (_env.default.AWS_S3_ACCELERATE_URL) {
      return _env.default.AWS_S3_ACCELERATE_URL;
    }

    // support old path-style S3 uploads and new virtual host uploads by
    // checking for the bucket name in the endpoint url.
    if (_env.default.AWS_S3_UPLOAD_BUCKET_NAME) {
      const url = new URL(_env.default.AWS_S3_UPLOAD_BUCKET_URL);
      if (url.hostname.startsWith(_env.default.AWS_S3_UPLOAD_BUCKET_NAME + ".")) {
        _Logger.default.warn("AWS_S3_UPLOAD_BUCKET_URL contains the bucket name, this configuration combination will always point to AWS.\nRename your bucket or hostname if not using AWS S3.\nSee: https://github.com/outline/outline/issues/8025");
        return undefined;
      }
    }
    return _env.default.AWS_S3_UPLOAD_BUCKET_URL;
  }
  getBucket() {
    return _env.default.AWS_S3_ACCELERATE_URL || _env.default.AWS_S3_UPLOAD_BUCKET_NAME || "";
  }
}
exports.default = S3Storage;
_defineProperty(S3Storage, "chunkSize", 17407);
