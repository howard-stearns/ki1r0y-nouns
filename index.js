/*global describe, it, require*/
"use strict";
var Rule = require('ki1r0y-rules');
var uuid = require('uuid/v1');

var crypto = require('crypto');
var store = { // Simple in-memory "persistence" protocol for testing
    tick: function(error, result) {
        //if (error) throw error; return result; // Synchoronous version
        return error ? Promise.reject(error) : Promise.resolve(result); // Immediate Promise version
        //return new Promise((resolve, reject) => { if (error) reject(error); else resolve(result); }); // Promise version
        //return new Promise((resolve, reject) => process.nextTick(function () { if (error) reject(error); else resolve(result); })); // Async Promise version
    },
    save: function save(collectionName, id, serialized) {
        id = id || crypto.createHash('sha224').update(serialized, 'utf8').digest('hex');
        var collection = store[collectionName] || {};
        store[collectionName] = collection;
        collection[id] = serialized;
        return store.tick(null, id);
    },
    retrieve: function get(collectionName, id) {
        var collection = store[collectionName],
            result = collection && collection[id];
        return store.tick(!collection ? `No collection ${collectionName}` : (!result && `No ${id} in ${collectionName}`),
                          result);
    }
};


function isMissingData(value) { // FIXME: it's gotta be more efficient to check length for arrays, instead of keys length.
    return !value || (typeof value === 'object' && value !== null && !Object.keys(value).length); // Not empty array or dictionary.
}
function gatherProperties(self, keys) {
    var json = {};
    keys.forEach(function (key) {
        var value = self[key];
        if (!isMissingData(value)) {
            json[key] = value;
        }
    });
    return json;
}

function id2collectionName(id) {
    switch (id.length) {
    case 56: // sha224 hex
        return 'thing';
    case 36: // guid
        return 'place';
    default:
        return 'owner';
    }
}

function configure(configuration) {
    store = configuration.store;
}

const types = {};
var nonRuleKeys = ['constructor'];
// Whatever needs to be done: 1. rulify. 2. keep track of the name:constructor so it can be used in Noun.constructor
function register(constructor) {
    const proto = constructor.prototype,
          ruleKeys = Object.getOwnPropertyNames(proto).filter(prop => !(nonRuleKeys.includes(prop)))
    types[constructor.name] = Rule.rulify(proto, ruleKeys);
}

class Noun {
    constructor(properties) {
        const type = properties.type;
        if (type && (type !== this.constructor.name)) { // Dispatch to the proper type.
            return new exports[type](properties);
        }
        const idtag = properties.idtag;
        if (idtag) { // Return a Promise that evaluates to the the noun unpickled from the store.
            const data = {}; // Don't alter what the application gave us.
            Object.assign(data, properties);
            delete data.idtag; // Don't set idtag in the result. Let noun re-compute it based on dependencies.
            // Return a promise that resolves into a Noun built from the retrieved data.
            return store
                .retrieve(id2collectionName(idtag), idtag)
                .then(serialized => {
                    // FIXME: Warn of conflicts between explicitly specified and persisted values? Prefer explicit data?
                    Object.assign(data, JSON.parse(serialized));
                    return new Noun(data);
                });
        }
        Object.assign(this, properties);
    }
    // Explicitly set either nametags or the others
    additionalNametags(self) { return []; }
    title(self) { return ''; }
    keytag(self) { return ''; }

    type(self) { return self.constructor.name; }
    description() { return ""; }
    guid() { return uuid(); }
    children() { return []; }
    childspecs(self) { return self.children.map(child => child.childspec); }

    identityspec(self) { return gatherProperties(self, self.identityProperties); }
    idtag(self) { return store.save(self.collectionName, self.guid, JSON.stringify(self.identityspec)); }
    childspec(self) { return gatherProperties(self, self.instanceProperties); }
}

Noun.prototype.collectionName = 'unspecified';
nonRuleKeys.push('collectionName');

Noun.prototype.identityProperties = ['childspecs', 'description', 'keytag', 'additionalNametags', 'title', 'type'];
nonRuleKeys.push('identityProperties');

Noun.prototype.instanceProperties = ['idtag'];
nonRuleKeys.push('instanceProperties');

class Owner extends Noun {
    guid() { return 'U' + uuid(); } // A different length than a guid. See id2collectionName
}
Owner.prototype.collectionName = 'owner';
Owner.prototype.identityProperties = Noun.prototype.identityProperties.concat('guid').sort();
class User extends Owner { }
class Team extends Owner { }

class Item extends Noun {
    ownertag() { return ''; }
}
Item.prototype.identityProperties = Noun.prototype.identityProperties.concat('ownertag').sort();

class Place extends Item { }
Place.prototype.identityProperties = Item.prototype.identityProperties.concat('guid').sort();
Place.prototype.collectionName = 'place';

class Thing extends Item {
    guid() { return ''; } // Meaning that idtag should be computed by the store system.
}
Thing.prototype.collectionName = 'thing';

var nouns = [Noun, Owner, User, Team, Item, Place, Thing];
nouns.forEach(register);
nouns.forEach(aClass => module.exports[aClass.name] = aClass);
exports.configure = configure;
exports.register = register;
