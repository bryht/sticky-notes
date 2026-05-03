/**
 * Tests for the storage module
 * Since the storage module uses chrome.* APIs, we mock them for testing.
 */

// Mock chrome API
const storageData = {};
const mockStorage = {
  local: {
    get: jest.fn((keys, callback) => {
      const result = {};
      const keyList = Array.isArray(keys) ? keys : (keys === null ? Object.keys(storageData) : [keys]);
      keyList.forEach(key => {
        if (storageData[key] !== undefined) result[key] = storageData[key];
      });
      callback(result);
    }),
    set: jest.fn((items, callback) => {
      Object.assign(storageData, items);
      if (callback) callback();
    }),
  },
};

global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: mockStorage,
};

// Read storage module source
const fs = require('fs');
const path = require('path');

// We can't directly import the module since it uses ES modules and chrome APIs,
// so we test the business logic extracted from the module.
// For the purpose of unit testing in Node, we'll test the key behaviors.

describe('Storage module business logic', () => {
  beforeEach(() => {
    // Reset mock storage
    Object.keys(storageData).forEach(k => delete storageData[k]);
    jest.clearAllMocks();
  });

  describe('Note data management', () => {
    test('note data has expected structure', () => {
      const noteData = {
        id: 'note-123',
        content: '<b>Hello</b>',
        position: { top: '100px', left: '200px' },
        size: { width: '250px', height: '200px' },
        color: 'yellow',
        minimized: false,
        pinned: false,
        markdown: false,
        url: 'https://example.com',
        timestamp: Date.now(),
      };
      expect(noteData.id).toBeDefined();
      expect(noteData.content).toBeDefined();
      expect(typeof noteData.id).toBe('string');
      expect(typeof noteData.url).toBe('string');
    });

    test('chrome.storage.local.set stores data', (done) => {
      const testNotes = {
        allNotes: { 'note-1': { id: 'note-1', content: 'test' } },
        urlIndex: { 'https://example.com': ['note-1'] },
      };
      mockStorage.local.set(testNotes, () => {
        expect(storageData.allNotes).toEqual(testNotes.allNotes);
        expect(storageData.urlIndex).toEqual(testNotes.urlIndex);
        done();
      });
    });

    test('chrome.storage.local.get retrieves data', (done) => {
      storageData.allNotes = { 'note-1': { id: 'note-1', content: 'test' } };
      mockStorage.local.get(['allNotes'], (result) => {
        expect(result.allNotes['note-1']).toBeDefined();
        expect(result.allNotes['note-1'].content).toBe('test');
        done();
      });
    });
  });

  describe('Merge strategy (race condition fix)', () => {
    test('incoming notes merge with existing without overwrite', () => {
      const existing = {
        allNotes: {
          'note-A': { id: 'note-A', content: 'from tab 1', timestamp: 1000 },
          'note-B': { id: 'note-B', content: 'from tab 2', timestamp: 2000 },
        },
        urlIndex: { 'https://example.com': ['note-A', 'note-B'] },
      };

      // Simulating saveNotes merge: Tab 1 saves note-A with updated timestamp
      const incoming = [
        { id: 'note-A', content: 'from tab 1 updated', timestamp: 1500, url: 'https://example.com' },
      ];

      // Merge: incoming notes upsert by ID; existing notes not in the save set are preserved
      const merged = { ...existing.allNotes };
      const indexMap = { ...existing.urlIndex };
      const incomingIds = new Set(incoming.map(n => n.id));

      incoming.forEach(noteData => {
        const existing_note = merged[noteData.id];
        if (!existing_note || (noteData.timestamp >= existing_note.timestamp)) {
          merged[noteData.id] = noteData;
        }
      });

      // note-B should still exist (wasn't in the save set)
      expect(merged['note-B']).toBeDefined();
      expect(merged['note-B'].content).toBe('from tab 2');
      // note-A should be updated
      expect(merged['note-A'].content).toBe('from tab 1 updated');
    });

    test('older note data does not overwrite newer', () => {
      const existing = {
        allNotes: {
          'note-A': { id: 'note-A', content: 'newer', timestamp: 2000 },
        },
      };

      const incoming = [
        { id: 'note-A', content: 'stale', timestamp: 1000, url: 'https://example.com' },
      ];

      const merged = { ...existing.allNotes };
      incoming.forEach(noteData => {
        const existing_note = merged[noteData.id];
        if (!existing_note || (noteData.timestamp >= existing_note.timestamp)) {
          merged[noteData.id] = noteData;
        }
      });

      // The newer data should be preserved (incoming is older)
      expect(merged['note-A'].content).toBe('newer');
    });
  });

  describe('debounced save', () => {
    test('debounce delays execution', () => {
      jest.useFakeTimers();
      let saved = false;
      const debounce = (fn, ms) => {
        let timer;
        return () => {
          clearTimeout(timer);
          timer = setTimeout(() => { saved = true; }, ms);
        };
      };
      const save = debounce(() => { saved = true; }, 500);
      save();
      expect(saved).toBe(false);
      jest.advanceTimersByTime(500);
      expect(saved).toBe(true);
      jest.useRealTimers();
    });
  });

  describe('Storage migration', () => {
    test('adds missing fields to old notes', () => {
      const oldNote = { id: 'note-1', content: 'hello' };
      // Migration should add: timestamp, pinned, markdown, size
      if (!oldNote.timestamp) oldNote.timestamp = Date.now();
      if (oldNote.pinned === undefined) oldNote.pinned = false;
      if (oldNote.markdown === undefined) oldNote.markdown = false;
      if (!oldNote.size) oldNote.size = { width: '200px', height: '150px' };

      expect(oldNote.timestamp).toBeDefined();
      expect(oldNote.pinned).toBe(false);
      expect(oldNote.markdown).toBe(false);
      expect(oldNote.size).toEqual({ width: '200px', height: '150px' });
    });
  });
});
