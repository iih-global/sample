const { CRYPTO_ALGORITHM } = require("../constants");
const crypto = require("crypto");
const { Model } = require("../configs/mysql");
const uuidv4 = require("uuid").v4;
const jwt = require("jsonwebtoken");

/**
 *
 * @param {String || Object || Array} files i.e. filename, file object, file object array, filename array
 * @returns unique file name like 438bf492-093b-405b-806f-ac9bdc98929d.jpg
 */
exports.getUniqueFileName = (files = null, folderPath = "") => {
  if (typeof files === "string")
    return `${folderPath ? folderPath + "/" : ""}${uuidv4()}.${files
      .split(".")
      .pop()}`;
  else if (typeof files === "object")
    if (Array.isArray(files))
      if (typeof files[0] === "string")
        return files.map(
          (file) =>
            `${folderPath ? folderPath + "/" : ""}${uuidv4()}.${file
              .split(".")
              .pop()}`
        );
      else
        return files.map(
          (file) =>
            `${
              folderPath ? folderPath + "/" : ""
            }${uuidv4()}.${file.originalname.split(".").pop()}`
        );
    else
      return `${
        folderPath ? folderPath + "/" : ""
      }${uuidv4()}.${files.originalname.split(".").pop()}`;
  else return uuidv4();
};

/**
 *
 * @param {Object} payload
 * @param {String} expiresIn
 * @returns json web token with encrypted payload and default 1 day expire time
 */
exports.generateJwtToken = (payload = {}, expiresIn = "1d") =>
  jwt.sign(this.idsEncrypter(payload), process.env.JWT_SECRET, {
    expiresIn,
  });

/**
 * This function is encrypt data using crypto
 * @param {String | Number} id
 * @returns encrypted data
 */
exports.encrypt = (id) => {
  const cipher = crypto.createCipheriv(
    CRYPTO_ALGORITHM,
    Buffer.from(process.env.CRYPTO_SECRET_KEY, "hex"),
    Buffer.from(process.env.CRYPTO_IV, "hex")
  );
  let encryptedText = cipher.update(String(id), "utf8", "hex");
  encryptedText += cipher.final("hex");
  return encryptedText;
};

/**
 * This function is decrypt data using crypto
 * @param {String} text
 * @returns decrypted data
 */
exports.decrypt = (text) => {
  const decipher = crypto.createDecipheriv(
    CRYPTO_ALGORITHM,
    Buffer.from(process.env.CRYPTO_SECRET_KEY, "hex"),
    Buffer.from(process.env.CRYPTO_IV, "hex")
  );
  let decryptedText = decipher.update(String(text), "hex", "utf8");
  decryptedText += decipher.final("utf8");
  return isNaN(decryptedText) ? decryptedText : Number(decryptedText);
};

/**
 * This function encrypt all primary and foreignkey from the data
 * @param {Any} data
 * @param {String | Array} keys Other keys except primary and foreignkey
 * @returns Encrypted data with all primary keys and foreignKeys
 */
module.exports.idsEncrypter = (data, keys) => {
  if (data) {
    if (data && typeof data === "number") return this.encrypt(data);
    else if (Array.isArray(data)) {
      return data?.map((item) => {
        if (item && typeof item === "number") return this.encrypt(item);
        else if (
          Array.isArray(item) ||
          (typeof item === "object" && !(item instanceof Date))
        ) {
          return this.idsEncrypter(item, keys);
        } else {
          return item;
        }
      });
    } else if (typeof data === "object") {
      if (data instanceof Model) {
        data = data?.toJSON();
      }
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if (key === "id" || key?.includes("_id") || keys?.includes(key)) {
            if (typeof value === "number") {
              return [key, this.encrypt(value)];
            } else if (Array.isArray(value)) {
              return [key, this.idsEncrypter(value, keys)];
            } else {
              return [key, value];
            }
          } else if (
            Array.isArray(value) ||
            (typeof value === "object" && !(value instanceof Date))
          ) {
            return [key, this.idsEncrypter(value, keys)];
          } else {
            return [key, value];
          }
        })
      );
    } else {
      return data;
    }
  }
  return data;
};

/**
 * This function decrypt all primary and foreignkey from the data
 * @param {Any} data
 * @param {String | Array} keys Other keys except primary and foreignkey
 * @returns Decrypter data with all primary keys and foreignKeys
 */
module.exports.idsDecrypter = (data, keys) => {
  if (data) {
    if (data && typeof data === "string") return this.decrypt(data);
    else if (Array.isArray(data)) {
      return data?.map((item) => {
        if (item && typeof item === "string") return this.decrypt(item);
        else if (
          Array.isArray(item) ||
          (typeof item === "object" && !(item instanceof Date))
        ) {
          return this.idsDecrypter(item, keys);
        } else {
          return item;
        }
      });
    } else if (typeof data === "object") {
      if (data instanceof Model) {
        data = data?.toJSON();
      }
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if (key === "id" || key?.includes("_id") || keys?.includes(key)) {
            if (typeof value === "string") {
              return [key, this.decrypt(value)];
            } else if (Array.isArray(value)) {
              return [key, this.idsDecrypter(value, keys)];
            } else {
              return [key, value];
            }
          } else if (
            Array.isArray(value) ||
            (typeof value === "object" && !(value instanceof Date))
          ) {
            return [key, this.idsDecrypter(value, keys)];
          } else {
            return [key, value];
          }
        })
      );
    } else {
      return data;
    }
  }
  return data;
};

/**
 *
 * @param {String | Number} text
 * @returns base64 encrypted text
 */
exports.base64Encrypt = (text) => Buffer.from(String(text)).toString("base64");

/**
 *
 * @param {String} text
 * @returns base64 decrypted text
 */
exports.base64Decrypt = (text) =>
  Buffer.from(String(text), "base64").toString("ascii");

/**
 *
 * @param {Number} min i.e. 1
 * @param {Number} max i.e. 10
 * @returns random number between min and max values i.e. 9
 */
exports.generateRandomNumberUsingMinMaxValue = (min = 1000, max = 9999) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 *
 * @param {Number} n i.e. 6
 * @returns random number with n digit which you pass in parameter i.e. 100000 to 999999
 */
exports.generateRandomNumberUsingLength = (n = 4) => {
  const min = Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
