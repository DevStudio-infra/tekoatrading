"use strict";
/**
 * Trading Pairs Import Script Using Prisma Batch Processing
 *
 * This script uses Prisma's createMany method to efficiently import all trading pairs
 * from the JSON file into the database in batches.
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
// Initialize Prisma client
var prisma = new client_1.PrismaClient();
// Configuration
var JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
var BATCH_SIZE = 500; // Adjust based on your DB performance
// Function to transform a trading pair from JSON format to Prisma model format
function transformTradingPair(pair) {
    return {
        symbol: pair.symbol,
        name: pair.name,
        description: pair.description,
        marketId: pair.market_id,
        type: pair.type,
        category: pair.category,
        brokerName: pair.broker_name,
        isActive: pair.is_active,
        metadata: pair.metadata,
        lastUpdated: new Date(pair.last_updated),
        createdAt: new Date(pair.created_at)
    };
}
// Main import function
function importTradingPairs() {
    return __awaiter(this, void 0, void 0, function () {
        var data, tradingPairs, transformedPairs, totalPairs, batches, i, importedCount, i, batch, result, error_1, finalCount, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 10, 11, 13]);
                    console.log('Starting trading pairs import process...');
                    // Read trading pairs from JSON file
                    console.log('Reading trading pairs from JSON file...');
                    data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
                    tradingPairs = JSON.parse(data);
                    console.log("Found ".concat(tradingPairs.length, " trading pairs to import"));
                    // First, delete all existing trading pairs to start fresh
                    console.log('Deleting existing trading pairs...');
                    return [4 /*yield*/, prisma.tradingPair.deleteMany({})];
                case 1:
                    _a.sent();
                    console.log('Existing data cleared.');
                    // Transform trading pairs for Prisma format
                    console.log('Transforming data for import...');
                    transformedPairs = tradingPairs.map(transformTradingPair);
                    totalPairs = transformedPairs.length;
                    batches = [];
                    for (i = 0; i < totalPairs; i += BATCH_SIZE) {
                        batches.push(transformedPairs.slice(i, i + BATCH_SIZE));
                    }
                    console.log("Split into ".concat(batches.length, " batches of up to ").concat(BATCH_SIZE, " pairs each"));
                    importedCount = 0;
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < batches.length)) return [3 /*break*/, 7];
                    batch = batches[i];
                    console.log("Processing batch ".concat(i + 1, "/").concat(batches.length, " (").concat(batch.length, " pairs)..."));
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, prisma.tradingPair.createMany({
                            data: batch,
                            skipDuplicates: true, // Skip any duplicates based on unique constraints
                        })];
                case 4:
                    result = _a.sent();
                    importedCount += result.count;
                    console.log("\u2713 Batch ".concat(i + 1, " imported successfully (").concat(result.count, " pairs)"));
                    console.log("Progress: ".concat(importedCount, "/").concat(totalPairs, " total pairs imported"));
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error("\u2717 Error importing batch ".concat(i + 1, ":"), error_1);
                    return [3 /*break*/, 6];
                case 6:
                    i++;
                    return [3 /*break*/, 2];
                case 7: return [4 /*yield*/, prisma.tradingPair.count()];
                case 8:
                    finalCount = _a.sent();
                    console.log('\nImport process completed!');
                    console.log("Successfully imported: ".concat(importedCount, " pairs"));
                    console.log("Final count in database: ".concat(finalCount, " pairs"));
                    // Creating indices for better performance (if not already created by Prisma)
                    console.log('\nCreating indices for better performance...');
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON \"TradingPair\"(\"brokerName\");\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON \"TradingPair\"(\"type\");\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON \"TradingPair\"(\"category\");\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON \"TradingPair\"(\"isActive\");\n    "], ["\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON \"TradingPair\"(\"brokerName\");\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON \"TradingPair\"(\"type\");\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON \"TradingPair\"(\"category\");\n      CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON \"TradingPair\"(\"isActive\");\n    "])))];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 13];
                case 10:
                    error_2 = _a.sent();
                    console.error('Fatal error during import:', error_2);
                    return [3 /*break*/, 13];
                case 11: 
                // Always disconnect from Prisma
                return [4 /*yield*/, prisma.$disconnect()];
                case 12:
                    // Always disconnect from Prisma
                    _a.sent();
                    return [7 /*endfinally*/];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Execute the import
console.log('=== Trading Pairs Prisma Batch Import ===');
importTradingPairs()
    .then(function () { return console.log('Script execution completed.'); })
    .catch(function (error) { return console.error('Script execution failed:', error); });
var templateObject_1;
