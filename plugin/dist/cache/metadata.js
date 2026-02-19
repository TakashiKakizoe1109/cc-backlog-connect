"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCache = readCache;
exports.writeCache = writeCache;
exports.resolveNameToId = resolveNameToId;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const loader_1 = require("../config/loader");
function cacheDir() {
    return path.join((0, loader_1.findProjectRoot)(), ".cc-backlog");
}
function cachePath(type) {
    return path.join(cacheDir(), `${type}.json`);
}
function readCache(type) {
    const filePath = cachePath(type);
    try {
        if (!fs.existsSync(filePath))
            return null;
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" ||
            parsed === null ||
            typeof parsed.cachedAt !== "string" ||
            !Array.isArray(parsed.data)) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function writeCache(type, data) {
    const dir = cacheDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const content = {
        cachedAt: new Date().toISOString(),
        data,
    };
    fs.writeFileSync(cachePath(type), JSON.stringify(content, null, 2) + "\n", {
        mode: 0o600,
    });
}
function resolveNameToId(type, name) {
    const cached = readCache(type);
    if (!cached)
        return undefined;
    const lowerName = name.toLowerCase();
    // First: exact match
    const exact = cached.data.find((item) => item.name.toLowerCase() === lowerName ||
        (type === "users" && item.userId != null && item.userId.toLowerCase() === lowerName));
    if (exact)
        return exact.id;
    // Second: partial match (only if exactly one result)
    const partials = cached.data.filter((item) => item.name.toLowerCase().includes(lowerName) ||
        (type === "users" && item.userId != null && item.userId.toLowerCase().includes(lowerName)));
    if (partials.length === 1)
        return partials[0].id;
    return undefined;
}
