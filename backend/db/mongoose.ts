import realMongoose from "mongoose";
import fs from "fs";
import path from "path";
import { getMongoUri, isProduction } from "../config/env.js";

let isRealMongoActive = false;

const isBackendCwd =
  path.basename(process.cwd()) === "backend" ||
  (fs.existsSync(path.join(process.cwd(), "data")) && !fs.existsSync(path.join(process.cwd(), "backend")));

const DB_DIR = isBackendCwd
  ? path.join(process.cwd(), "data")
  : path.join(process.cwd(), "backend", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface DbState {
  users: any[];
  tasks: any[];
  projects: any[];
}

const defaultState: DbState = {
  users: [],
  tasks: [],
  projects: [],
};

function readDb(): DbState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading mock database file, resetting to empty state:", error);
  }
  writeDb(defaultState);
  return defaultState;
}

function writeDb(data: DbState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing mock database file:", error);
  }
}

// Custom simple Mongoose-like mock Schema
class HybridSchema {
  definition: any;
  options: any;
  methods: Record<string, any>;
  statics: Record<string, any>;
  pres: Record<string, Function[]>;
  realSchema: any;

  constructor(definition: any, options?: any) {
    this.definition = definition;
    this.options = options;
    this.methods = {};
    this.statics = {};
    this.pres = {};

    try {
      this.realSchema = new realMongoose.Schema(definition, options);
    } catch {
      this.realSchema = null;
    }

    const self = this;
    this.methods = new Proxy({} as Record<string, any>, {
      set(target, prop: string, value) {
        target[prop] = value;
        if (self.realSchema) {
          self.realSchema.methods[prop] = value;
        }
        return true;
      },
      get(target, prop: string) {
        return target[prop];
      },
    });

    this.statics = new Proxy({} as Record<string, any>, {
      set(target, prop: string, value) {
        target[prop] = value;
        if (self.realSchema) {
          self.realSchema.statics[prop] = value;
        }
        return true;
      },
      get(target, prop: string) {
        return target[prop];
      },
    });
  }

  pre(event: string, fn: Function) {
    if (!this.pres[event]) {
      this.pres[event] = [];
    }
    this.pres[event].push(fn);
    if (this.realSchema) {
      this.realSchema.pre(event, fn as any);
    }
    return this;
  }
}

class MockQuery {
  private collection: string;
  private filter: any;
  private _sort: any = null;
  private _skip: number = 0;
  private _limit: number | null = null;

  constructor(collection: string, filter: any) {
    this.collection = collection;
    this.filter = filter;
  }

  sort(criteria: any) {
    this._sort = criteria;
    return this;
  }

  skip(n: number) {
    this._skip = n;
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  private matches(item: any, filter: any): boolean {
    if (!filter) return true;
    for (const key in filter) {
      const filterValue = filter[key];
      const itemValue = item[key];

      if (filterValue && typeof filterValue === "object" && !Array.isArray(filterValue)) {
        if ("$regex" in filterValue) {
          const regex = new RegExp(filterValue.$regex, filterValue.$options || "i");
          if (!regex.test(String(itemValue ?? ""))) return false;
          continue;
        }
        if ("$in" in filterValue) {
          if (!Array.isArray(filterValue.$in)) return false;
          if (!filterValue.$in.map(String).includes(String(itemValue))) return false;
          continue;
        }
      }

      if (itemValue !== filterValue && String(itemValue) !== String(filterValue)) {
        return false;
      }
    }
    return true;
  }

  async exec(): Promise<any[]> {
    const db = readDb();
    const list = db[this.collection as keyof DbState] || [];

    let results = list.filter((item) => {
      if (this.filter && "$or" in this.filter) {
        const orArray = this.filter.$or;
        if (Array.isArray(orArray)) {
          const orMatch = orArray.some((subFilter) => this.matches(item, subFilter));
          if (!orMatch) return false;
          const rest = { ...this.filter };
          delete rest.$or;
          return this.matches(item, rest);
        }
      }
      return this.matches(item, this.filter);
    });

    if (this._sort) {
      const keys = Object.keys(this._sort);
      if (keys.length > 0) {
        const key = keys[0];
        const direction = this._sort[key] === -1 || this._sort[key] === "desc" ? -1 : 1;
        results.sort((a, b) => {
          const valA = a[key];
          const valB = b[key];
          if (valA < valB) return -1 * direction;
          if (valA > valB) return 1 * direction;
          return 0;
        });
      }
    }

    if (this._skip) {
      results = results.slice(this._skip);
    }
    if (this._limit !== null) {
      results = results.slice(0, this._limit);
    }

    return JSON.parse(JSON.stringify(results));
  }

  then(onfulfilled?: (value: any[]) => any, onrejected?: (reason: any) => any) {
    return this.exec().then(onfulfilled, onrejected);
  }
}

function createMockModel(collectionName: string, schema: any) {
  const collectionKey = collectionName.toLowerCase() + "s";

  class ModelInstance {
    [key: string]: any;

    constructor(data: any) {
      Object.assign(this, data);
      if (!this._id) {
        this._id = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      }
      if (!this.createdAt) {
        this.createdAt = new Date().toISOString();
      }
      this.updatedAt = new Date().toISOString();

      for (const methodName in schema.methods) {
        this[methodName] = schema.methods[methodName].bind(this);
      }
    }

    async save() {
      if (schema.pres && schema.pres["save"]) {
        for (const hook of schema.pres["save"]) {
          await hook.call(this);
        }
      }

      const db = readDb();
      const list = db[collectionKey as keyof DbState] as any[];
      const index = list.findIndex((item) => String(item._id) === String(this._id));

      const rawObject = this.toJSON();

      if (index >= 0) {
        list[index] = rawObject;
      } else {
        list.push(rawObject);
      }

      writeDb(db);
      return this;
    }

    toJSON() {
      const clone = { ...this };
      for (const key in clone) {
        if (typeof clone[key] === "function") {
          delete clone[key];
        }
      }
      return clone;
    }

    toObject() {
      return this.toJSON();
    }
  }

  const ModelStatic: any = {
    find(filter?: any) {
      return new MockQuery(collectionKey, filter);
    },

    async findOne(filter: any) {
      const list = await new MockQuery(collectionKey, filter).exec();
      if (list.length > 0) {
        return new ModelInstance(list[0]);
      }
      return null;
    },

    async findById(id: string) {
      return this.findOne({ _id: id });
    },

    async create(data: any) {
      const instance = new ModelInstance(data);
      await instance.save();
      return instance;
    },

    async findByIdAndUpdate(id: string, update: any, _options?: { new?: boolean }) {
      const instance = await this.findById(id);
      if (!instance) return null;

      const updates = update.$set || update;
      Object.assign(instance, updates);
      instance.updatedAt = new Date().toISOString();
      await instance.save();
      return instance;
    },

    async findByIdAndDelete(id: string) {
      const db = readDb();
      const list = db[collectionKey as keyof DbState] as any[];
      const index = list.findIndex((item) => String(item._id) === String(id));
      if (index >= 0) {
        const deleted = list.splice(index, 1)[0];
        writeDb(db);
        return new ModelInstance(deleted);
      }
      return null;
    },

    async countDocuments(filter?: any) {
      const list = await new MockQuery(collectionKey, filter).exec();
      return list.length;
    },
  };

  Object.assign(ModelStatic, schema.statics);

  function MockModelConstructor(this: any, data: any) {
    return new ModelInstance(data);
  }
  Object.assign(MockModelConstructor, ModelStatic);

  return MockModelConstructor;
}

// --- EXPORTABLE HYBRID INTERFACE ---

export const mongoose: any = {
  Schema: HybridSchema as any,

  model: (name: string, schema: any): any => {
    let realModel: any = null;
    try {
      if (schema && schema.realSchema) {
        realModel = realMongoose.models[name] || realMongoose.model(name, schema.realSchema);
      } else if (schema instanceof realMongoose.Schema) {
        realModel = realMongoose.models[name] || realMongoose.model(name, schema);
      }
    } catch {
      // Ignore if realMongoose model already registered or schema error
    }

    const mockModel = createMockModel(name, schema);

    const ModelProxy = new Proxy(
      function HybridModel(this: any, ...args: any[]) {
        if (isRealMongoActive && realModel) {
          return new realModel(...args);
        }
        return new (mockModel as any)(...args);
      },
      {
        get(_target, prop) {
          const active = isRealMongoActive && realModel ? realModel : mockModel;
          const val = (active as any)[prop];
          if (typeof val === "function") {
            return val.bind(active);
          }
          return val;
        },
        set(_target, prop, value) {
          const active = isRealMongoActive && realModel ? realModel : mockModel;
          (active as any)[prop] = value;
          return true;
        },
      }
    );

    return ModelProxy;
  },

  connect: async (uri?: string): Promise<boolean> => {
    const targetUri = uri || getMongoUri();
    const prod = isProduction();

    if (prod && !targetUri) {
      throw new Error(
        "FATAL DATABASE ERROR: MONGODB_URI environment variable is required in production mode. Mock database storage is disabled in production."
      );
    }

    if (targetUri) {
      try {
        console.log("Connecting to real MongoDB database...");
        await realMongoose.connect(targetUri, {
          dbName: process.env.MONGODB_DB_NAME || "workspace",
          serverSelectionTimeoutMS: 5000,
        });
        isRealMongoActive = true;
        console.log("Successfully connected to real MongoDB database!");
        return true;
      } catch (err: any) {
        isRealMongoActive = false;
        console.error(`[DATABASE ERROR] Failed to connect to MongoDB: ${err.message}`);
        if (prod) {
          throw new Error(
            `FATAL DATABASE ERROR: MongoDB connection failed in production mode: ${err.message}. Refusing to fall back to mock storage.`
          );
        }

        if (process.env.ALLOW_MOCK_DB === "true") {
          console.warn("[DATABASE WARNING] Falling back to local mock JSON storage because ALLOW_MOCK_DB=true.");
          return false;
        }

        throw err;
      }
    } else {
      isRealMongoActive = false;
      console.log(
        `[DATABASE NOTICE] Running in local development without MONGODB_URI. Using local JSON mock database at: ${DB_FILE}`
      );
      return true;
    }
  },

  disconnect: async () => {
    if (isRealMongoActive) {
      await realMongoose.disconnect();
    }
    isRealMongoActive = false;
  },

  get isRealMongo(): boolean {
    return isRealMongoActive;
  },
};
