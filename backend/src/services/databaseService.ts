/**
 * Database Service
 *
 * Provides abstraction layer for database operations
 * Supports both MongoDB and in-memory storage for development
 */

import { QueryOptions } from '../types/reports';

// ===================================================================
// DATABASE SERVICE
// ===================================================================

export class DatabaseService {
  private storage: Map<string, any[]> = new Map();
  private useInMemory: boolean = process.env.USE_IN_MEMORY_DB === 'true';

  constructor() {
    // Initialize in-memory collections
    if (this.useInMemory) {
      this.storage.set('reports', []);
      this.storage.set('schedules', []);
      this.storage.set('schedule_executions', []);
      this.storage.set('users', []);
      console.log('DatabaseService initialized with in-memory storage');
    } else {
      // In production, this would connect to MongoDB
      console.log('DatabaseService initialized (MongoDB connection would be established here)');
    }
  }

  /**
   * Insert a document into a collection
   */
  async insert<T>(collection: string, document: T): Promise<T> {
    if (this.useInMemory) {
      const coll = this.storage.get(collection) || [];
      coll.push(document);
      this.storage.set(collection, coll);
      return document;
    }

    // In production: MongoDB insert
    // const db = await this.getConnection();
    // await db.collection(collection).insertOne(document);
    return document;
  }

  /**
   * Find one document matching the query
   */
  async findOne<T>(collection: string, query: any): Promise<T | null> {
    if (this.useInMemory) {
      const coll = this.storage.get(collection) || [];
      const result = coll.find((doc) => this.matchesQuery(doc, query));
      return result || null;
    }

    // In production: MongoDB findOne
    // const db = await this.getConnection();
    // return await db.collection(collection).findOne(query);
    return null;
  }

  /**
   * Find all documents matching the query
   */
  async find<T>(
    collection: string,
    query: any = {},
    options?: QueryOptions
  ): Promise<T[]> {
    if (this.useInMemory) {
      let coll = this.storage.get(collection) || [];

      // Apply query filter
      let results = coll.filter((doc) => this.matchesQuery(doc, query));

      // Apply sorting
      if (options?.sort) {
        const sortField = Object.keys(options.sort)[0];
        const sortOrder = options.sort[sortField];
        results.sort((a, b) => {
          const aVal = this.getNestedValue(a, sortField);
          const bVal = this.getNestedValue(b, sortField);
          if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
          if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
          return 0;
        });
      }

      // Apply skip and limit
      if (options?.skip) {
        results = results.slice(options.skip);
      }
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    }

    // In production: MongoDB find
    // const db = await this.getConnection();
    // return await db.collection(collection).find(query, options).toArray();
    return [];
  }

  /**
   * Update documents matching the query
   */
  async update<T>(
    collection: string,
    query: any,
    updates: Partial<T>
  ): Promise<void> {
    if (this.useInMemory) {
      const coll = this.storage.get(collection) || [];
      const updatedColl = coll.map((doc) => {
        if (this.matchesQuery(doc, query)) {
          return { ...doc, ...updates };
        }
        return doc;
      });
      this.storage.set(collection, updatedColl);
      return;
    }

    // In production: MongoDB update
    // const db = await this.getConnection();
    // await db.collection(collection).updateMany(query, { $set: updates });
  }

  /**
   * Delete documents matching the query
   */
  async delete(collection: string, query: any): Promise<void> {
    if (this.useInMemory) {
      const coll = this.storage.get(collection) || [];
      const filteredColl = coll.filter((doc) => !this.matchesQuery(doc, query));
      this.storage.set(collection, filteredColl);
      return;
    }

    // In production: MongoDB delete
    // const db = await this.getConnection();
    // await db.collection(collection).deleteMany(query);
  }

  /**
   * Count documents matching the query
   */
  async count(collection: string, query: any = {}): Promise<number> {
    if (this.useInMemory) {
      const coll = this.storage.get(collection) || [];
      return coll.filter((doc) => this.matchesQuery(doc, query)).length;
    }

    // In production: MongoDB count
    // const db = await this.getConnection();
    // return await db.collection(collection).countDocuments(query);
    return 0;
  }

  /**
   * Execute an aggregation pipeline
   */
  async aggregate<T>(collection: string, pipeline: any[]): Promise<T[]> {
    if (this.useInMemory) {
      // Basic aggregation support for in-memory
      console.warn('In-memory aggregation has limited support');
      const coll = this.storage.get(collection) || [];
      return coll as T[];
    }

    // In production: MongoDB aggregation
    // const db = await this.getConnection();
    // return await db.collection(collection).aggregate(pipeline).toArray();
    return [];
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Check if a document matches a query
   */
  private matchesQuery(doc: any, query: any): boolean {
    for (const key in query) {
      const queryValue = query[key];
      const docValue = this.getNestedValue(doc, key);

      // Handle special operators
      if (typeof queryValue === 'object' && queryValue !== null) {
        // $or operator
        if (key === '$or') {
          return queryValue.some((subQuery: any) => this.matchesQuery(doc, subQuery));
        }

        // $in operator
        if (queryValue.$in) {
          if (!Array.isArray(queryValue.$in)) return false;
          return queryValue.$in.includes(docValue);
        }

        // $gte operator
        if (queryValue.$gte !== undefined) {
          if (docValue < queryValue.$gte) return false;
        }

        // $lte operator
        if (queryValue.$lte !== undefined) {
          if (docValue > queryValue.$lte) return false;
        }

        // $gt operator
        if (queryValue.$gt !== undefined) {
          if (docValue <= queryValue.$gt) return false;
        }

        // $lt operator
        if (queryValue.$lt !== undefined) {
          if (docValue >= queryValue.$lt) return false;
        }

        // $ne operator
        if (queryValue.$ne !== undefined) {
          if (docValue === queryValue.$ne) return false;
        }

        // $regex operator
        if (queryValue.$regex) {
          const regex = new RegExp(
            queryValue.$regex,
            queryValue.$options || ''
          );
          if (!regex.test(String(docValue))) return false;
        }
      } else {
        // Direct equality check
        if (docValue !== queryValue) return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }

    return value;
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    if (this.useInMemory) {
      this.storage.clear();
      this.storage.set('reports', []);
      this.storage.set('schedules', []);
      this.storage.set('schedule_executions', []);
      this.storage.set('users', []);
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
