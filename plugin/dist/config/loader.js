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
exports.findProjectRoot = findProjectRoot;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.maskApiKey = maskApiKey;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const CONFIG_DIR = ".cc-backlog";
const CONFIG_FILE = "config.json";
function findProjectRoot(startDir = process.cwd()) {
    let dir = path.resolve(startDir);
    while (true) {
        if (fs.existsSync(path.join(dir, CONFIG_DIR)) ||
            fs.existsSync(path.join(dir, ".git"))) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return startDir;
        }
        dir = parent;
    }
}
function configPath(projectRoot) {
    return path.join(projectRoot, CONFIG_DIR, CONFIG_FILE);
}
function loadConfig() {
    const root = findProjectRoot();
    const cfgPath = configPath(root);
    if (!fs.existsSync(cfgPath)) {
        return null;
    }
    const raw = fs.readFileSync(cfgPath, "utf-8");
    return JSON.parse(raw);
}
function saveConfig(config) {
    const root = findProjectRoot();
    const dir = path.join(root, CONFIG_DIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath(root), JSON.stringify(config, null, 2) + "\n");
}
function maskApiKey(key) {
    if (key.length <= 8)
        return "****";
    return key.slice(0, 4) + "..." + key.slice(-4);
}
