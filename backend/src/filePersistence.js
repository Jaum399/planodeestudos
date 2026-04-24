const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

const COLLECTION_FILES = {
  users: 'users.db',
  planner: 'planner.db',
  flashcards: 'flashcards.db',
  flashcardDecks: 'flashcardDecks.db',
  schedule: 'schedule.db',
  sessions: 'sessions.db',
  jarvis: 'jarvis.db',
  mindmaps: 'mindmaps.db',
  notificationJobs: 'notificationJobs.db',
  deadlineReminders: 'deadlineReminders.db',
  questionBank: 'questionBank.db',
  questionAttempts: 'questionAttempts.db',
  studySummaries: 'studySummaries.db',
  mnemonics: 'mnemonics.db',
  mockExamResults: 'mockExamResults.db',
};

function clone(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function seedDatabaseFileIfNeeded(targetFile, sourceFile) {
  if (fs.existsSync(targetFile) || !fs.existsSync(sourceFile)) return;
  fs.copyFileSync(sourceFile, targetFile);
}

function resolveStorageDir() {
  const explicitDir = String(process.env.FILE_DB_DIR || '').trim();
  if (explicitDir) return path.resolve(explicitDir);

  if (process.env.VERCEL) {
    return path.join('/tmp', 'mentoria-data');
  }

  const configuredPath = String(process.env.DATABASE_PATH || '').trim();
  if (configuredPath) {
    const resolved = path.resolve(__dirname, '..', configuredPath);
    const parsed = path.parse(resolved);
    return parsed.ext ? parsed.dir : resolved;
  }

  return path.resolve(__dirname, '..');
}

function promisifyCursor(cursor, shouldLean = false) {
  return new Promise((resolve, reject) => {
    cursor.exec((err, docs) => {
      if (err) return reject(err);
      if (shouldLean) return resolve(clone(docs));
      return resolve(docs);
    });
  });
}

class FileQuery {
  constructor(cursor, wrap) {
    this.cursor = cursor;
    this.wrap = wrap;
    this.shouldLean = false;
  }

  sort(spec) {
    this.cursor.sort(spec);
    return this;
  }

  limit(count) {
    this.cursor.limit(count);
    return this;
  }

  lean() {
    this.shouldLean = true;
    return this;
  }

  async exec() {
    const docs = await promisifyCursor(this.cursor, this.shouldLean);
    return this.shouldLean ? docs : docs.map((doc) => this.wrap(doc));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

function createDatastore(filename) {
  return new Datastore({ filename, autoload: true });
}

function wrapUpdate(datastore, query, update, options = {}) {
  return new Promise((resolve, reject) => {
    datastore.update(query, update, options, (err, numAffected, affectedDocuments, upsert) => {
      if (err) return reject(err);
      return resolve({ numAffected, affectedDocuments, upsert });
    });
  });
}

function wrapRemove(datastore, query, options = {}) {
  return new Promise((resolve, reject) => {
    datastore.remove(query, options, (err, numRemoved) => {
      if (err) return reject(err);
      return resolve(numRemoved);
    });
  });
}

function wrapInsert(datastore, docs) {
  return new Promise((resolve, reject) => {
    datastore.insert(docs, (err, newDocs) => {
      if (err) return reject(err);
      return resolve(newDocs);
    });
  });
}

function wrapFindOne(datastore, query) {
  return new Promise((resolve, reject) => {
    datastore.findOne(query, (err, doc) => {
      if (err) return reject(err);
      return resolve(doc || null);
    });
  });
}

function wrapCount(datastore, query) {
  return new Promise((resolve, reject) => {
    datastore.count(query, (err, count) => {
      if (err) return reject(err);
      return resolve(count);
    });
  });
}

function createFileModel(name, datastore) {
  return class FileModel {
    constructor(doc = {}) {
      Object.assign(this, clone(doc));
    }

    toObject() {
      return clone({ ...this });
    }

    async save() {
      const payload = this.toObject();

      if (!payload._id) {
        throw new Error(`${name}._id é obrigatório para persistência em arquivo.`);
      }

      const result = await wrapUpdate(
        datastore,
        { _id: payload._id },
        payload,
        { upsert: true, returnUpdatedDocs: true }
      );

      Object.assign(this, clone(result.affectedDocuments));
      return this;
    }

    static wrap(doc) {
      return doc ? new FileModel(doc) : null;
    }

    static find(query = {}) {
      return new FileQuery(datastore.find(query), FileModel.wrap);
    }

    static async findOne(query = {}) {
      const doc = await wrapFindOne(datastore, query);
      return FileModel.wrap(doc);
    }

    static async create(doc) {
      const inserted = await wrapInsert(datastore, clone(doc));
      return FileModel.wrap(inserted);
    }

    static async insertMany(docs) {
      const inserted = await wrapInsert(datastore, clone(docs));
      return inserted.map((doc) => FileModel.wrap(doc));
    }

    static async countDocuments(query = {}) {
      return wrapCount(datastore, query);
    }

    static async findOneAndUpdate(query, update, options = {}) {
      let targetQuery = query;

      if (options.sort) {
        const docs = await new FileQuery(datastore.find(query).sort(options.sort).limit(1), FileModel.wrap).lean().exec();
        const first = docs[0];
        if (!first && !options.upsert) return null;
        if (first?._id) targetQuery = { _id: first._id };
      }

      const result = await wrapUpdate(
        datastore,
        targetQuery,
        update,
        {
          upsert: Boolean(options.upsert),
          returnUpdatedDocs: true,
          multi: false,
        }
      );

      return FileModel.wrap(result.affectedDocuments);
    }

    static async updateOne(query, update) {
      const result = await wrapUpdate(datastore, query, update, { multi: false, upsert: false });
      return { matchedCount: result.numAffected, modifiedCount: result.numAffected };
    }

    static async deleteOne(query) {
      const count = await wrapRemove(datastore, query, { multi: false });
      return { deletedCount: count };
    }

    static async deleteMany(query) {
      const count = await wrapRemove(datastore, query, { multi: true });
      return { deletedCount: count };
    }
  };
}

function createFileDatabase() {
  const storageDir = resolveStorageDir();
  ensureDir(storageDir);
  const bundledDir = path.resolve(__dirname, '..');

  const stores = Object.fromEntries(
    Object.entries(COLLECTION_FILES).map(([key, filename]) => {
      const fullPath = path.join(storageDir, filename);
      seedDatabaseFileIfNeeded(fullPath, path.join(bundledDir, filename));
      return [key, createDatastore(fullPath)];
    })
  );

  stores.users.ensureIndex({ fieldName: '_id', unique: true });
  stores.users.ensureIndex({ fieldName: 'email' });
  stores.notificationJobs.ensureIndex({ fieldName: '_id', unique: true });
  stores.deadlineReminders.ensureIndex({ fieldName: '_id', unique: true });

  return Object.fromEntries(
    Object.entries(stores).map(([key, datastore]) => [key, createFileModel(key, datastore)])
  );
}

module.exports = { createFileDatabase, resolveStorageDir };